import AsyncStorage from '@react-native-async-storage/async-storage';
import { DAILY_INSIGHTS_LIBRARY } from '@/data/learn/insightsLibrary';
import {
  DailyInsight,
  DailyInsightState,
  DailyInsightSelection,
  InsightCategory,
  InsightFeedback,
  WeeklyLearningSummary,
} from '@/types/dailyInsight';
import { JournalEntry } from '@/types';

const STORAGE_KEY = 'daily_insight_state';
const WEEKLY_SUMMARY_KEY = 'weekly_learning_summary';

const DEFAULT_STATE: DailyInsightState = {
  currentInsightId: '',
  dateStr: '',
  savedInsightIds: [],
  feedback: {},
  viewedIds: [],
  categoryPreferences: {},
};

function getTodayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function getWeekStartStr(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now);
  monday.setDate(diff);
  return monday.toISOString().split('T')[0];
}

export async function getDailyInsightState(): Promise<DailyInsightState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as DailyInsightState;
    }
  } catch (e) {
    console.log('[DailyInsight] Error reading state:', e);
  }
  return { ...DEFAULT_STATE };
}

export async function saveDailyInsightState(state: DailyInsightState): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.log('[DailyInsight] Error saving state:', e);
  }
}

function extractRecentEmotionTags(journalEntries: JournalEntry[]): InsightCategory[] {
  const recent = journalEntries.filter(
    e => Date.now() - e.timestamp < 14 * 24 * 60 * 60 * 1000
  );

  const tagCounts: Partial<Record<InsightCategory, number>> = {};

  for (const entry of recent) {
    for (const emotion of entry.checkIn.emotions) {
      const label = emotion.label.toLowerCase();
      const mapped = mapEmotionToCategory(label);
      if (mapped) {
        tagCounts[mapped] = (tagCounts[mapped] ?? 0) + 1;
      }
    }
    for (const trigger of entry.checkIn.triggers) {
      const mapped = mapTriggerToCategory(trigger.category);
      if (mapped) {
        tagCounts[mapped] = (tagCounts[mapped] ?? 0) + 1;
      }
    }
    if (entry.checkIn.intensityLevel >= 7) {
      tagCounts['emotional_escalation'] = (tagCounts['emotional_escalation'] ?? 0) + 1;
    }
  }

  return Object.entries(tagCounts)
    .sort(([, a], [, b]) => (b ?? 0) - (a ?? 0))
    .slice(0, 5)
    .map(([key]) => key as InsightCategory);
}

function mapEmotionToCategory(label: string): InsightCategory | null {
  const map: Record<string, InsightCategory> = {
    anger: 'anger',
    rage: 'anger',
    fury: 'anger',
    irritation: 'anger',
    shame: 'shame_cycles',
    guilt: 'shame_cycles',
    embarrassment: 'shame_cycles',
    fear: 'emotional_escalation',
    anxiety: 'abandonment_anxiety',
    panic: 'emotional_escalation',
    sadness: 'grief',
    grief: 'grief',
    loss: 'grief',
    loneliness: 'vulnerability',
    isolation: 'vulnerability',
    rejection: 'rejection_sensitivity',
    abandoned: 'abandonment_anxiety',
    abandonment: 'abandonment_anxiety',
    jealousy: 'relationship_conflict',
    confusion: 'interpretation_errors',
    overwhelm: 'emotional_escalation',
    overwhelmed: 'emotional_escalation',
    numbness: 'numbness',
    empty: 'numbness',
    hope: 'self_compassion',
    relief: 'regulation',
    hurt: 'vulnerability',
  };
  return map[label] ?? null;
}

function mapTriggerToCategory(category: string): InsightCategory | null {
  const map: Record<string, InsightCategory> = {
    relationship: 'relationship_conflict',
    self: 'identity',
    situation: 'emotional_escalation',
    memory: 'emotional_memory_bias',
  };
  return map[category] ?? null;
}

function scoreInsight(
  insight: DailyInsight,
  recentTags: InsightCategory[],
  state: DailyInsightState,
): number {
  let score = 0;

  for (const tag of insight.relatedPatternTags) {
    if (recentTags.includes(tag)) {
      score += 10;
    }
  }

  const prefs = state.categoryPreferences;
  for (const tag of insight.relatedPatternTags) {
    score += (prefs[tag] ?? 0) * 3;
  }

  if (state.viewedIds.includes(insight.id)) {
    score -= 20;
  }

  if (state.feedback[insight.id] === 'not_relevant') {
    score -= 30;
  }
  if (state.feedback[insight.id] === 'more_like_this') {
    score += 5;
  }

  const dateHash = getTodayStr().split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const idHash = insight.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  score += ((dateHash * idHash) % 7) - 3;

  return score;
}

export function selectDailyInsight(
  journalEntries: JournalEntry[],
  state: DailyInsightState,
): DailyInsightSelection {
  const recentTags = extractRecentEmotionTags(journalEntries);
  const hasRecentData = recentTags.length > 0;

  const scored = DAILY_INSIGHTS_LIBRARY.map(insight => ({
    insight,
    score: scoreInsight(insight, recentTags, state),
  })).sort((a, b) => b.score - a.score);

  const selected = scored[0]?.insight ?? DAILY_INSIGHTS_LIBRARY[0];

  const isPatternTriggered = hasRecentData && recentTags.some(tag =>
    selected.relatedPatternTags.includes(tag)
  );

  let reason = 'A thought to support your day.';
  let patternMessage: string | undefined;

  if (isPatternTriggered) {
    const matchedTag = recentTags.find(tag => selected.relatedPatternTags.includes(tag));
    reason = 'Based on your recent emotional patterns.';
    if (matchedTag) {
      patternMessage = getPatternMessage(matchedTag);
    }
  }

  return {
    insight: selected,
    reason,
    isPatternTriggered,
    patternMessage,
  };
}

function getPatternMessage(tag: InsightCategory): string {
  const messages: Record<InsightCategory, string> = {
    emotional_escalation: 'Recent entries suggest emotional intensity has been building.',
    rejection_sensitivity: 'Rejection themes have appeared in your recent reflections.',
    abandonment_anxiety: 'Connection uncertainty seems present lately.',
    shame_cycles: 'Shame patterns have shown up recently.',
    rumination: 'Repetitive thinking patterns may be active.',
    interpretation_errors: 'Your mind may be filling in gaps with assumptions lately.',
    relationship_conflict: 'Relationship stress appears in recent entries.',
    impulsivity: 'Urgency patterns seem present in your recent reflections.',
    emotional_memory_bias: 'Old emotional memories may be influencing the present.',
    self_compassion: 'Self-kindness themes have appeared recently.',
    communication: 'Communication challenges seem present.',
    identity: 'Identity-related themes have appeared recently.',
    regulation: 'Regulation has been a focus in recent entries.',
    mindfulness: 'Mindful awareness seems relevant right now.',
    boundaries: 'Boundary themes have appeared recently.',
    vulnerability: 'Emotional vulnerability is a current theme.',
    trust: 'Trust-related patterns seem active.',
    grief: 'Grief or loss themes have appeared recently.',
    anger: 'Anger has been present in recent reflections.',
    numbness: 'Emotional numbness may be present lately.',
  };
  return messages[tag] ?? 'This insight relates to patterns in your recent reflections.';
}

export async function recordInsightFeedback(
  insightId: string,
  feedback: InsightFeedback,
  state: DailyInsightState,
): Promise<DailyInsightState> {
  const insight = DAILY_INSIGHTS_LIBRARY.find(i => i.id === insightId);
  const updatedPrefs = { ...state.categoryPreferences };

  if (insight) {
    for (const tag of insight.relatedPatternTags) {
      const current = updatedPrefs[tag] ?? 0;
      if (feedback === 'helpful' || feedback === 'more_like_this') {
        updatedPrefs[tag] = current + 1;
      } else if (feedback === 'not_relevant') {
        updatedPrefs[tag] = Math.max(0, current - 1);
      }
    }
  }

  const updated: DailyInsightState = {
    ...state,
    feedback: { ...state.feedback, [insightId]: feedback },
    categoryPreferences: updatedPrefs,
  };

  await saveDailyInsightState(updated);
  return updated;
}

export async function toggleSaveInsight(
  insightId: string,
  state: DailyInsightState,
): Promise<DailyInsightState> {
  const isSaved = state.savedInsightIds.includes(insightId);
  const savedInsightIds = isSaved
    ? state.savedInsightIds.filter(id => id !== insightId)
    : [...state.savedInsightIds, insightId];

  const updated: DailyInsightState = { ...state, savedInsightIds };
  await saveDailyInsightState(updated);
  return updated;
}

export async function markInsightViewed(
  insightId: string,
  state: DailyInsightState,
): Promise<DailyInsightState> {
  const viewedIds = state.viewedIds.includes(insightId)
    ? state.viewedIds
    : [...state.viewedIds, insightId].slice(-200);

  const updated: DailyInsightState = {
    ...state,
    viewedIds,
    currentInsightId: insightId,
    dateStr: getTodayStr(),
  };

  await saveDailyInsightState(updated);
  return updated;
}

export function getSavedInsights(state: DailyInsightState): DailyInsight[] {
  return state.savedInsightIds
    .map(id => DAILY_INSIGHTS_LIBRARY.find(i => i.id === id))
    .filter((i): i is DailyInsight => i !== undefined);
}

export function getInsightById(id: string): DailyInsight | undefined {
  return DAILY_INSIGHTS_LIBRARY.find(i => i.id === id);
}

export function generateWeeklyLearningSummary(
  journalEntries: JournalEntry[],
  state: DailyInsightState,
): WeeklyLearningSummary {
  const recentTags = extractRecentEmotionTags(journalEntries);
  const dominantThemes = recentTags.slice(0, 3);

  const relevantInsights = DAILY_INSIGHTS_LIBRARY
    .filter(insight =>
      insight.relatedPatternTags.some(tag => dominantThemes.includes(tag)) &&
      !state.viewedIds.includes(insight.id)
    )
    .slice(0, 5);

  const themeLabels = dominantThemes.map(formatCategoryLabel);
  const message = dominantThemes.length > 0
    ? `This week, ${themeLabels.join(' and ')} appeared in your reflections. These insights may help you understand what is happening.`
    : 'Keep journaling to receive personalized learning recommendations each week.';

  return {
    id: `wls_${getWeekStartStr()}`,
    weekStart: getWeekStartStr(),
    dominantThemes,
    suggestedInsightIds: relevantInsights.map(i => i.id),
    suggestedLessonIds: relevantInsights.flatMap(i => i.relatedLessonIds).slice(0, 5),
    message,
    generatedAt: Date.now(),
  };
}

function formatCategoryLabel(category: InsightCategory): string {
  const labels: Record<InsightCategory, string> = {
    emotional_escalation: 'emotional intensity',
    rejection_sensitivity: 'rejection sensitivity',
    abandonment_anxiety: 'connection anxiety',
    shame_cycles: 'shame patterns',
    rumination: 'repetitive thinking',
    interpretation_errors: 'interpretation patterns',
    relationship_conflict: 'relationship stress',
    impulsivity: 'urgency patterns',
    emotional_memory_bias: 'emotional memory',
    self_compassion: 'self-compassion',
    communication: 'communication challenges',
    identity: 'identity themes',
    regulation: 'emotional regulation',
    mindfulness: 'mindful awareness',
    boundaries: 'boundary themes',
    vulnerability: 'emotional vulnerability',
    trust: 'trust patterns',
    grief: 'grief and loss',
    anger: 'anger',
    numbness: 'emotional numbness',
  };
  return labels[category] ?? category;
}

export async function getWeeklyLearningSummary(): Promise<WeeklyLearningSummary | null> {
  try {
    const raw = await AsyncStorage.getItem(WEEKLY_SUMMARY_KEY);
    if (raw) {
      const summary = JSON.parse(raw) as WeeklyLearningSummary;
      if (summary.weekStart === getWeekStartStr()) {
        return summary;
      }
    }
  } catch (e) {
    console.log('[DailyInsight] Error reading weekly summary:', e);
  }
  return null;
}

export async function saveWeeklyLearningSummary(summary: WeeklyLearningSummary): Promise<void> {
  try {
    await AsyncStorage.setItem(WEEKLY_SUMMARY_KEY, JSON.stringify(summary));
  } catch (e) {
    console.log('[DailyInsight] Error saving weekly summary:', e);
  }
}
