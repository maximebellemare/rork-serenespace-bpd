import { OutcomeRecord } from '@/types/companionModes';
import { storageService } from '@/services/storage/storageService';
import { trackEvent } from '@/services/analytics/analyticsService';

const OUTCOMES_KEY = 'bpd_companion_outcomes';
const MAX_OUTCOMES = 200;

export async function loadOutcomes(): Promise<OutcomeRecord[]> {
  try {
    const stored = await storageService.get<OutcomeRecord[]>(OUTCOMES_KEY);
    return stored ?? [];
  } catch (error) {
    console.log('[OutcomeLearning] Error loading outcomes:', error);
    return [];
  }
}

export async function saveOutcome(outcome: OutcomeRecord): Promise<void> {
  try {
    const existing = await loadOutcomes();
    const updated = [outcome, ...existing].slice(0, MAX_OUTCOMES);
    await storageService.set(OUTCOMES_KEY, updated);
    console.log('[OutcomeLearning] Saved outcome for:', outcome.sourceFlow, 'tool:', outcome.toolSuggested);

    void trackEvent('companion_outcome_recorded', {
      source_flow: outcome.sourceFlow,
      tool_suggested: outcome.toolSuggested,
      helpful: outcome.markedHelpful ?? false,
      distress_reduction: outcome.distressBefore && outcome.distressAfter
        ? outcome.distressBefore - outcome.distressAfter
        : 0,
    });
  } catch (error) {
    console.log('[OutcomeLearning] Error saving outcome:', error);
  }
}

export function createOutcomeRecord(params: {
  sourceFlow: string;
  toolSuggested: string;
  distressBefore?: number;
  distressAfter?: number;
  didPause?: boolean;
  didSendMessage?: boolean;
  didCompleteExercise?: boolean;
  markedHelpful?: boolean;
  emotionalContext: string;
  tags?: string[];
}): OutcomeRecord {
  return {
    id: `outcome_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    sourceFlow: params.sourceFlow,
    toolSuggested: params.toolSuggested,
    distressBefore: params.distressBefore,
    distressAfter: params.distressAfter,
    didPause: params.didPause,
    didSendMessage: params.didSendMessage,
    didCompleteExercise: params.didCompleteExercise,
    markedHelpful: params.markedHelpful,
    emotionalContext: params.emotionalContext,
    tags: params.tags ?? [],
  };
}

export interface ToolEffectivenessScore {
  tool: string;
  totalUses: number;
  helpfulCount: number;
  averageDistressReduction: number;
  successRate: number;
  lastUsed: number;
}

export async function getToolEffectiveness(): Promise<ToolEffectivenessScore[]> {
  const outcomes = await loadOutcomes();
  const toolMap = new Map<string, {
    totalUses: number;
    helpfulCount: number;
    distressReductions: number[];
    lastUsed: number;
  }>();

  for (const outcome of outcomes) {
    const key = outcome.toolSuggested;
    const existing = toolMap.get(key) ?? {
      totalUses: 0,
      helpfulCount: 0,
      distressReductions: [],
      lastUsed: 0,
    };

    existing.totalUses += 1;
    if (outcome.markedHelpful) existing.helpfulCount += 1;
    if (outcome.distressBefore !== undefined && outcome.distressAfter !== undefined) {
      existing.distressReductions.push(outcome.distressBefore - outcome.distressAfter);
    }
    existing.lastUsed = Math.max(existing.lastUsed, outcome.timestamp);
    toolMap.set(key, existing);
  }

  return Array.from(toolMap.entries())
    .map(([tool, data]) => {
      const avgReduction = data.distressReductions.length > 0
        ? data.distressReductions.reduce((s, v) => s + v, 0) / data.distressReductions.length
        : 0;
      return {
        tool,
        totalUses: data.totalUses,
        helpfulCount: data.helpfulCount,
        averageDistressReduction: Math.round(avgReduction * 10) / 10,
        successRate: data.totalUses > 0 ? Math.round((data.helpfulCount / data.totalUses) * 100) : 0,
        lastUsed: data.lastUsed,
      };
    })
    .sort((a, b) => b.successRate - a.successRate);
}

export async function getBestToolForContext(
  emotionalContext: string,
  tags: string[],
): Promise<string | null> {
  const outcomes = await loadOutcomes();
  const relevant = outcomes.filter(o => {
    if (o.emotionalContext === emotionalContext) return true;
    return o.tags.some(t => tags.includes(t));
  });

  if (relevant.length === 0) return null;

  const toolScores = new Map<string, { helpful: number; total: number }>();
  for (const o of relevant) {
    const existing = toolScores.get(o.toolSuggested) ?? { helpful: 0, total: 0 };
    existing.total += 1;
    if (o.markedHelpful || (o.distressBefore && o.distressAfter && o.distressAfter < o.distressBefore)) {
      existing.helpful += 1;
    }
    toolScores.set(o.toolSuggested, existing);
  }

  let bestTool: string | null = null;
  let bestRate = 0;
  for (const [tool, scores] of toolScores) {
    if (scores.total >= 2) {
      const rate = scores.helpful / scores.total;
      if (rate > bestRate) {
        bestRate = rate;
        bestTool = tool;
      }
    }
  }

  return bestTool;
}
