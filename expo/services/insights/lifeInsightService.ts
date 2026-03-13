import { JournalEntry, MessageDraft } from '@/types';
import { LifeInsight, WeeklySummary } from '@/types/lifeInsight';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LIFE_INSIGHTS_KEY = 'life_insights';
const WEEKLY_SUMMARIES_KEY = 'life_weekly_summaries';
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

function getWeekLabel(start: number, end: number): string {
  const s = new Date(start);
  const e = new Date(end);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[s.getMonth()]} ${s.getDate()} - ${months[e.getMonth()]} ${e.getDate()}`;
}

function getHourBucket(timestamp: number): string {
  const hour = new Date(timestamp).getHours();
  if (hour < 6) return 'late night';
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

function detectTriggerInsights(entries: JournalEntry[], now: number): LifeInsight[] {
  const insights: LifeInsight[] = [];
  const triggerCounts: Record<string, number> = {};

  entries.forEach(e => {
    e.checkIn.triggers.forEach(t => {
      triggerCounts[t.label] = (triggerCounts[t.label] || 0) + 1;
    });
  });

  const sorted = Object.entries(triggerCounts).sort(([, a], [, b]) => b - a);

  if (sorted.length > 0 && sorted[0][1] >= 2) {
    const [label, count] = sorted[0];
    insights.push({
      id: `li_trigger_${now}`,
      title: `"${label}" keeps showing up`,
      description: `This trigger appeared ${count} times in your recent check-ins. It seems to carry significant emotional weight for you right now.`,
      supportiveNote: 'Recurring triggers often point to something that matters deeply. Noticing the pattern is already meaningful progress.',
      suggestedAction: 'When this trigger appears, try naming it out loud: "I notice this is happening again." Naming it creates a small pause.',
      category: 'trigger',
      severity: count >= 4 ? 'important' : 'notable',
      confidence: Math.min(count / entries.length + 0.3, 0.95),
      timestamp: now,
      viewed: false,
    });
  }

  if (sorted.length >= 2 && sorted[1][1] >= 2) {
    const [label, count] = sorted[1];
    insights.push({
      id: `li_trigger_secondary_${now}`,
      title: `"${label}" is also frequent`,
      description: `This trigger came up ${count} times alongside your primary trigger. Multiple active triggers can compound emotional intensity.`,
      supportiveNote: 'When several triggers are active, it makes complete sense that emotions feel overwhelming. You are not overreacting.',
      suggestedAction: 'Consider which trigger feels most urgent right now and focus your energy there first.',
      category: 'trigger',
      severity: 'gentle',
      confidence: Math.min(count / entries.length + 0.2, 0.85),
      timestamp: now,
      viewed: false,
    });
  }

  return insights;
}

function detectRelationshipInsights(entries: JournalEntry[], messageDrafts: MessageDraft[], now: number): LifeInsight[] {
  const insights: LifeInsight[] = [];

  const relEntries = entries.filter(e =>
    e.checkIn.triggers.some(t => t.category === 'relationship')
  );

  if (relEntries.length >= 2) {
    const avgIntensity = relEntries.reduce((s, e) => s + e.checkIn.intensityLevel, 0) / relEntries.length;
    const triggerLabels: Record<string, number> = {};
    relEntries.forEach(e => {
      e.checkIn.triggers
        .filter(t => t.category === 'relationship')
        .forEach(t => {
          triggerLabels[t.label] = (triggerLabels[t.label] || 0) + 1;
        });
    });
    const topRelTrigger = Object.entries(triggerLabels).sort(([, a], [, b]) => b - a)[0];

    insights.push({
      id: `li_rel_dynamic_${now}`,
      title: 'Relationship patterns are active',
      description: topRelTrigger
        ? `"${topRelTrigger[0]}" appeared ${topRelTrigger[1]} times in relationship-related moments, with average intensity of ${Math.round(avgIntensity * 10) / 10}/10.`
        : `${relEntries.length} check-ins involved relationship triggers this week.`,
      supportiveNote: 'Relationship situations carry extra emotional weight. Your sensitivity to connection is not a flaw.',
      suggestedAction: 'Before responding in relationship moments, try the 90-second pause. Let the first wave of emotion pass.',
      category: 'relationship',
      severity: avgIntensity > 7 ? 'important' : 'notable',
      confidence: relEntries.length >= 3 ? 0.85 : 0.65,
      timestamp: now,
      viewed: false,
    });
  }

  const rewriteCount = messageDrafts.filter(m => m.rewrittenText).length;
  const pauseCount = messageDrafts.filter(m => m.paused).length;

  if (rewriteCount + pauseCount >= 2) {
    insights.push({
      id: `li_comm_pattern_${now}`,
      title: 'Thoughtful communication is growing',
      description: `You paused or rewrote ${rewriteCount + pauseCount} messages recently. This shows increasing awareness of how you communicate.`,
      supportiveNote: 'The space between feeling and sending is where emotional intelligence lives. You are practicing it.',
      suggestedAction: 'Continue using the message guard when emotions feel strong. Each pause builds the habit.',
      category: 'communication',
      severity: 'gentle',
      confidence: 0.85,
      timestamp: now,
      viewed: false,
    });
  }

  return insights;
}

function detectTimePatternInsights(entries: JournalEntry[], now: number): LifeInsight[] {
  const insights: LifeInsight[] = [];

  if (entries.length < 3) return insights;

  const buckets: Record<string, { total: number; count: number }> = {};
  entries.forEach(e => {
    const bucket = getHourBucket(e.timestamp);
    if (!buckets[bucket]) buckets[bucket] = { total: 0, count: 0 };
    buckets[bucket].total += e.checkIn.intensityLevel;
    buckets[bucket].count += 1;
  });

  const averages = Object.entries(buckets)
    .filter(([, v]) => v.count >= 2)
    .map(([label, v]) => ({ label, avg: v.total / v.count, count: v.count }))
    .sort((a, b) => b.avg - a.avg);

  if (averages.length > 0 && averages[0].avg >= 5) {
    const peak = averages[0];
    insights.push({
      id: `li_time_pattern_${now}`,
      title: `${peak.label.charAt(0).toUpperCase() + peak.label.slice(1)}s tend to be harder`,
      description: `Distress averages ${Math.round(peak.avg * 10) / 10}/10 during ${peak.label}s, based on ${peak.count} check-ins.`,
      supportiveNote: 'Knowing when emotions tend to peak helps you prepare and be extra gentle with yourself during those times.',
      suggestedAction: `Consider setting up a brief grounding practice before ${peak.label}s to create a buffer.`,
      category: 'time_pattern',
      severity: peak.avg >= 7 ? 'notable' : 'gentle',
      confidence: peak.count >= 3 ? 0.8 : 0.55,
      timestamp: now,
      viewed: false,
    });
  }

  return insights;
}

function detectCopingInsights(entries: JournalEntry[], now: number): LifeInsight[] {
  const insights: LifeInsight[] = [];
  const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp);
  const toolEffects: Record<string, { reductions: number[]; count: number }> = {};

  for (let i = 0; i < sorted.length; i++) {
    const entry = sorted[i];
    if (!entry.checkIn.copingUsed || entry.checkIn.copingUsed.length === 0) continue;
    const next = sorted[i + 1];
    if (!next) continue;
    const reduction = entry.checkIn.intensityLevel - next.checkIn.intensityLevel;
    entry.checkIn.copingUsed.forEach(tool => {
      if (!toolEffects[tool]) toolEffects[tool] = { reductions: [], count: 0 };
      toolEffects[tool].reductions.push(reduction);
      toolEffects[tool].count += 1;
    });
  }

  const effective = Object.entries(toolEffects)
    .map(([tool, data]) => ({
      tool,
      avgReduction: data.reductions.reduce((s, r) => s + r, 0) / data.count,
      count: data.count,
    }))
    .filter(t => t.avgReduction > 0)
    .sort((a, b) => b.avgReduction - a.avgReduction);

  if (effective.length > 0) {
    const best = effective[0];
    insights.push({
      id: `li_coping_success_${now}`,
      title: `"${best.tool}" is working for you`,
      description: `This tool reduced distress by an average of ${Math.round(best.avgReduction * 10) / 10} points across ${best.count} uses.`,
      supportiveNote: 'Finding tools that genuinely help is a meaningful sign of self-awareness and growth.',
      suggestedAction: `Keep "${best.tool}" accessible for high-distress moments. It has proven itself helpful.`,
      category: 'coping',
      severity: 'gentle',
      confidence: best.count >= 3 ? 0.9 : 0.65,
      timestamp: now,
      viewed: false,
    });
  }

  const copingEntries = entries.filter(e => e.checkIn.copingUsed && e.checkIn.copingUsed.length > 0);
  if (copingEntries.length >= 3) {
    insights.push({
      id: `li_coping_habit_${now}`,
      title: 'Building a coping toolkit',
      description: `You used coping tools in ${copingEntries.length} out of ${entries.length} check-ins. That consistency is building resilience.`,
      supportiveNote: 'Every time you reach for a tool instead of reacting impulsively, you are rewiring your response pattern.',
      suggestedAction: 'Try experimenting with a new tool this week to expand your options.',
      category: 'coping',
      severity: 'gentle',
      confidence: 0.8,
      timestamp: now,
      viewed: false,
    });
  }

  return insights;
}

function detectEmotionalLoopInsights(entries: JournalEntry[], now: number): LifeInsight[] {
  const insights: LifeInsight[] = [];
  if (entries.length < 3) return insights;

  const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp);
  const emotionSequences: Record<string, number> = {};

  for (let i = 0; i < sorted.length - 1; i++) {
    const curr = sorted[i].checkIn.emotions.map(e => e.label);
    const next = sorted[i + 1].checkIn.emotions.map(e => e.label);
    curr.forEach(c => {
      next.forEach(n => {
        if (c === n) {
          emotionSequences[c] = (emotionSequences[c] || 0) + 1;
        }
      });
    });
  }

  const repeating = Object.entries(emotionSequences)
    .filter(([, count]) => count >= 2)
    .sort(([, a], [, b]) => b - a);

  if (repeating.length > 0) {
    const [emotion, count] = repeating[0];
    insights.push({
      id: `li_loop_${now}`,
      title: `"${emotion}" keeps repeating`,
      description: `This emotion appeared across ${count + 1} consecutive check-ins, forming a repeating emotional loop.`,
      supportiveNote: 'Emotional loops are common and natural. They often signal something important that wants your attention.',
      suggestedAction: 'When you notice this emotion recurring, try naming it out loud. Acknowledgment alone can soften the loop.',
      category: 'emotional_loop',
      severity: count >= 3 ? 'notable' : 'gentle',
      confidence: count >= 3 ? 0.85 : 0.6,
      timestamp: now,
      viewed: false,
    });
  }

  return insights;
}

function detectGrowthInsights(entries: JournalEntry[], messageDrafts: MessageDraft[], now: number): LifeInsight[] {
  const insights: LifeInsight[] = [];

  if (entries.length >= 4) {
    const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp);
    const half = Math.floor(sorted.length / 2);
    const firstHalf = sorted.slice(0, half);
    const secondHalf = sorted.slice(half);
    const firstAvg = firstHalf.reduce((s, e) => s + e.checkIn.intensityLevel, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((s, e) => s + e.checkIn.intensityLevel, 0) / secondHalf.length;

    if (secondAvg < firstAvg - 0.5) {
      insights.push({
        id: `li_growth_distress_${now}`,
        title: 'Distress is easing',
        description: `Your average distress dropped from ${Math.round(firstAvg * 10) / 10} to ${Math.round(secondAvg * 10) / 10} over this period.`,
        supportiveNote: 'This is meaningful progress. The work you are doing matters, even when it does not always feel that way.',
        suggestedAction: 'Keep leaning into the tools and practices that have been helping.',
        category: 'growth',
        severity: 'gentle',
        confidence: 0.8,
        timestamp: now,
        viewed: false,
      });
    }
  }

  const managedEntries = entries.filter(e => e.outcome === 'managed');
  if (managedEntries.length >= 2) {
    insights.push({
      id: `li_growth_managed_${now}`,
      title: 'Emotional management is improving',
      description: `You managed your emotions effectively in ${managedEntries.length} out of ${entries.length} situations.`,
      supportiveNote: 'Each time you manage an intense emotion, you build trust in your own ability to cope.',
      suggestedAction: 'Notice what you did differently in those managed moments. That is your personal formula.',
      category: 'growth',
      severity: 'gentle',
      confidence: 0.75,
      timestamp: now,
      viewed: false,
    });
  }

  const pauseCount = messageDrafts.filter(m => m.paused).length;
  if (pauseCount >= 2) {
    insights.push({
      id: `li_growth_pausing_${now}`,
      title: 'Pausing before reacting',
      description: `You paused before responding in ${pauseCount} situations recently.`,
      supportiveNote: 'The ability to pause when emotions are high is one of the most powerful skills you can build.',
      suggestedAction: 'Keep using pauses as your first response. Over time this becomes your natural pattern.',
      category: 'growth',
      severity: 'gentle',
      confidence: 0.85,
      timestamp: now,
      viewed: false,
    });
  }

  return insights;
}

function detectDistressInsights(entries: JournalEntry[], now: number): LifeInsight[] {
  const insights: LifeInsight[] = [];

  const highDistress = entries.filter(e => e.checkIn.intensityLevel >= 7);
  if (highDistress.length >= 2) {
    const avgHigh = highDistress.reduce((s, e) => s + e.checkIn.intensityLevel, 0) / highDistress.length;
    insights.push({
      id: `li_distress_high_${now}`,
      title: 'High distress moments detected',
      description: `${highDistress.length} check-ins had distress at 7 or above, averaging ${Math.round(avgHigh * 10) / 10}/10.`,
      supportiveNote: 'High intensity does not mean you are failing. It means something important is happening emotionally.',
      suggestedAction: 'During these moments, try grounding first. Even 30 seconds of deep breathing can shift the intensity.',
      category: 'distress',
      severity: highDistress.length >= 4 ? 'important' : 'notable',
      confidence: 0.85,
      timestamp: now,
      viewed: false,
    });
  }

  const abandonmentEntries = entries.filter(e =>
    e.checkIn.triggers.some(t =>
      t.label.toLowerCase().includes('abandon') ||
      t.label.toLowerCase().includes('rejection') ||
      t.label.toLowerCase().includes('ignored') ||
      t.label.toLowerCase().includes('silence') ||
      t.label.toLowerCase().includes('alone')
    )
  );

  if (abandonmentEntries.length >= 2) {
    insights.push({
      id: `li_distress_abandonment_${now}`,
      title: 'Abandonment sensitivity is active',
      description: `Abandonment-related feelings appeared ${abandonmentEntries.length} times recently.`,
      supportiveNote: 'Fear of abandonment often comes from deep emotional sensitivity. It makes complete sense that this feels so strong.',
      suggestedAction: 'When these fears surface, try grounding exercises to anchor yourself in the present moment.',
      category: 'distress',
      severity: abandonmentEntries.length >= 3 ? 'important' : 'notable',
      confidence: 0.8,
      timestamp: now,
      viewed: false,
    });
  }

  return insights;
}

export function generateLifeInsights(
  allEntries: JournalEntry[],
  messageDrafts: MessageDraft[],
): LifeInsight[] {
  console.log('[LifeInsight] Generating insights from', allEntries.length, 'entries and', messageDrafts.length, 'drafts');

  const now = Date.now();
  const weekAgo = now - SEVEN_DAYS;
  const weekEntries = allEntries.filter(e => e.timestamp >= weekAgo).sort((a, b) => b.timestamp - a.timestamp);
  const weekMessages = messageDrafts.filter(m => m.timestamp >= weekAgo);

  if (weekEntries.length === 0) {
    console.log('[LifeInsight] No entries in the past week');
    return [];
  }

  const allInsights: LifeInsight[] = [
    ...detectTriggerInsights(weekEntries, now),
    ...detectRelationshipInsights(weekEntries, weekMessages, now),
    ...detectTimePatternInsights(weekEntries, now),
    ...detectCopingInsights(weekEntries, now),
    ...detectEmotionalLoopInsights(weekEntries, now),
    ...detectGrowthInsights(weekEntries, weekMessages, now),
    ...detectDistressInsights(weekEntries, now),
  ];

  const sorted = allInsights.sort((a, b) => b.confidence - a.confidence);
  console.log('[LifeInsight] Generated', sorted.length, 'insights');
  return sorted;
}

export function generateWeeklySummary(
  allEntries: JournalEntry[],
  messageDrafts: MessageDraft[],
): WeeklySummary {
  const now = Date.now();
  const weekAgo = now - SEVEN_DAYS;
  const weekEntries = allEntries.filter(e => e.timestamp >= weekAgo).sort((a, b) => b.timestamp - a.timestamp);
  const weekMessages = messageDrafts.filter(m => m.timestamp >= weekAgo);

  const triggerCounts: Record<string, number> = {};
  const emotionCounts: Record<string, { emoji: string; count: number }> = {};

  weekEntries.forEach(e => {
    e.checkIn.triggers.forEach(t => {
      triggerCounts[t.label] = (triggerCounts[t.label] || 0) + 1;
    });
    e.checkIn.emotions.forEach(em => {
      if (!emotionCounts[em.label]) emotionCounts[em.label] = { emoji: em.emoji, count: 0 };
      emotionCounts[em.label].count += 1;
    });
  });

  const topTriggers = Object.entries(triggerCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([label, count]) => ({ label, count }));

  const topEmotions = Object.entries(emotionCounts)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 5)
    .map(([label, data]) => ({ label, emoji: data.emoji, count: data.count }));

  const avgDistress = weekEntries.length > 0
    ? Math.round((weekEntries.reduce((s, e) => s + e.checkIn.intensityLevel, 0) / weekEntries.length) * 10) / 10
    : 0;

  let distressTrend: WeeklySummary['distressTrend'] = 'insufficient';
  if (weekEntries.length >= 4) {
    const sorted = [...weekEntries].sort((a, b) => a.timestamp - b.timestamp);
    const half = Math.floor(sorted.length / 2);
    const firstAvg = sorted.slice(0, half).reduce((s, e) => s + e.checkIn.intensityLevel, 0) / half;
    const secondAvg = sorted.slice(half).reduce((s, e) => s + e.checkIn.intensityLevel, 0) / (sorted.length - half);
    const diff = secondAvg - firstAvg;
    distressTrend = diff < -0.5 ? 'improving' : diff > 0.5 ? 'elevated' : 'stable';
  }

  const copingCounts: Record<string, number> = {};
  weekEntries.forEach(e => {
    e.checkIn.copingUsed?.forEach(tool => {
      copingCounts[tool] = (copingCounts[tool] || 0) + 1;
    });
  });
  const topCoping = Object.entries(copingCounts).sort(([, a], [, b]) => b - a)[0];
  const copingHighlight = topCoping ? `"${topCoping[0]}" was your most-used tool (${topCoping[1]} times)` : null;

  const growthSignals: string[] = [];
  if (distressTrend === 'improving') growthSignals.push('Distress levels are trending downward');
  const managedCount = weekEntries.filter(e => e.outcome === 'managed').length;
  if (managedCount >= 2) growthSignals.push(`Managed emotions effectively ${managedCount} times`);
  const pauseCount = weekMessages.filter(m => m.paused).length;
  if (pauseCount >= 1) growthSignals.push(`Paused before reacting ${pauseCount} times`);
  if (weekEntries.length >= 5) growthSignals.push('Consistent self-awareness through regular check-ins');

  const insights = generateLifeInsights(allEntries, messageDrafts);

  return {
    id: `weekly_${now}`,
    weekLabel: getWeekLabel(weekAgo, now),
    generatedAt: now,
    periodStart: weekAgo,
    periodEnd: now,
    totalCheckIns: weekEntries.length,
    averageDistress: avgDistress,
    distressTrend,
    topTriggers,
    topEmotions,
    copingHighlight,
    growthSignals,
    insights,
  };
}

export async function saveLifeInsights(insights: LifeInsight[]): Promise<void> {
  try {
    await AsyncStorage.setItem(LIFE_INSIGHTS_KEY, JSON.stringify(insights));
    console.log('[LifeInsight] Saved', insights.length, 'insights');
  } catch (error) {
    console.error('[LifeInsight] Failed to save insights:', error);
  }
}

export async function getStoredLifeInsights(): Promise<LifeInsight[]> {
  try {
    const stored = await AsyncStorage.getItem(LIFE_INSIGHTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('[LifeInsight] Failed to load insights:', error);
    return [];
  }
}

export async function saveWeeklySummary(summary: WeeklySummary): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(WEEKLY_SUMMARIES_KEY);
    const summaries: WeeklySummary[] = stored ? JSON.parse(stored) : [];
    summaries.unshift(summary);
    const trimmed = summaries.slice(0, 12);
    await AsyncStorage.setItem(WEEKLY_SUMMARIES_KEY, JSON.stringify(trimmed));
    console.log('[LifeInsight] Saved weekly summary, total:', trimmed.length);
  } catch (error) {
    console.error('[LifeInsight] Failed to save weekly summary:', error);
  }
}

export async function getStoredWeeklySummaries(): Promise<WeeklySummary[]> {
  try {
    const stored = await AsyncStorage.getItem(WEEKLY_SUMMARIES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('[LifeInsight] Failed to load weekly summaries:', error);
    return [];
  }
}

export async function markInsightViewed(insightId: string): Promise<void> {
  try {
    const insights = await getStoredLifeInsights();
    const updated = insights.map(i => i.id === insightId ? { ...i, viewed: true } : i);
    await saveLifeInsights(updated);
  } catch (error) {
    console.error('[LifeInsight] Failed to mark insight viewed:', error);
  }
}

export function getInsightForAICompanion(insights: LifeInsight[]): string | null {
  if (insights.length === 0) return null;

  const topInsight = insights[0];
  return `I've noticed something: ${topInsight.title.toLowerCase()}. ${topInsight.description} ${topInsight.supportiveNote}`;
}
