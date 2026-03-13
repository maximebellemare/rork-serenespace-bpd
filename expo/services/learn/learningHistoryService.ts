import AsyncStorage from '@react-native-async-storage/async-storage';
import { LearningHistory, LearningHistoryEntry, EmotionalSignal } from '@/types/learningRecommendation';

const HISTORY_KEY = 'bpd_learning_history';

const DEFAULT_HISTORY: LearningHistory = {
  entries: [],
  lastRecommendationShown: 0,
};

export async function getLearningHistory(): Promise<LearningHistory> {
  try {
    const stored = await AsyncStorage.getItem(HISTORY_KEY);
    if (stored) {
      return JSON.parse(stored) as LearningHistory;
    }
    return DEFAULT_HISTORY;
  } catch (err) {
    console.log('[LearningHistory] Error loading:', err);
    return DEFAULT_HISTORY;
  }
}

export async function saveLearningHistory(history: LearningHistory): Promise<void> {
  try {
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    console.log('[LearningHistory] Saved, entries:', history.entries.length);
  } catch (err) {
    console.log('[LearningHistory] Error saving:', err);
  }
}

export async function recordArticleOpened(
  lessonId: string,
  source: LearningHistoryEntry['source'],
  triggerContext: EmotionalSignal | null = null,
): Promise<LearningHistory> {
  const history = await getLearningHistory();

  const existing = history.entries.find(
    e => e.lessonId === lessonId && !e.completedAt && Date.now() - e.openedAt < 3600000,
  );

  if (!existing) {
    history.entries.unshift({
      lessonId,
      openedAt: Date.now(),
      completedAt: null,
      source,
      triggerContext,
    });

    history.entries = history.entries.slice(0, 200);
  }

  await saveLearningHistory(history);
  return history;
}

export async function recordArticleCompleted(lessonId: string): Promise<LearningHistory> {
  const history = await getLearningHistory();

  const entry = history.entries.find(e => e.lessonId === lessonId && !e.completedAt);
  if (entry) {
    entry.completedAt = Date.now();
  }

  await saveLearningHistory(history);
  return history;
}

export async function recordRecommendationShown(): Promise<LearningHistory> {
  const history = await getLearningHistory();
  history.lastRecommendationShown = Date.now();
  await saveLearningHistory(history);
  return history;
}

export function getRecentArticles(history: LearningHistory, limit: number = 5): LearningHistoryEntry[] {
  return history.entries.slice(0, limit);
}

export function getCompletedArticles(history: LearningHistory): LearningHistoryEntry[] {
  return history.entries.filter(e => e.completedAt !== null);
}

export function getArticlesBySource(
  history: LearningHistory,
  source: LearningHistoryEntry['source'],
): LearningHistoryEntry[] {
  return history.entries.filter(e => e.source === source);
}
