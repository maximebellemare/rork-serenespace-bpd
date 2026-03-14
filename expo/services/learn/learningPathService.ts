import AsyncStorage from '@react-native-async-storage/async-storage';
import { LEARNING_PATHS } from '@/data/learningPaths';
import { EMOTIONAL_PATTERNS } from '@/data/emotionalPatterns';
import { LEARNING_SCENARIOS } from '@/data/learningScenarios';
import {
  LearningPath,
  LearningPathProgress,
  LearningPathState,
  EmotionalPattern,
  LearningScenario,
  WeeklyLearningInsight,
} from '@/types/learningPath';

const PATH_STATE_KEY = 'bpd_learning_path_state';
const WEEKLY_INSIGHT_KEY = 'bpd_weekly_learning_insight';

const DEFAULT_PATH_STATE: LearningPathState = {
  pathProgress: {},
  activePathId: null,
};

export async function getLearningPathState(): Promise<LearningPathState> {
  try {
    const stored = await AsyncStorage.getItem(PATH_STATE_KEY);
    if (stored) return JSON.parse(stored) as LearningPathState;
    return DEFAULT_PATH_STATE;
  } catch (err) {
    console.log('[LearningPathService] Error loading state:', err);
    return DEFAULT_PATH_STATE;
  }
}

export async function saveLearningPathState(state: LearningPathState): Promise<void> {
  try {
    await AsyncStorage.setItem(PATH_STATE_KEY, JSON.stringify(state));
    console.log('[LearningPathService] Saved path state');
  } catch (err) {
    console.log('[LearningPathService] Error saving state:', err);
  }
}

export function getAllLearningPaths(): LearningPath[] {
  return LEARNING_PATHS;
}

export function getLearningPathById(pathId: string): LearningPath | undefined {
  return LEARNING_PATHS.find(p => p.id === pathId);
}

export function getPathProgress(pathId: string, state: LearningPathState): LearningPathProgress | null {
  return state.pathProgress[pathId] ?? null;
}

export function getPathCompletionPercent(pathId: string, state: LearningPathState): number {
  const path = getLearningPathById(pathId);
  if (!path) return 0;
  const progress = state.pathProgress[pathId];
  if (!progress) return 0;
  return Math.round((progress.completedStepIds.length / path.steps.length) * 100);
}

export async function markPathStepCompleted(
  pathId: string,
  stepId: string,
  state: LearningPathState,
): Promise<LearningPathState> {
  const existing = state.pathProgress[pathId] ?? {
    pathId,
    completedStepIds: [],
    startedAt: Date.now(),
    lastActivityAt: Date.now(),
  };

  const completedStepIds = existing.completedStepIds.includes(stepId)
    ? existing.completedStepIds
    : [...existing.completedStepIds, stepId];

  const newState: LearningPathState = {
    ...state,
    activePathId: pathId,
    pathProgress: {
      ...state.pathProgress,
      [pathId]: {
        ...existing,
        completedStepIds,
        lastActivityAt: Date.now(),
      },
    },
  };

  await saveLearningPathState(newState);
  return newState;
}

export async function startPath(pathId: string, state: LearningPathState): Promise<LearningPathState> {
  if (state.pathProgress[pathId]) {
    const newState = { ...state, activePathId: pathId };
    await saveLearningPathState(newState);
    return newState;
  }

  const newState: LearningPathState = {
    ...state,
    activePathId: pathId,
    pathProgress: {
      ...state.pathProgress,
      [pathId]: {
        pathId,
        completedStepIds: [],
        startedAt: Date.now(),
        lastActivityAt: Date.now(),
      },
    },
  };

  await saveLearningPathState(newState);
  return newState;
}

export function getAllPatterns(): EmotionalPattern[] {
  return EMOTIONAL_PATTERNS;
}

export function getPatternById(patternId: string): EmotionalPattern | undefined {
  return EMOTIONAL_PATTERNS.find(p => p.id === patternId);
}

export function getAllScenarios(): LearningScenario[] {
  return LEARNING_SCENARIOS;
}

export function getScenarioById(scenarioId: string): LearningScenario | undefined {
  return LEARNING_SCENARIOS.find(s => s.id === scenarioId);
}

export function getScenariosByCategory(category: LearningScenario['category']): LearningScenario[] {
  return LEARNING_SCENARIOS.filter(s => s.category === category);
}

export function generateWeeklyLearningInsight(
  recentEmotions: string[],
  recentTriggers: string[],
  _completedLessonIds: string[],
): WeeklyLearningInsight {
  const now = Date.now();
  const weekStart = now - 7 * 24 * 60 * 60 * 1000;

  let suggestedPathId: string | null = null;
  const suggestedPatternIds: string[] = [];
  const suggestedLessonIds: string[] = [];

  const emotionLower = recentEmotions.map(e => e.toLowerCase());
  const triggerLower = recentTriggers.map(t => t.toLowerCase());

  if (emotionLower.some(e => ['anger', 'rage', 'frustration'].includes(e)) ||
      triggerLower.some(t => t.includes('conflict') || t.includes('argument'))) {
    suggestedPathId = 'path-communication-conflict';
    suggestedPatternIds.push('pattern-emotional-escalation');
  }

  if (emotionLower.some(e => ['anxiety', 'panic', 'fear'].includes(e)) ||
      triggerLower.some(t => t.includes('reject') || t.includes('abandon') || t.includes('ignored'))) {
    suggestedPathId = suggestedPathId ?? 'path-relationship-triggers';
    suggestedPatternIds.push('pattern-rejection-sensitivity');
  }

  if (emotionLower.some(e => ['shame', 'guilt', 'worthless'].includes(e))) {
    suggestedPathId = suggestedPathId ?? 'path-self-compassion';
    suggestedPatternIds.push('pattern-shame-spiral');
  }

  if (emotionLower.some(e => ['sadness', 'overwhelm', 'numb'].includes(e))) {
    suggestedPathId = suggestedPathId ?? 'path-emotional-dysregulation';
    suggestedPatternIds.push('pattern-emotional-escalation');
  }

  if (!suggestedPathId) {
    suggestedPathId = 'path-regulation-skills';
  }

  const messages: string[] = [];
  if (suggestedPatternIds.includes('pattern-rejection-sensitivity')) {
    messages.push('This week you may benefit from learning about rejection sensitivity and how it shapes your reactions.');
  } else if (suggestedPatternIds.includes('pattern-emotional-escalation')) {
    messages.push('This week you may benefit from learning about emotional escalation and strategies to intervene early.');
  } else if (suggestedPatternIds.includes('pattern-shame-spiral')) {
    messages.push('This week you may benefit from learning about shame spirals and self-compassion practices.');
  } else {
    messages.push('This week is a good time to build on your emotional regulation skills.');
  }

  return {
    id: `wli-${now}`,
    weekStart,
    suggestedPathId,
    suggestedPatternIds: [...new Set(suggestedPatternIds)],
    suggestedLessonIds,
    message: messages[0],
    generatedAt: now,
  };
}

export async function getWeeklyLearningInsight(): Promise<WeeklyLearningInsight | null> {
  try {
    const stored = await AsyncStorage.getItem(WEEKLY_INSIGHT_KEY);
    if (stored) {
      const insight = JSON.parse(stored) as WeeklyLearningInsight;
      const weekMs = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - insight.generatedAt < weekMs) {
        return insight;
      }
    }
    return null;
  } catch (err) {
    console.log('[LearningPathService] Error loading weekly insight:', err);
    return null;
  }
}

export async function saveWeeklyLearningInsight(insight: WeeklyLearningInsight): Promise<void> {
  try {
    await AsyncStorage.setItem(WEEKLY_INSIGHT_KEY, JSON.stringify(insight));
    console.log('[LearningPathService] Saved weekly learning insight');
  } catch (err) {
    console.log('[LearningPathService] Error saving weekly insight:', err);
  }
}
