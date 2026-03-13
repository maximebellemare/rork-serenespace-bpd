import { JournalEntry, MessageDraft } from '@/types';

export type TimePeriodKey = 'week' | 'month' | 'quarter';

export interface TimePeriodOption {
  key: TimePeriodKey;
  label: string;
  days: number;
}

export const TIME_PERIODS: TimePeriodOption[] = [
  { key: 'week', label: 'Past Week', days: 7 },
  { key: 'month', label: 'Past Month', days: 30 },
  { key: 'quarter', label: 'Past 3 Months', days: 90 },
];

export interface DistressDataPoint {
  date: string;
  timestamp: number;
  avgDistress: number;
  entryCount: number;
}

export interface EmotionFrequency {
  label: string;
  emoji: string;
  count: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
}

export interface TriggerFrequency {
  label: string;
  category: string;
  count: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
}

export interface CopingToolStat {
  tool: string;
  timesUsed: number;
  avgReduction: number;
  effectivenessLabel: string;
}

export interface RelationshipStressSummary {
  totalConflicts: number;
  avgIntensity: number;
  topTriggers: string[];
  trend: 'improving' | 'stable' | 'worsening' | 'insufficient_data';
}

export interface GrowthMarker {
  id: string;
  label: string;
  description: string;
  type: 'improvement' | 'milestone' | 'awareness';
  value?: string;
}

export interface AIHistoryInsight {
  id: string;
  text: string;
  type: 'pattern' | 'growth' | 'suggestion';
  icon: string;
}

export interface EmotionalHistorySnapshot {
  period: TimePeriodOption;
  distressTrend: DistressDataPoint[];
  avgDistress: number;
  previousAvgDistress: number;
  distressChange: number;
  topEmotions: EmotionFrequency[];
  topTriggers: TriggerFrequency[];
  copingTools: CopingToolStat[];
  relationshipStress: RelationshipStressSummary;
  growthMarkers: GrowthMarker[];
  aiInsights: AIHistoryInsight[];
  totalEntries: number;
  totalMessages: number;
  pauseBeforeSendCount: number;
  crisisActivations: number;
}

function isWithinDays(ts: number, days: number): boolean {
  return Date.now() - ts < days * 24 * 60 * 60 * 1000;
}

function getDateKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function computeDistressTrend(entries: JournalEntry[], days: number): DistressDataPoint[] {
  const buckets = new Map<string, { total: number; count: number; ts: number }>();

  const filtered = entries.filter(e => isWithinDays(e.timestamp, days));
  for (const entry of filtered) {
    const key = getDateKey(entry.timestamp);
    const existing = buckets.get(key);
    if (existing) {
      existing.total += entry.checkIn.intensityLevel;
      existing.count++;
    } else {
      buckets.set(key, { total: entry.checkIn.intensityLevel, count: 1, ts: entry.timestamp });
    }
  }

  return Array.from(buckets.entries())
    .map(([date, data]) => ({
      date,
      timestamp: data.ts,
      avgDistress: Math.round((data.total / data.count) * 10) / 10,
      entryCount: data.count,
    }))
    .sort((a, b) => a.timestamp - b.timestamp);
}

function computeTrend(currentCount: number, previousCount: number): 'up' | 'down' | 'stable' {
  if (previousCount === 0 && currentCount === 0) return 'stable';
  if (previousCount === 0) return 'up';
  const ratio = currentCount / previousCount;
  if (ratio > 1.2) return 'up';
  if (ratio < 0.8) return 'down';
  return 'stable';
}

function computeTopEmotions(
  currentEntries: JournalEntry[],
  previousEntries: JournalEntry[],
): EmotionFrequency[] {
  const currentMap = new Map<string, { emoji: string; count: number }>();
  const previousMap = new Map<string, number>();

  for (const entry of currentEntries) {
    for (const em of entry.checkIn.emotions) {
      const existing = currentMap.get(em.label);
      if (existing) {
        existing.count++;
      } else {
        currentMap.set(em.label, { emoji: em.emoji, count: 1 });
      }
    }
  }

  for (const entry of previousEntries) {
    for (const em of entry.checkIn.emotions) {
      previousMap.set(em.label, (previousMap.get(em.label) ?? 0) + 1);
    }
  }

  const total = currentEntries.length || 1;

  return Array.from(currentMap.entries())
    .map(([label, data]) => ({
      label,
      emoji: data.emoji,
      count: data.count,
      percentage: Math.round((data.count / total) * 100),
      trend: computeTrend(data.count, previousMap.get(label) ?? 0),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

function computeTopTriggers(
  currentEntries: JournalEntry[],
  previousEntries: JournalEntry[],
): TriggerFrequency[] {
  const currentMap = new Map<string, { category: string; count: number }>();
  const previousMap = new Map<string, number>();

  for (const entry of currentEntries) {
    for (const tr of entry.checkIn.triggers) {
      const existing = currentMap.get(tr.label);
      if (existing) {
        existing.count++;
      } else {
        currentMap.set(tr.label, { category: tr.category, count: 1 });
      }
    }
  }

  for (const entry of previousEntries) {
    for (const tr of entry.checkIn.triggers) {
      previousMap.set(tr.label, (previousMap.get(tr.label) ?? 0) + 1);
    }
  }

  const total = currentEntries.length || 1;

  return Array.from(currentMap.entries())
    .map(([label, data]) => ({
      label,
      category: data.category,
      count: data.count,
      percentage: Math.round((data.count / total) * 100),
      trend: computeTrend(data.count, previousMap.get(label) ?? 0),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

function computeCopingStats(entries: JournalEntry[]): CopingToolStat[] {
  const toolMap = new Map<string, { count: number; totalBefore: number; totalAfter: number }>();
  const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp);

  for (let i = 0; i < sorted.length; i++) {
    const entry = sorted[i];
    const tools = entry.checkIn.copingUsed;
    if (!tools || tools.length === 0) continue;

    const before = entry.checkIn.intensityLevel;
    const next = sorted[i + 1];
    const after = next ? next.checkIn.intensityLevel : Math.max(1, before - 2);

    for (const tool of tools) {
      const existing = toolMap.get(tool);
      if (existing) {
        existing.count++;
        existing.totalBefore += before;
        existing.totalAfter += after;
      } else {
        toolMap.set(tool, { count: 1, totalBefore: before, totalAfter: after });
      }
    }
  }

  return Array.from(toolMap.entries())
    .map(([tool, data]) => {
      const avgBefore = data.totalBefore / data.count;
      const avgAfter = data.totalAfter / data.count;
      const reduction = avgBefore - avgAfter;
      let effectivenessLabel = 'Moderate';
      if (reduction > 2) effectivenessLabel = 'Very Effective';
      else if (reduction > 1) effectivenessLabel = 'Effective';
      else if (reduction < 0) effectivenessLabel = 'Minimal';

      return {
        tool,
        timesUsed: data.count,
        avgReduction: Math.round(reduction * 10) / 10,
        effectivenessLabel,
      };
    })
    .sort((a, b) => b.avgReduction - a.avgReduction)
    .slice(0, 6);
}

function computeRelationshipStress(
  currentEntries: JournalEntry[],
  previousEntries: JournalEntry[],
): RelationshipStressSummary {
  const relCurrent = currentEntries.filter(e =>
    e.checkIn.triggers.some(t => t.category === 'relationship')
  );
  const relPrevious = previousEntries.filter(e =>
    e.checkIn.triggers.some(t => t.category === 'relationship')
  );

  const avgIntensity = relCurrent.length > 0
    ? Math.round((relCurrent.reduce((s, e) => s + e.checkIn.intensityLevel, 0) / relCurrent.length) * 10) / 10
    : 0;

  const triggerCounts = new Map<string, number>();
  for (const entry of relCurrent) {
    for (const tr of entry.checkIn.triggers.filter(t => t.category === 'relationship')) {
      triggerCounts.set(tr.label, (triggerCounts.get(tr.label) ?? 0) + 1);
    }
  }

  const topTriggers = Array.from(triggerCounts.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([label]) => label);

  let trend: RelationshipStressSummary['trend'] = 'insufficient_data';
  if (relCurrent.length >= 2 && relPrevious.length >= 2) {
    const prevAvg = relPrevious.reduce((s, e) => s + e.checkIn.intensityLevel, 0) / relPrevious.length;
    const diff = avgIntensity - prevAvg;
    if (diff > 0.5) trend = 'worsening';
    else if (diff < -0.5) trend = 'improving';
    else trend = 'stable';
  }

  return { totalConflicts: relCurrent.length, avgIntensity, topTriggers, trend };
}

function detectGrowthMarkers(
  currentEntries: JournalEntry[],
  previousEntries: JournalEntry[],
  currentDrafts: MessageDraft[],
  previousDrafts: MessageDraft[],
): GrowthMarker[] {
  const markers: GrowthMarker[] = [];

  const currentPauses = currentDrafts.filter(d => d.paused).length;
  const previousPauses = previousDrafts.filter(d => d.paused).length;
  if (currentPauses > previousPauses && currentPauses > 0) {
    markers.push({
      id: 'more-pausing',
      label: 'More pause-before-send',
      description: `You paused ${currentPauses} time${currentPauses !== 1 ? 's' : ''} before sending — up from ${previousPauses}.`,
      type: 'improvement',
      value: `${currentPauses}`,
    });
  }

  const currentAvg = currentEntries.length > 0
    ? currentEntries.reduce((s, e) => s + e.checkIn.intensityLevel, 0) / currentEntries.length
    : 0;
  const previousAvg = previousEntries.length > 0
    ? previousEntries.reduce((s, e) => s + e.checkIn.intensityLevel, 0) / previousEntries.length
    : 0;
  if (previousAvg > 0 && currentAvg < previousAvg - 0.5) {
    markers.push({
      id: 'lower-distress',
      label: 'Lower average distress',
      description: `Average distress dropped from ${previousAvg.toFixed(1)} to ${currentAvg.toFixed(1)}.`,
      type: 'improvement',
      value: `${(previousAvg - currentAvg).toFixed(1)} lower`,
    });
  }

  const currentCoping = currentEntries.filter(e => e.checkIn.copingUsed && e.checkIn.copingUsed.length > 0).length;
  if (currentCoping >= 3) {
    markers.push({
      id: 'consistent-coping',
      label: 'Consistent tool usage',
      description: `You used coping tools ${currentCoping} times this period.`,
      type: 'milestone',
      value: `${currentCoping}`,
    });
  }

  const currentManaged = currentEntries.filter(e => e.outcome === 'managed').length;
  const previousManaged = previousEntries.filter(e => e.outcome === 'managed').length;
  if (currentManaged > previousManaged && currentManaged >= 2) {
    markers.push({
      id: 'more-managed',
      label: 'More managed outcomes',
      description: `${currentManaged} check-ins resulted in managed outcomes.`,
      type: 'improvement',
      value: `${currentManaged}`,
    });
  }

  const currentCrisis = currentEntries.filter(e => e.checkIn.intensityLevel >= 8).length;
  const previousCrisis = previousEntries.filter(e => e.checkIn.intensityLevel >= 8).length;
  if (previousCrisis > 0 && currentCrisis < previousCrisis) {
    markers.push({
      id: 'fewer-crises',
      label: 'Fewer crisis moments',
      description: `Crisis-level distress dropped from ${previousCrisis} to ${currentCrisis}.`,
      type: 'improvement',
      value: `${previousCrisis - currentCrisis} fewer`,
    });
  }

  if (currentEntries.length >= 5) {
    markers.push({
      id: 'awareness',
      label: 'Building self-awareness',
      description: `${currentEntries.length} check-ins show growing emotional awareness.`,
      type: 'awareness',
    });
  }

  return markers.slice(0, 5);
}

function generateAIInsights(snapshot: Omit<EmotionalHistorySnapshot, 'aiInsights'>): AIHistoryInsight[] {
  const insights: AIHistoryInsight[] = [];
  let idx = 0;

  if (snapshot.distressChange < -0.5) {
    insights.push({
      id: `ai-${idx++}`,
      text: `Your average distress has decreased by ${Math.abs(snapshot.distressChange).toFixed(1)} points compared to the previous period.`,
      type: 'growth',
      icon: 'TrendingDown',
    });
  } else if (snapshot.distressChange > 0.5) {
    insights.push({
      id: `ai-${idx++}`,
      text: `Distress has been slightly higher recently. Consider increasing grounding or reflection time.`,
      type: 'suggestion',
      icon: 'AlertTriangle',
    });
  }

  const topEmotion = snapshot.topEmotions[0];
  if (topEmotion) {
    const triggerStr = snapshot.topTriggers.length > 0 ? snapshot.topTriggers[0].label : 'various situations';
    insights.push({
      id: `ai-${idx++}`,
      text: `${topEmotion.label} has been your most frequent emotion, often linked to ${triggerStr}.`,
      type: 'pattern',
      icon: 'Heart',
    });
  }

  const bestTool = snapshot.copingTools[0];
  if (bestTool && bestTool.avgReduction > 0) {
    insights.push({
      id: `ai-${idx++}`,
      text: `${bestTool.tool} reduced distress by an average of ${bestTool.avgReduction} points — your most effective tool.`,
      type: 'growth',
      icon: 'Shield',
    });
  }

  if (snapshot.relationshipStress.trend === 'improving') {
    insights.push({
      id: `ai-${idx++}`,
      text: `Relationship-related stress appears to be decreasing. Your efforts are showing progress.`,
      type: 'growth',
      icon: 'Users',
    });
  } else if (snapshot.relationshipStress.totalConflicts > 3) {
    insights.push({
      id: `ai-${idx++}`,
      text: `Relationship triggers were frequent this period. The Relationship Copilot may help process these.`,
      type: 'suggestion',
      icon: 'Users',
    });
  }

  if (snapshot.pauseBeforeSendCount > 0) {
    insights.push({
      id: `ai-${idx++}`,
      text: `You paused before sending ${snapshot.pauseBeforeSendCount} time${snapshot.pauseBeforeSendCount !== 1 ? 's' : ''} — a sign of growing emotional regulation.`,
      type: 'growth',
      icon: 'Clock',
    });
  }

  if (snapshot.growthMarkers.length >= 3) {
    insights.push({
      id: `ai-${idx++}`,
      text: `Multiple growth signals detected this period. You are building stronger emotional skills.`,
      type: 'growth',
      icon: 'Sprout',
    });
  }

  return insights.slice(0, 5);
}

export function computeEmotionalHistory(
  journalEntries: JournalEntry[],
  messageDrafts: MessageDraft[],
  period: TimePeriodOption,
): EmotionalHistorySnapshot {
  console.log('[EmotionalHistory] Computing for period:', period.key, 'entries:', journalEntries.length);

  const currentEntries = journalEntries.filter(e => isWithinDays(e.timestamp, period.days));
  const previousEntries = journalEntries.filter(e =>
    isWithinDays(e.timestamp, period.days * 2) && !isWithinDays(e.timestamp, period.days)
  );
  const currentDrafts = messageDrafts.filter(d => isWithinDays(d.timestamp, period.days));
  const previousDrafts = messageDrafts.filter(d =>
    isWithinDays(d.timestamp, period.days * 2) && !isWithinDays(d.timestamp, period.days)
  );

  const avgDistress = currentEntries.length > 0
    ? Math.round((currentEntries.reduce((s, e) => s + e.checkIn.intensityLevel, 0) / currentEntries.length) * 10) / 10
    : 0;
  const previousAvgDistress = previousEntries.length > 0
    ? Math.round((previousEntries.reduce((s, e) => s + e.checkIn.intensityLevel, 0) / previousEntries.length) * 10) / 10
    : 0;

  const partial: Omit<EmotionalHistorySnapshot, 'aiInsights'> = {
    period,
    distressTrend: computeDistressTrend(journalEntries, period.days),
    avgDistress,
    previousAvgDistress,
    distressChange: previousAvgDistress > 0 ? Math.round((avgDistress - previousAvgDistress) * 10) / 10 : 0,
    topEmotions: computeTopEmotions(currentEntries, previousEntries),
    topTriggers: computeTopTriggers(currentEntries, previousEntries),
    copingTools: computeCopingStats(currentEntries),
    relationshipStress: computeRelationshipStress(currentEntries, previousEntries),
    growthMarkers: detectGrowthMarkers(currentEntries, previousEntries, currentDrafts, previousDrafts),
    totalEntries: currentEntries.length,
    totalMessages: currentDrafts.length,
    pauseBeforeSendCount: currentDrafts.filter(d => d.paused).length,
    crisisActivations: currentEntries.filter(e => e.checkIn.intensityLevel >= 8).length,
  };

  const aiInsights = generateAIInsights(partial);

  console.log('[EmotionalHistory] Snapshot complete:', {
    entries: partial.totalEntries,
    emotions: partial.topEmotions.length,
    triggers: partial.topTriggers.length,
    insights: aiInsights.length,
    growth: partial.growthMarkers.length,
  });

  return { ...partial, aiInsights };
}
