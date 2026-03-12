import { JournalEntry, MessageDraft } from '@/types';
import {
  SpiralSignal,
  SpiralChain,
  RelationshipSpiralResult,
  SpiralRiskLevel,
  SpiralIntervention,
} from '@/types/relationshipPrediction';

function withinHours(timestamp: number, hours: number): boolean {
  return Date.now() - timestamp < hours * 60 * 60 * 1000;
}

function withinDays(timestamp: number, days: number): boolean {
  return Date.now() - timestamp < days * 24 * 60 * 60 * 1000;
}

function detectCommunicationUncertainty(entries: JournalEntry[]): SpiralSignal | null {
  const recent = entries.filter(e => withinHours(e.timestamp, 72));
  let hits = 0;
  const triggers: string[] = [];

  recent.forEach(entry => {
    const hasCommTrigger = entry.checkIn.triggers.some(t => {
      const l = t.label.toLowerCase();
      return (
        l.includes('no reply') ||
        l.includes('silence') ||
        l.includes('ignored') ||
        l.includes('ghosted') ||
        l.includes('waiting') ||
        l.includes('left on read') ||
        l.includes('uncertain') ||
        (t.category === 'relationship' && entry.checkIn.intensityLevel >= 5)
      );
    });

    const hasAnxiety = entry.checkIn.emotions.some(e => {
      const l = e.label.toLowerCase();
      return l.includes('anxious') || l.includes('fear') || l.includes('panic') || l.includes('worried');
    });

    if (hasCommTrigger && hasAnxiety) {
      hits++;
      entry.checkIn.triggers.forEach(t => {
        if (t.category === 'relationship' && !triggers.includes(t.label)) {
          triggers.push(t.label);
        }
      });
    }
  });

  if (hits >= 2) {
    return {
      id: 'spiral_comm_uncertainty',
      type: 'communication_uncertainty',
      label: 'Communication uncertainty rising',
      description: `You've experienced communication-related anxiety ${hits} times recently. This pattern often builds quickly.`,
      strength: Math.min(hits + 1, 5),
      detectedAt: Date.now(),
      relatedTriggers: triggers,
    };
  }
  return null;
}

function detectAbandonmentCascade(entries: JournalEntry[]): SpiralSignal | null {
  const recent = entries.filter(e => withinHours(e.timestamp, 96));
  let cascadeHits = 0;
  const triggers: string[] = [];

  recent.forEach(entry => {
    const hasAbandonmentTrigger = entry.checkIn.triggers.some(t => {
      const l = t.label.toLowerCase();
      return (
        l.includes('abandon') ||
        l.includes('reject') ||
        l.includes('left') ||
        l.includes('alone') ||
        l.includes('unwanted')
      );
    });

    const hasIntenseEmotion = entry.checkIn.emotions.some(e => {
      const l = e.label.toLowerCase();
      return l.includes('desperate') || l.includes('panic') || l.includes('empty') || l.includes('fear');
    });

    const hasHighDistress = entry.checkIn.intensityLevel >= 7;

    if (hasAbandonmentTrigger && (hasIntenseEmotion || hasHighDistress)) {
      cascadeHits++;
      entry.checkIn.triggers.forEach(t => {
        if (!triggers.includes(t.label)) triggers.push(t.label);
      });
    }
  });

  if (cascadeHits >= 2) {
    return {
      id: 'spiral_abandonment_cascade',
      type: 'abandonment_cascade',
      label: 'Abandonment fears intensifying',
      description: 'Multiple moments of intense abandonment-related distress have appeared recently.',
      strength: Math.min(cascadeHits + 1, 5),
      detectedAt: Date.now(),
      relatedTriggers: triggers,
    };
  }
  return null;
}

function detectConflictShameWithdrawal(entries: JournalEntry[]): SpiralSignal | null {
  const recent = entries
    .filter(e => withinHours(e.timestamp, 96))
    .sort((a, b) => a.timestamp - b.timestamp);

  if (recent.length < 2) return null;

  let chainDetected = false;
  const triggers: string[] = [];

  for (let i = 0; i < recent.length - 1; i++) {
    const current = recent[i];
    const next = recent[i + 1];

    const hasConflict = current.checkIn.triggers.some(t =>
      t.category === 'relationship' && current.checkIn.intensityLevel >= 6
    );

    const hasShame = next.checkIn.emotions.some(e => {
      const l = e.label.toLowerCase();
      return l.includes('shame') || l.includes('guilt') || l.includes('worthless');
    });

    const hasWithdrawal = next.checkIn.urges.some(u => {
      const l = u.label.toLowerCase();
      return l.includes('withdraw') || l.includes('hide') || l.includes('isolate') || l.includes('shut down');
    });

    if (hasConflict && (hasShame || hasWithdrawal)) {
      chainDetected = true;
      current.checkIn.triggers.forEach(t => {
        if (!triggers.includes(t.label)) triggers.push(t.label);
      });
    }
  }

  if (chainDetected) {
    return {
      id: 'spiral_conflict_shame',
      type: 'conflict_shame_withdrawal',
      label: 'Conflict-shame-withdrawal pattern',
      description: 'A conflict seems to have been followed by shame and withdrawal urges. This is a common spiral pattern.',
      strength: 4,
      detectedAt: Date.now(),
      relatedTriggers: triggers,
    };
  }
  return null;
}

function detectReassuranceSeeking(entries: JournalEntry[], drafts: MessageDraft[]): SpiralSignal | null {
  const recentEntries = entries.filter(e => withinHours(e.timestamp, 72));
  const recentDrafts = drafts.filter(d => withinHours(d.timestamp, 72));

  let reassuranceUrges = 0;
  const triggers: string[] = [];

  recentEntries.forEach(entry => {
    const hasUrge = entry.checkIn.urges.some(u => {
      const l = u.label.toLowerCase();
      return (
        l.includes('reassur') ||
        l.includes('text') ||
        l.includes('call') ||
        l.includes('reach out') ||
        l.includes('check phone') ||
        l.includes('contact')
      );
    });

    const hasRelationshipContext = entry.checkIn.triggers.some(t => t.category === 'relationship');

    if (hasUrge && (hasRelationshipContext || entry.checkIn.intensityLevel >= 5)) {
      reassuranceUrges++;
      entry.checkIn.triggers
        .filter(t => t.category === 'relationship')
        .forEach(t => { if (!triggers.includes(t.label)) triggers.push(t.label); });
    }
  });

  const messageBurst = recentDrafts.length >= 3;

  if (reassuranceUrges >= 2 || (reassuranceUrges >= 1 && messageBurst)) {
    return {
      id: 'spiral_reassurance',
      type: 'reassurance_seeking',
      label: 'Reassurance-seeking urges building',
      description: 'The urge to seek reassurance has been appearing often. A pause may help you respond from a calmer place.',
      strength: Math.min(reassuranceUrges + (messageBurst ? 2 : 0), 5),
      detectedAt: Date.now(),
      relatedTriggers: triggers,
    };
  }
  return null;
}

function detectRewriteSurge(drafts: MessageDraft[]): SpiralSignal | null {
  const shortWindow = drafts.filter(d => withinHours(d.timestamp, 24));
  const mediumWindow = drafts.filter(d => withinHours(d.timestamp, 72));

  const recentRewrites = shortWindow.filter(d => d.rewrittenText).length;
  const mediumRewrites = mediumWindow.filter(d => d.rewrittenText).length;

  if (recentRewrites >= 3 || mediumRewrites >= 5) {
    const count = Math.max(recentRewrites, mediumRewrites);
    return {
      id: 'spiral_rewrite_surge',
      type: 'rewrite_surge',
      label: 'Message rewriting has spiked',
      description: `You've rewritten ${count} messages recently. This often signals rising relationship tension.`,
      strength: Math.min(count, 5),
      detectedAt: Date.now(),
      relatedTriggers: [],
    };
  }
  return null;
}

function detectDistressCommunication(entries: JournalEntry[], drafts: MessageDraft[]): SpiralSignal | null {
  const recentEntries = entries.filter(e => withinHours(e.timestamp, 48));
  const recentDrafts = drafts.filter(d => withinHours(d.timestamp, 48));

  const highDistressRelEntries = recentEntries.filter(entry => {
    const hasRelTrigger = entry.checkIn.triggers.some(t => t.category === 'relationship');
    return hasRelTrigger && entry.checkIn.intensityLevel >= 7;
  });

  if (highDistressRelEntries.length >= 1 && recentDrafts.length >= 2) {
    return {
      id: 'spiral_distress_comm',
      type: 'distress_communication',
      label: 'High distress near communication',
      description: 'You seem to be messaging while distress is elevated. Pausing before sending may protect both you and the relationship.',
      strength: Math.min(highDistressRelEntries.length + recentDrafts.length, 5),
      detectedAt: Date.now(),
      relatedTriggers: [],
    };
  }
  return null;
}

function detectRepeatedMessagingUrge(entries: JournalEntry[]): SpiralSignal | null {
  const recent = entries.filter(e => withinHours(e.timestamp, 72));
  let urgCount = 0;

  recent.forEach(entry => {
    const hasMessageUrge = entry.checkIn.urges.some(u => {
      const l = u.label.toLowerCase();
      return (
        l.includes('text') ||
        l.includes('send') ||
        l.includes('message') ||
        l.includes('call') ||
        l.includes('reach out')
      );
    });

    if (hasMessageUrge && entry.checkIn.intensityLevel >= 5) {
      urgCount++;
    }
  });

  if (urgCount >= 3) {
    return {
      id: 'spiral_messaging_urge',
      type: 'repeated_messaging_urge',
      label: 'Repeated urge to message',
      description: `The urge to send messages has come up ${urgCount} times recently while distress is elevated.`,
      strength: Math.min(urgCount, 5),
      detectedAt: Date.now(),
      relatedTriggers: [],
    };
  }
  return null;
}

function buildSpiralChains(entries: JournalEntry[], drafts: MessageDraft[]): SpiralChain[] {
  const weekEntries = entries.filter(e => withinDays(e.timestamp, 7));
  const chainMap = new Map<string, { trigger: string; emotion: string; urge: string; count: number }>();

  weekEntries.forEach(entry => {
    const relTriggers = entry.checkIn.triggers.filter(t => t.category === 'relationship');
    if (relTriggers.length === 0) return;

    const topTrigger = relTriggers[0].label;
    const topEmotion = entry.checkIn.emotions[0]?.label ?? 'unknown';
    const topUrge = entry.checkIn.urges[0]?.label ?? 'unknown';

    const key = `${topTrigger}|${topEmotion}|${topUrge}`;
    const existing = chainMap.get(key);
    if (existing) {
      existing.count++;
    } else {
      chainMap.set(key, { trigger: topTrigger, emotion: topEmotion, urge: topUrge, count: 1 });
    }
  });

  const chains: SpiralChain[] = [];
  let idx = 0;

  Array.from(chainMap.entries())
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 4)
    .forEach(([, data]) => {
      const whatHelps = getSuggestionForChain(data.emotion, data.urge, drafts);
      chains.push({
        id: `chain_${idx++}`,
        trigger: data.trigger,
        emotion: data.emotion,
        urge: data.urge,
        frequencyThisWeek: data.count,
        whatHelps,
      });
    });

  return chains;
}

function getSuggestionForChain(emotion: string, urge: string, drafts: MessageDraft[]): string {
  const el = emotion.toLowerCase();
  const ul = urge.toLowerCase();
  const hasUsedPause = drafts.some(d => d.paused);
  const hasUsedRewrite = drafts.some(d => d.rewrittenText);

  if (ul.includes('text') || ul.includes('message') || ul.includes('send')) {
    if (hasUsedPause) {
      return 'Pausing before sending has worked for you before — try that again.';
    }
    return 'A 2-minute pause before messaging may help you respond from a calmer place.';
  }

  if (el.includes('shame') || el.includes('guilt')) {
    return 'Grounding and self-compassion exercises may help when shame appears.';
  }

  if (el.includes('anxious') || el.includes('panic') || el.includes('fear')) {
    return 'Breathing exercises and grounding often help reduce anxiety before it peaks.';
  }

  if (ul.includes('withdraw') || ul.includes('isolate') || ul.includes('hide')) {
    return 'Journaling before withdrawing may help you process without disconnecting.';
  }

  if (hasUsedRewrite) {
    return 'Message rewriting has been useful for you — consider using it again.';
  }

  return 'A grounding exercise or short pause may help reduce intensity.';
}

function calculateSpiralScore(signals: SpiralSignal[]): number {
  if (signals.length === 0) return 0;
  const total = signals.reduce((sum, s) => sum + s.strength, 0);
  const multiplier = signals.length >= 3 ? 1.3 : signals.length >= 2 ? 1.15 : 1;
  return Math.min(Math.round(total * multiplier), 20);
}

function determineSpiralRisk(score: number): SpiralRiskLevel {
  if (score >= 12) return 'urgent';
  if (score >= 7) return 'rising';
  if (score >= 3) return 'watchful';
  return 'calm';
}

function generateInterventions(signals: SpiralSignal[], riskLevel: SpiralRiskLevel): SpiralIntervention[] {
  const interventions: SpiralIntervention[] = [];
  const added = new Set<string>();

  const hasCommSignal = signals.some(s =>
    s.type === 'communication_uncertainty' || s.type === 'distress_communication' || s.type === 'rewrite_surge'
  );
  const hasAbandonmentSignal = signals.some(s =>
    s.type === 'abandonment_cascade' || s.type === 'reassurance_seeking'
  );
  const hasMessagingSignal = signals.some(s =>
    s.type === 'repeated_messaging_urge' || s.type === 'rewrite_surge'
  );
  const hasShameSignal = signals.some(s => s.type === 'conflict_shame_withdrawal');

  if (hasCommSignal || riskLevel === 'urgent') {
    interventions.push({
      id: 'int_pause',
      type: 'pause',
      title: 'Take a pause before responding',
      description: 'A short pause can prevent escalation and protect the relationship.',
      route: '/(tabs)/messages',
      icon: 'Timer',
      priority: 1,
    });
    added.add('pause');
  }

  if (hasAbandonmentSignal || hasShameSignal) {
    interventions.push({
      id: 'int_ground',
      type: 'ground',
      title: 'Ground yourself first',
      description: 'Reconnect with the present before making decisions.',
      route: '/exercise?id=c1',
      icon: 'Anchor',
      priority: 2,
    });
    added.add('ground');
  }

  if (hasMessagingSignal) {
    interventions.push({
      id: 'int_simulate',
      type: 'simulate',
      title: 'Simulate before sending',
      description: 'See how different responses might play out.',
      route: '/companion/simulator',
      icon: 'Zap',
      priority: 3,
    });
    added.add('simulate');
  }

  if (hasShameSignal) {
    interventions.push({
      id: 'int_journal',
      type: 'journal',
      title: 'Journal what you feel',
      description: 'Writing it out can reduce the pressure to act immediately.',
      route: '/check-in',
      icon: 'BookOpen',
      priority: 4,
    });
    added.add('journal');
  }

  if (signals.length >= 2 || riskLevel === 'rising' || riskLevel === 'urgent') {
    interventions.push({
      id: 'int_companion',
      type: 'ai_companion',
      title: 'Talk to AI Companion',
      description: 'Process what you\'re feeling before responding.',
      route: '/(tabs)/companion',
      icon: 'Sparkles',
      priority: 5,
    });
    added.add('ai_companion');
  }

  if (interventions.length === 0 && signals.length > 0) {
    interventions.push({
      id: 'int_breathe_default',
      type: 'breathe',
      title: 'Take a few slow breaths',
      description: 'Even 60 seconds of slow breathing can shift your state.',
      route: '/exercise?id=c1',
      icon: 'Wind',
      priority: 1,
    });
  }

  return interventions.sort((a, b) => a.priority - b.priority);
}

function generateSpiralMessage(riskLevel: SpiralRiskLevel, signals: SpiralSignal[]): string | null {
  if (signals.length === 0) return null;

  if (riskLevel === 'urgent') {
    const hasComm = signals.some(s => s.type === 'communication_uncertainty' || s.type === 'distress_communication');
    if (hasComm) {
      return 'This may be a moment to slow down before responding. Your patterns suggest communication tension can escalate quickly right now.';
    }
    return 'Several signals suggest relationship stress is building. A pause and a grounding step may help protect both you and the relationship.';
  }

  if (riskLevel === 'rising') {
    if (signals.some(s => s.type === 'reassurance_seeking')) {
      return 'Reassurance-seeking urges have been building. Grounding first may help you reach out from a calmer place.';
    }
    if (signals.some(s => s.type === 'rewrite_surge')) {
      return 'You\'ve been working through a lot of messages lately. Would it help to simulate your response before sending?';
    }
    return 'Your recent patterns suggest relationship stress may be building. A small pause could make a difference.';
  }

  if (signals.some(s => s.type === 'conflict_shame_withdrawal')) {
    return 'A conflict-shame-withdrawal pattern seems to be emerging. Being gentle with yourself right now matters.';
  }

  return 'Some relationship-related patterns are showing up. Taking a moment for yourself may help.';
}

function generateSupportMessage(riskLevel: SpiralRiskLevel, signals: SpiralSignal[]): string | null {
  if (signals.length === 0) return null;

  if (riskLevel === 'urgent' || riskLevel === 'rising') {
    return 'You\'re not doing anything wrong by feeling this way. These patterns are common and recognizing them is already a strength.';
  }

  return 'Noticing these patterns early gives you more choice in how you respond. That awareness is powerful.';
}

export function detectRelationshipSpiral(
  journalEntries: JournalEntry[],
  messageDrafts: MessageDraft[],
): RelationshipSpiralResult {
  const signals: SpiralSignal[] = [];

  const commUncertainty = detectCommunicationUncertainty(journalEntries);
  if (commUncertainty) signals.push(commUncertainty);

  const abandonment = detectAbandonmentCascade(journalEntries);
  if (abandonment) signals.push(abandonment);

  const conflictShame = detectConflictShameWithdrawal(journalEntries);
  if (conflictShame) signals.push(conflictShame);

  const reassurance = detectReassuranceSeeking(journalEntries, messageDrafts);
  if (reassurance) signals.push(reassurance);

  const rewriteSurge = detectRewriteSurge(messageDrafts);
  if (rewriteSurge) signals.push(rewriteSurge);

  const distressComm = detectDistressCommunication(journalEntries, messageDrafts);
  if (distressComm) signals.push(distressComm);

  const messagingUrge = detectRepeatedMessagingUrge(journalEntries);
  if (messagingUrge) signals.push(messagingUrge);

  const chains = buildSpiralChains(journalEntries, messageDrafts);
  const score = calculateSpiralScore(signals);
  const riskLevel = determineSpiralRisk(score);
  const interventions = generateInterventions(signals, riskLevel);
  const message = generateSpiralMessage(riskLevel, signals);
  const supportMessage = generateSupportMessage(riskLevel, signals);

  console.log('[RelationshipSpiral] Score:', score, 'Risk:', riskLevel, 'Signals:', signals.length, 'Chains:', chains.length);

  return {
    riskLevel,
    signals,
    interventions,
    chains,
    message,
    supportMessage,
    score,
    lastUpdated: Date.now(),
  };
}
