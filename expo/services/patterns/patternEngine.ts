import { JournalEntry, MessageDraft } from '@/types';

export interface TriggerPattern {
  label: string;
  category: string;
  count: number;
  percentage: number;
  avgIntensity: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  relatedEmotions: string[];
  relatedUrges: string[];
}

export interface EmotionPattern {
  label: string;
  emoji: string;
  count: number;
  percentage: number;
  avgIntensity: number;
  commonTriggers: string[];
  followedByUrges: string[];
}

export interface UrgePattern {
  label: string;
  count: number;
  percentage: number;
  avgIntensity: number;
  commonPrecursors: string[];
  actedOnRate: number;
}

export interface CopingEffectiveness {
  tool: string;
  timesUsed: number;
  avgDistressBefore: number;
  avgDistressAfter: number;
  avgReduction: number;
  effectivenessScore: number;
}

export interface RelationshipStressSignal {
  label: string;
  frequency: number;
  avgIntensity: number;
  commonEmotions: string[];
  commonUrges: string[];
}

export interface GrowthSignal {
  label: string;
  narrative: string;
  type: 'positive' | 'emerging' | 'awareness';
}

export interface UrgeSequence {
  from: string;
  to: string;
  count: number;
  percentage: number;
}

export interface PatternAnalysis {
  triggers: TriggerPattern[];
  emotions: EmotionPattern[];
  urges: UrgePattern[];
  urgeSequences: UrgeSequence[];
  copingEffectiveness: CopingEffectiveness[];
  relationshipSignals: RelationshipStressSignal[];
  growthSignals: GrowthSignal[];
  totalEntries: number;
  periodDays: number;
  avgDistress: number;
  distressTrend: 'improving' | 'stable' | 'worsening' | 'insufficient_data';
}

let cachedAnalysis: PatternAnalysis | null = null;
let cacheKey = '';

function buildCacheKey(entries: JournalEntry[], drafts: MessageDraft[]): string {
  return `${entries.length}-${drafts.length}-${entries[0]?.timestamp ?? 0}`;
}

function isWithinDays(ts: number, days: number): boolean {
  return Date.now() - ts < days * 24 * 60 * 60 * 1000;
}

function computeTriggerTrend(
  entries: JournalEntry[],
  triggerLabel: string,
): 'increasing' | 'stable' | 'decreasing' {
  const recent = entries.filter(e => isWithinDays(e.timestamp, 7));
  const older = entries.filter(e => isWithinDays(e.timestamp, 30) && !isWithinDays(e.timestamp, 7));

  const recentRate = recent.filter(e =>
    e.checkIn.triggers.some(t => t.label === triggerLabel)
  ).length / Math.max(recent.length, 1);

  const olderRate = older.filter(e =>
    e.checkIn.triggers.some(t => t.label === triggerLabel)
  ).length / Math.max(older.length, 1);

  const diff = recentRate - olderRate;
  if (diff > 0.15) return 'increasing';
  if (diff < -0.15) return 'decreasing';
  return 'stable';
}

function analyzeTriggers(entries: JournalEntry[]): TriggerPattern[] {
  const triggerMap = new Map<string, {
    category: string;
    count: number;
    totalIntensity: number;
    emotions: Map<string, number>;
    urges: Map<string, number>;
  }>();

  for (const entry of entries) {
    for (const trigger of entry.checkIn.triggers) {
      const existing = triggerMap.get(trigger.label);
      if (existing) {
        existing.count++;
        existing.totalIntensity += entry.checkIn.intensityLevel;
      } else {
        triggerMap.set(trigger.label, {
          category: trigger.category,
          count: 1,
          totalIntensity: entry.checkIn.intensityLevel,
          emotions: new Map(),
          urges: new Map(),
        });
      }

      const data = triggerMap.get(trigger.label)!;
      for (const emotion of entry.checkIn.emotions) {
        data.emotions.set(emotion.label, (data.emotions.get(emotion.label) ?? 0) + 1);
      }
      for (const urge of entry.checkIn.urges) {
        data.urges.set(urge.label, (data.urges.get(urge.label) ?? 0) + 1);
      }
    }
  }

  const total = entries.length || 1;

  return Array.from(triggerMap.entries())
    .map(([label, data]) => ({
      label,
      category: data.category,
      count: data.count,
      percentage: Math.round((data.count / total) * 100),
      avgIntensity: Math.round((data.totalIntensity / data.count) * 10) / 10,
      trend: computeTriggerTrend(entries, label),
      relatedEmotions: Array.from(data.emotions.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([e]) => e),
      relatedUrges: Array.from(data.urges.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([u]) => u),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

function analyzeEmotions(entries: JournalEntry[]): EmotionPattern[] {
  const emotionMap = new Map<string, {
    emoji: string;
    count: number;
    totalIntensity: number;
    triggers: Map<string, number>;
    urges: Map<string, number>;
  }>();

  for (const entry of entries) {
    for (const emotion of entry.checkIn.emotions) {
      const existing = emotionMap.get(emotion.label);
      if (existing) {
        existing.count++;
        existing.totalIntensity += emotion.intensity ?? entry.checkIn.intensityLevel;
      } else {
        emotionMap.set(emotion.label, {
          emoji: emotion.emoji,
          count: 1,
          totalIntensity: emotion.intensity ?? entry.checkIn.intensityLevel,
          triggers: new Map(),
          urges: new Map(),
        });
      }

      const data = emotionMap.get(emotion.label)!;
      for (const trigger of entry.checkIn.triggers) {
        data.triggers.set(trigger.label, (data.triggers.get(trigger.label) ?? 0) + 1);
      }
      for (const urge of entry.checkIn.urges) {
        data.urges.set(urge.label, (data.urges.get(urge.label) ?? 0) + 1);
      }
    }
  }

  const total = entries.length || 1;

  return Array.from(emotionMap.entries())
    .map(([label, data]) => ({
      label,
      emoji: data.emoji,
      count: data.count,
      percentage: Math.round((data.count / total) * 100),
      avgIntensity: Math.round((data.totalIntensity / data.count) * 10) / 10,
      commonTriggers: Array.from(data.triggers.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([t]) => t),
      followedByUrges: Array.from(data.urges.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([u]) => u),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

function analyzeUrges(entries: JournalEntry[], drafts: MessageDraft[]): UrgePattern[] {
  const urgeMap = new Map<string, {
    count: number;
    totalIntensity: number;
    precursors: Map<string, number>;
    actedOnCount: number;
  }>();

  for (const entry of entries) {
    for (const urge of entry.checkIn.urges) {
      const existing = urgeMap.get(urge.label);
      if (existing) {
        existing.count++;
        existing.totalIntensity += entry.checkIn.intensityLevel;
      } else {
        urgeMap.set(urge.label, {
          count: 1,
          totalIntensity: entry.checkIn.intensityLevel,
          precursors: new Map(),
          actedOnCount: 0,
        });
      }

      const data = urgeMap.get(urge.label)!;
      for (const emotion of entry.checkIn.emotions) {
        data.precursors.set(emotion.label, (data.precursors.get(emotion.label) ?? 0) + 1);
      }
      for (const trigger of entry.checkIn.triggers) {
        data.precursors.set(trigger.label, (data.precursors.get(trigger.label) ?? 0) + 1);
      }

      const nearDrafts = drafts.filter(d =>
        Math.abs(d.timestamp - entry.timestamp) < 2 * 60 * 60 * 1000 && d.sent
      );
      if (nearDrafts.length > 0) {
        data.actedOnCount++;
      }
    }
  }

  const total = entries.length || 1;

  return Array.from(urgeMap.entries())
    .map(([label, data]) => ({
      label,
      count: data.count,
      percentage: Math.round((data.count / total) * 100),
      avgIntensity: Math.round((data.totalIntensity / data.count) * 10) / 10,
      commonPrecursors: Array.from(data.precursors.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([p]) => p),
      actedOnRate: data.count > 0 ? Math.round((data.actedOnCount / data.count) * 100) / 100 : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

function analyzeUrgeSequences(entries: JournalEntry[]): UrgeSequence[] {
  const sequences = new Map<string, number>();
  const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp);

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];
    if (next.timestamp - current.timestamp > 24 * 60 * 60 * 1000) continue;

    for (const urge of current.checkIn.urges) {
      for (const nextUrge of next.checkIn.urges) {
        if (urge.label !== nextUrge.label) {
          const key = `${urge.label}→${nextUrge.label}`;
          sequences.set(key, (sequences.get(key) ?? 0) + 1);
        }
      }
    }
  }

  const total = Array.from(sequences.values()).reduce((s, c) => s + c, 0) || 1;

  return Array.from(sequences.entries())
    .filter(([, count]) => count >= 2)
    .map(([key, count]) => {
      const [from, to] = key.split('→');
      return { from, to, count, percentage: Math.round((count / total) * 100) };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

function analyzeCopingEffectiveness(entries: JournalEntry[]): CopingEffectiveness[] {
  const copingMap = new Map<string, {
    count: number;
    totalBefore: number;
    totalAfter: number;
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
      } else {
        copingMap.set(tool, { count: 1, totalBefore: before, totalAfter: after });
      }
    }
  }

  return Array.from(copingMap.entries())
    .map(([tool, data]) => {
      const avgBefore = data.totalBefore / data.count;
      const avgAfter = data.totalAfter / data.count;
      const avgReduction = avgBefore - avgAfter;
      return {
        tool,
        timesUsed: data.count,
        avgDistressBefore: Math.round(avgBefore * 10) / 10,
        avgDistressAfter: Math.round(avgAfter * 10) / 10,
        avgReduction: Math.round(avgReduction * 10) / 10,
        effectivenessScore: avgBefore > 0 ? Math.round((avgReduction / avgBefore) * 100) : 0,
      };
    })
    .sort((a, b) => b.avgReduction - a.avgReduction)
    .slice(0, 6);
}

function analyzeRelationshipSignals(entries: JournalEntry[]): RelationshipStressSignal[] {
  const relEntries = entries.filter(e =>
    e.checkIn.triggers.some(t => t.category === 'relationship')
  );

  const signalMap = new Map<string, {
    count: number;
    totalIntensity: number;
    emotions: Map<string, number>;
    urges: Map<string, number>;
  }>();

  for (const entry of relEntries) {
    for (const trigger of entry.checkIn.triggers.filter(t => t.category === 'relationship')) {
      const existing = signalMap.get(trigger.label);
      if (existing) {
        existing.count++;
        existing.totalIntensity += entry.checkIn.intensityLevel;
      } else {
        signalMap.set(trigger.label, {
          count: 1,
          totalIntensity: entry.checkIn.intensityLevel,
          emotions: new Map(),
          urges: new Map(),
        });
      }
      const data = signalMap.get(trigger.label)!;
      for (const em of entry.checkIn.emotions) {
        data.emotions.set(em.label, (data.emotions.get(em.label) ?? 0) + 1);
      }
      for (const ur of entry.checkIn.urges) {
        data.urges.set(ur.label, (data.urges.get(ur.label) ?? 0) + 1);
      }
    }
  }

  return Array.from(signalMap.entries())
    .map(([label, data]) => ({
      label,
      frequency: data.count,
      avgIntensity: Math.round((data.totalIntensity / data.count) * 10) / 10,
      commonEmotions: Array.from(data.emotions.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([e]) => e),
      commonUrges: Array.from(data.urges.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([u]) => u),
    }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 5);
}

function detectGrowthSignals(
  entries: JournalEntry[],
  drafts: MessageDraft[],
): GrowthSignal[] {
  const signals: GrowthSignal[] = [];
  const recentWeek = entries.filter(e => isWithinDays(e.timestamp, 7));
  const previousWeek = entries.filter(e =>
    isWithinDays(e.timestamp, 14) && !isWithinDays(e.timestamp, 7)
  );

  const recentPauses = drafts.filter(d => d.paused && isWithinDays(d.timestamp, 7)).length;
  const prevPauses = drafts.filter(d =>
    d.paused && isWithinDays(d.timestamp, 14) && !isWithinDays(d.timestamp, 7)
  ).length;
  if (recentPauses > prevPauses && recentPauses > 0) {
    signals.push({
      label: 'More pausing',
      narrative: 'You paused before reacting more often this week.',
      type: 'positive',
    });
  }

  const recentAvg = recentWeek.length > 0
    ? recentWeek.reduce((s, e) => s + e.checkIn.intensityLevel, 0) / recentWeek.length
    : 0;
  const prevAvg = previousWeek.length > 0
    ? previousWeek.reduce((s, e) => s + e.checkIn.intensityLevel, 0) / previousWeek.length
    : 0;
  if (prevAvg > 0 && recentAvg < prevAvg - 0.5) {
    signals.push({
      label: 'Lower intensity',
      narrative: 'Average distress appears lower compared to last week.',
      type: 'positive',
    });
  }

  const recentCoping = recentWeek.filter(e => e.checkIn.copingUsed && e.checkIn.copingUsed.length > 0).length;
  if (recentCoping >= 3) {
    signals.push({
      label: 'Consistent coping',
      narrative: 'You used coping tools multiple times this week.',
      type: 'positive',
    });
  }

  const recentManaged = recentWeek.filter(e => e.outcome === 'managed').length;
  if (recentManaged >= 2) {
    signals.push({
      label: 'More managed outcomes',
      narrative: 'Several recent check-ins resulted in managed outcomes.',
      type: 'positive',
    });
  }

  if (recentWeek.length >= 3) {
    signals.push({
      label: 'Building awareness',
      narrative: 'Regular check-ins help build a clearer picture of your patterns.',
      type: 'awareness',
    });
  }

  const recentRewrites = drafts.filter(d => d.rewrittenText && isWithinDays(d.timestamp, 7)).length;
  if (recentRewrites >= 2) {
    signals.push({
      label: 'Using message support',
      narrative: 'You are rewriting messages before sending — a sign of thoughtfulness.',
      type: 'emerging',
    });
  }

  return signals.slice(0, 5);
}

function computeDistressTrend(entries: JournalEntry[]): PatternAnalysis['distressTrend'] {
  if (entries.length < 5) return 'insufficient_data';

  const recent = entries.filter(e => isWithinDays(e.timestamp, 7));
  const older = entries.filter(e => isWithinDays(e.timestamp, 30) && !isWithinDays(e.timestamp, 7));
  if (recent.length < 2 || older.length < 2) return 'insufficient_data';

  const recentAvg = recent.reduce((s, e) => s + e.checkIn.intensityLevel, 0) / recent.length;
  const olderAvg = older.reduce((s, e) => s + e.checkIn.intensityLevel, 0) / older.length;

  const diff = recentAvg - olderAvg;
  if (diff > 0.5) return 'worsening';
  if (diff < -0.5) return 'improving';
  return 'stable';
}

export function analyzePatterns(
  journalEntries: JournalEntry[],
  messageDrafts: MessageDraft[],
  periodDays: number = 30,
): PatternAnalysis {
  const key = buildCacheKey(journalEntries, messageDrafts);
  if (cachedAnalysis && cacheKey === key) {
    console.log('[PatternEngine] Returning cached analysis');
    return cachedAnalysis;
  }

  console.log('[PatternEngine] Analyzing patterns from', journalEntries.length, 'entries');

  const periodEntries = journalEntries.filter(e => isWithinDays(e.timestamp, periodDays));
  const periodDrafts = messageDrafts.filter(d => isWithinDays(d.timestamp, periodDays));

  const avgDistress = periodEntries.length > 0
    ? Math.round((periodEntries.reduce((s, e) => s + e.checkIn.intensityLevel, 0) / periodEntries.length) * 10) / 10
    : 0;

  const analysis: PatternAnalysis = {
    triggers: analyzeTriggers(periodEntries),
    emotions: analyzeEmotions(periodEntries),
    urges: analyzeUrges(periodEntries, periodDrafts),
    urgeSequences: analyzeUrgeSequences(periodEntries),
    copingEffectiveness: analyzeCopingEffectiveness(periodEntries),
    relationshipSignals: analyzeRelationshipSignals(periodEntries),
    growthSignals: detectGrowthSignals(journalEntries, messageDrafts),
    totalEntries: periodEntries.length,
    periodDays,
    avgDistress,
    distressTrend: computeDistressTrend(journalEntries),
  };

  cachedAnalysis = analysis;
  cacheKey = key;

  console.log('[PatternEngine] Analysis complete:', {
    triggers: analysis.triggers.length,
    emotions: analysis.emotions.length,
    urges: analysis.urges.length,
    coping: analysis.copingEffectiveness.length,
    growth: analysis.growthSignals.length,
  });

  return analysis;
}

export function invalidatePatternCache(): void {
  cachedAnalysis = null;
  cacheKey = '';
}
