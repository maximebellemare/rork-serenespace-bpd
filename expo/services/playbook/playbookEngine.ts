import { JournalEntry, MessageDraft } from '@/types';
import type { PlaybookStrategy, PlaybookReport, PlaybookQuickAccess } from '@/types/playbook';

function isWithinDays(ts: number, days: number): boolean {
  return Date.now() - ts < days * 24 * 60 * 60 * 1000;
}

function generateId(prefix: string, label: string): string {
  return `${prefix}_${label.toLowerCase().replace(/\s+/g, '_')}`;
}

function buildCopingStrategies(entries: JournalEntry[]): PlaybookStrategy[] {
  const copingMap = new Map<string, {
    count: number;
    totalBefore: number;
    totalAfter: number;
    triggers: Map<string, number>;
    lastUsed: number;
  }>();

  const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp);

  for (let i = 0; i < sorted.length; i++) {
    const entry = sorted[i];
    const tools = entry.checkIn.copingUsed;
    if (!tools || tools.length === 0) continue;

    const before = entry.checkIn.intensityLevel;
    const next = sorted[i + 1];
    const after = next ? next.checkIn.intensityLevel : Math.max(1, before - 2);

    for (const tool of tools) {
      const existing = copingMap.get(tool);
      if (existing) {
        existing.count++;
        existing.totalBefore += before;
        existing.totalAfter += after;
        existing.lastUsed = Math.max(existing.lastUsed, entry.timestamp);
      } else {
        copingMap.set(tool, {
          count: 1,
          totalBefore: before,
          totalAfter: after,
          triggers: new Map(),
          lastUsed: entry.timestamp,
        });
      }

      const data = copingMap.get(tool)!;
      for (const trigger of entry.checkIn.triggers) {
        data.triggers.set(trigger.label, (data.triggers.get(trigger.label) ?? 0) + 1);
      }
    }
  }

  const strategies: PlaybookStrategy[] = [];

  for (const [tool, data] of copingMap.entries()) {
    const avgBefore = data.totalBefore / data.count;
    const avgAfter = data.totalAfter / data.count;
    const avgReduction = avgBefore - avgAfter;
    const effectivenessScore = avgBefore > 0 ? Math.round((avgReduction / avgBefore) * 100) : 0;

    const topTriggers = Array.from(data.triggers.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([t]) => t);

    let narrative = '';
    if (avgReduction > 2) {
      narrative = `${tool} significantly reduces your distress, dropping it by about ${Math.round(avgReduction * 10) / 10} points on average.`;
    } else if (avgReduction > 0.5) {
      narrative = `${tool} helps bring distress down by about ${Math.round(avgReduction * 10) / 10} points when you use it.`;
    } else {
      narrative = `You've used ${tool} ${data.count} time${data.count !== 1 ? 's' : ''}. Keep tracking to see how it helps.`;
    }

    if (topTriggers.length > 0 && avgReduction > 0.5) {
      narrative += ` Works especially well after ${topTriggers[0].toLowerCase()}.`;
    }

    strategies.push({
      id: generateId('coping', tool),
      category: 'coping',
      title: tool,
      narrative,
      effectivenessScore,
      timesUsed: data.count,
      avgDistressReduction: Math.round(avgReduction * 10) / 10,
      relatedTriggers: topTriggers,
      lastUsed: data.lastUsed,
      icon: 'Shield',
    });
  }

  return strategies
    .sort((a, b) => b.avgDistressReduction - a.avgDistressReduction)
    .slice(0, 6);
}

function buildRelationshipStrategies(
  entries: JournalEntry[],
  drafts: MessageDraft[],
): PlaybookStrategy[] {
  const strategies: PlaybookStrategy[] = [];

  const pausedDrafts = drafts.filter(d => d.paused);
  const rewrittenDrafts = drafts.filter(d => d.rewrittenText);
  const helpedDrafts = drafts.filter(d => d.outcome === 'helped');
  const notSentDrafts = drafts.filter(d => d.outcome === 'not_sent' || !d.sent);

  if (pausedDrafts.length >= 2) {
    const recentPauses = pausedDrafts.filter(d => isWithinDays(d.timestamp, 30));
    strategies.push({
      id: 'rel_pause_before_send',
      category: 'relationship',
      title: 'Pause Before Sending',
      narrative: `Pausing before responding has helped ${recentPauses.length} time${recentPauses.length !== 1 ? 's' : ''} recently. This reduces impulsive communication.`,
      effectivenessScore: 75,
      timesUsed: pausedDrafts.length,
      avgDistressReduction: 1.5,
      relatedTriggers: ['Communication uncertainty', 'Conflict'],
      lastUsed: pausedDrafts[0]?.timestamp ?? 0,
      icon: 'Pause',
    });
  }

  if (rewrittenDrafts.length >= 2) {
    const helpedCount = helpedDrafts.length;
    const effectiveness = rewrittenDrafts.length > 0
      ? Math.round((helpedCount / rewrittenDrafts.length) * 100)
      : 0;

    strategies.push({
      id: 'rel_message_rewrite',
      category: 'relationship',
      title: 'Message Rewriting',
      narrative: `Rewriting messages before sending helped ${helpedCount} time${helpedCount !== 1 ? 's' : ''}. Rephrasing reduces urgency and improves clarity.`,
      effectivenessScore: effectiveness,
      timesUsed: rewrittenDrafts.length,
      avgDistressReduction: 1.2,
      relatedTriggers: ['Abandonment fear', 'Rejection sensitivity'],
      lastUsed: rewrittenDrafts[0]?.timestamp ?? 0,
      icon: 'PenLine',
    });
  }

  if (notSentDrafts.length >= 2) {
    strategies.push({
      id: 'rel_choosing_not_to_send',
      category: 'relationship',
      title: 'Choosing Not to Send',
      narrative: `You chose not to send ${notSentDrafts.length} message${notSentDrafts.length !== 1 ? 's' : ''} — a sign of growing self-regulation.`,
      effectivenessScore: 70,
      timesUsed: notSentDrafts.length,
      avgDistressReduction: 1.0,
      relatedTriggers: ['Urgency', 'Reassurance-seeking'],
      lastUsed: notSentDrafts[0]?.timestamp ?? 0,
      icon: 'ShieldCheck',
    });
  }

  const relEntries = entries.filter(e =>
    e.checkIn.triggers.some(t => t.category === 'relationship')
  );
  const managedRelEntries = relEntries.filter(e => e.outcome === 'managed');
  if (managedRelEntries.length >= 2) {
    strategies.push({
      id: 'rel_copilot_usage',
      category: 'relationship',
      title: 'Relationship Copilot',
      narrative: `Using the Relationship Copilot helped manage ${managedRelEntries.length} relationship-related situation${managedRelEntries.length !== 1 ? 's' : ''}.`,
      effectivenessScore: 65,
      timesUsed: managedRelEntries.length,
      avgDistressReduction: 1.8,
      relatedTriggers: ['Relationship conflict', 'Abandonment triggers'],
      lastUsed: managedRelEntries[0]?.timestamp ?? 0,
      icon: 'Heart',
    });
  }

  return strategies.sort((a, b) => b.effectivenessScore - a.effectivenessScore);
}

function buildCalmingRoutines(entries: JournalEntry[]): PlaybookStrategy[] {
  const strategies: PlaybookStrategy[] = [];

  const highDistressEntries = entries.filter(e => e.checkIn.intensityLevel >= 7);
  const managedHighDistress = highDistressEntries.filter(e => e.outcome === 'managed');

  if (managedHighDistress.length > 0) {
    const copingDuringHigh = new Map<string, number>();
    for (const entry of managedHighDistress) {
      for (const tool of entry.checkIn.copingUsed ?? []) {
        copingDuringHigh.set(tool, (copingDuringHigh.get(tool) ?? 0) + 1);
      }
    }

    const topCalming = Array.from(copingDuringHigh.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    for (const [tool, count] of topCalming) {
      strategies.push({
        id: generateId('calming', tool),
        category: 'calming',
        title: tool,
        narrative: `When distress was high (7+), ${tool.toLowerCase()} helped you manage ${count} time${count !== 1 ? 's' : ''}. Keep this tool close.`,
        effectivenessScore: Math.min(95, 50 + count * 15),
        timesUsed: count,
        avgDistressReduction: 2.5,
        relatedTriggers: [],
        lastUsed: managedHighDistress[0]?.timestamp ?? 0,
        icon: 'Wind',
      });
    }
  }

  const breathingEntries = entries.filter(e =>
    e.checkIn.copingUsed?.some(c =>
      c.toLowerCase().includes('breath') || c.toLowerCase().includes('grounding')
    )
  );

  if (breathingEntries.length >= 3 && strategies.length === 0) {
    strategies.push({
      id: 'calming_breathing_grounding',
      category: 'calming',
      title: 'Breathing & Grounding',
      narrative: `You've used breathing or grounding ${breathingEntries.length} times. These are your go-to calming tools.`,
      effectivenessScore: 60,
      timesUsed: breathingEntries.length,
      avgDistressReduction: 1.5,
      relatedTriggers: [],
      lastUsed: breathingEntries[0]?.timestamp ?? 0,
      icon: 'Wind',
    });
  }

  return strategies;
}

function buildIdentityReminders(entries: JournalEntry[], drafts: MessageDraft[]): PlaybookStrategy[] {
  const strategies: PlaybookStrategy[] = [];

  const managedEntries = entries.filter(e => e.outcome === 'managed');
  const totalEntries = entries.length;

  if (managedEntries.length >= 3) {
    const rate = Math.round((managedEntries.length / Math.max(totalEntries, 1)) * 100);
    strategies.push({
      id: 'identity_managed_outcomes',
      category: 'identity',
      title: 'Growing Self-Regulation',
      narrative: `You managed ${rate}% of your check-ins. You are building the ability to hold space for your emotions.`,
      effectivenessScore: rate,
      timesUsed: managedEntries.length,
      avgDistressReduction: 0,
      relatedTriggers: [],
      lastUsed: managedEntries[0]?.timestamp ?? 0,
      icon: 'TrendingUp',
    });
  }

  const recentWeek = entries.filter(e => isWithinDays(e.timestamp, 7));
  const previousWeek = entries.filter(e =>
    isWithinDays(e.timestamp, 14) && !isWithinDays(e.timestamp, 7)
  );

  if (recentWeek.length > 0 && previousWeek.length > 0) {
    const recentAvg = recentWeek.reduce((s, e) => s + e.checkIn.intensityLevel, 0) / recentWeek.length;
    const prevAvg = previousWeek.reduce((s, e) => s + e.checkIn.intensityLevel, 0) / previousWeek.length;
    if (recentAvg < prevAvg - 0.5) {
      strategies.push({
        id: 'identity_lower_distress',
        category: 'identity',
        title: 'Decreasing Distress',
        narrative: 'Your average distress is lower this week compared to last. Your efforts are making a difference.',
        effectivenessScore: 80,
        timesUsed: recentWeek.length,
        avgDistressReduction: Math.round((prevAvg - recentAvg) * 10) / 10,
        relatedTriggers: [],
        lastUsed: Date.now(),
        icon: 'Sparkles',
      });
    }
  }

  if (totalEntries >= 5) {
    strategies.push({
      id: 'identity_awareness',
      category: 'identity',
      title: 'Building Awareness',
      narrative: `You've checked in ${totalEntries} times. Each check-in strengthens your ability to recognize patterns and respond with intention.`,
      effectivenessScore: Math.min(90, 30 + totalEntries * 5),
      timesUsed: totalEntries,
      avgDistressReduction: 0,
      relatedTriggers: [],
      lastUsed: entries[0]?.timestamp ?? 0,
      icon: 'Eye',
    });
  }

  const rewriteCount = drafts.filter(d => d.rewrittenText).length;
  const pauseCount = drafts.filter(d => d.paused).length;
  if (rewriteCount + pauseCount >= 3) {
    strategies.push({
      id: 'identity_thoughtful_comms',
      category: 'identity',
      title: 'Thoughtful Communicator',
      narrative: `You've paused or rewritten ${rewriteCount + pauseCount} messages. You are becoming someone who responds with intention.`,
      effectivenessScore: 70,
      timesUsed: rewriteCount + pauseCount,
      avgDistressReduction: 0,
      relatedTriggers: [],
      lastUsed: drafts[0]?.timestamp ?? 0,
      icon: 'MessageCircle',
    });
  }

  return strategies.sort((a, b) => b.effectivenessScore - a.effectivenessScore);
}

function buildPersonalNarrative(report: Omit<PlaybookReport, 'personalNarrative'>): string {
  if (!report.hasEnoughData) {
    return 'Keep checking in and using tools. Your personal playbook will grow as you build awareness.';
  }

  const parts: string[] = [];

  if (report.topStrategy) {
    parts.push(`${report.topStrategy.title} appears to be your most effective strategy.`);
  }

  if (report.relationshipStrategies.length > 0) {
    parts.push(`You have ${report.relationshipStrategies.length} relationship strateg${report.relationshipStrategies.length === 1 ? 'y' : 'ies'} that work for you.`);
  }

  if (report.calmingRoutines.length > 0) {
    parts.push(`For high distress, ${report.calmingRoutines[0].title.toLowerCase()} is your go-to.`);
  }

  if (parts.length === 0) {
    return 'You are building your personal playbook. Each tool you use adds clarity to what works.';
  }

  return parts.join(' ');
}

export function generatePlaybook(
  journalEntries: JournalEntry[],
  messageDrafts: MessageDraft[],
): PlaybookReport {
  console.log('[PlaybookEngine] Generating playbook from', journalEntries.length, 'entries');

  const recentEntries = journalEntries.filter(e => isWithinDays(e.timestamp, 60));
  const recentDrafts = messageDrafts.filter(d => isWithinDays(d.timestamp, 60));

  const copingStrategies = buildCopingStrategies(recentEntries);
  const relationshipStrategies = buildRelationshipStrategies(recentEntries, recentDrafts);
  const calmingRoutines = buildCalmingRoutines(recentEntries);
  const identityReminders = buildIdentityReminders(recentEntries, recentDrafts);

  const allStrategies = [
    ...copingStrategies,
    ...relationshipStrategies,
    ...calmingRoutines,
    ...identityReminders,
  ];

  const topStrategy = allStrategies
    .filter(s => s.category === 'coping' || s.category === 'calming')
    .sort((a, b) => b.avgDistressReduction - a.avgDistressReduction)[0] ?? null;

  const hasEnoughData = recentEntries.length >= 3;

  const partialReport = {
    copingStrategies,
    relationshipStrategies,
    calmingRoutines,
    identityReminders,
    topStrategy,
    totalStrategiesTracked: allStrategies.length,
    hasEnoughData,
  };

  const report: PlaybookReport = {
    ...partialReport,
    personalNarrative: buildPersonalNarrative(partialReport),
  };

  console.log('[PlaybookEngine] Playbook generated:', {
    coping: copingStrategies.length,
    relationship: relationshipStrategies.length,
    calming: calmingRoutines.length,
    identity: identityReminders.length,
    total: allStrategies.length,
  });

  return report;
}

export function getQuickAccessPlaybook(
  journalEntries: JournalEntry[],
  messageDrafts: MessageDraft[],
  currentDistress: number,
): PlaybookQuickAccess {
  const playbook = generatePlaybook(journalEntries, messageDrafts);

  const allStrategies = [
    ...playbook.copingStrategies,
    ...playbook.relationshipStrategies,
    ...playbook.calmingRoutines,
  ];

  let suggestedNow: PlaybookStrategy | null = null;

  if (currentDistress >= 7) {
    suggestedNow = playbook.calmingRoutines[0] ?? playbook.copingStrategies[0] ?? null;
  } else if (currentDistress >= 4) {
    suggestedNow = playbook.copingStrategies[0] ?? null;
  }

  return {
    topStrategies: allStrategies
      .sort((a, b) => b.effectivenessScore - a.effectivenessScore)
      .slice(0, 5),
    currentDistressLevel: currentDistress,
    suggestedNow,
  };
}
