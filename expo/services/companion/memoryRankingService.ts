import {
  CompanionMemoryStore,
  EpisodicMemory,
  SemanticMemory,
  MemoryRetrievalContext,
  RetrievedMemoryContext,
} from '@/types/companionMemory';
import { estimateTokens } from '@/services/ai/tokenBudgetService';

const MAX_EPISODES = 3;
const MAX_TRAITS = 3;
const MAX_SESSIONS = 2;
const DEFAULT_MEMORY_TOKEN_BUDGET = 400;

export function retrieveRankedMemories(
  store: CompanionMemoryStore,
  context: MemoryRetrievalContext,
  tokenBudget: number = DEFAULT_MEMORY_TOKEN_BUDGET,
): RetrievedMemoryContext {
  console.log('[MemoryRanking] Ranking memories with budget:', tokenBudget, 'tokens');

  const scoredEpisodes = store.episodicMemories
    .map(m => ({ memory: m, score: scoreEpisode(m, context) }))
    .filter(s => s.score > 1)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_EPISODES);

  const scoredTraits = store.semanticMemories
    .map(m => ({ memory: m, score: scoreTrait(m, context) }))
    .filter(s => s.score > 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_TRAITS);

  const recentSessions = store.sessionSummaries.slice(0, MAX_SESSIONS);

  const suggestedCoping = extractCoping(scoredEpisodes.map(s => s.memory));
  const patternWarning = detectPattern(store, context);

  const narrative = buildBudgetedNarrative(
    scoredEpisodes.map(s => s.memory),
    scoredTraits.map(s => s.memory),
    recentSessions,
    suggestedCoping,
    patternWarning,
    tokenBudget,
  );

  console.log('[MemoryRanking] Selected:', scoredEpisodes.length, 'episodes,', scoredTraits.length, 'traits, narrative tokens:', estimateTokens(narrative));

  return {
    relevantEpisodes: scoredEpisodes.map(s => s.memory),
    relevantTraits: scoredTraits.map(s => s.memory),
    recentSessions,
    suggestedCoping,
    patternWarning,
    contextNarrative: narrative,
  };
}

function scoreEpisode(memory: EpisodicMemory, context: MemoryRetrievalContext): number {
  let score = 0;

  if (context.currentTrigger) {
    const triggerLower = context.currentTrigger.toLowerCase();
    const memTriggerLower = memory.trigger.toLowerCase();
    if (memTriggerLower === triggerLower) {
      score += 4;
    } else if (memTriggerLower.includes(triggerLower) || triggerLower.includes(memTriggerLower)) {
      score += 2;
    }
  }

  if (context.currentEmotion) {
    const emotionLower = context.currentEmotion.toLowerCase();
    if (memory.emotion.toLowerCase().includes(emotionLower)) {
      score += 2;
    }
  }

  if (context.conversationTags && context.conversationTags.length > 0) {
    const matchCount = memory.tags.filter(t =>
      context.conversationTags!.some(ct => ct.toLowerCase() === t.toLowerCase()),
    ).length;
    score += Math.min(matchCount * 0.8, 2.4);
  }

  const ageHours = (Date.now() - memory.timestamp) / (60 * 60 * 1000);
  if (ageHours < 24) score += 1.5;
  else if (ageHours < 72) score += 1;
  else if (ageHours < 168) score += 0.5;

  if (memory.lesson) score += 1;
  if (memory.copingUsed && memory.copingUsed.length > 0 && memory.outcome === 'helped') score += 1;

  return score;
}

function scoreTrait(memory: SemanticMemory, context: MemoryRetrievalContext): number {
  let score = memory.confidence;

  if (context.conversationTags) {
    const matchCount = memory.tags.filter(t =>
      context.conversationTags!.some(ct => ct.toLowerCase() === t.toLowerCase()),
    ).length;
    score += matchCount * 1.2;
  }

  if (context.recentMessageContent) {
    const lower = context.recentMessageContent.toLowerCase();
    if (lower.includes(memory.trait.toLowerCase())) {
      score += 2;
    }
  }

  if (memory.observationCount >= 5) score += 0.5;

  return score;
}

function extractCoping(episodes: EpisodicMemory[]): string[] {
  const copingMap = new Map<string, number>();
  for (const ep of episodes) {
    if (ep.copingUsed && (ep.outcome === 'helped' || ep.outcome === 'managed')) {
      for (const tool of ep.copingUsed) {
        copingMap.set(tool, (copingMap.get(tool) ?? 0) + 1);
      }
    }
  }
  return Array.from(copingMap.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2)
    .map(([tool]) => tool);
}

function detectPattern(store: CompanionMemoryStore, context: MemoryRetrievalContext): string | undefined {
  if (!context.currentTrigger) return undefined;

  const recentEpisodes = store.episodicMemories.filter(m => {
    const isRecent = Date.now() - m.timestamp < 7 * 24 * 60 * 60 * 1000;
    return isRecent && m.trigger.toLowerCase().includes(context.currentTrigger!.toLowerCase());
  });

  if (recentEpisodes.length >= 3) {
    return `"${context.currentTrigger}" has come up ${recentEpisodes.length}x this week.`;
  }

  return undefined;
}

function buildBudgetedNarrative(
  episodes: EpisodicMemory[],
  traits: SemanticMemory[],
  sessions: Array<{ insight?: string }>,
  suggestedCoping: string[],
  patternWarning: string | undefined,
  tokenBudget: number,
): string {
  if (episodes.length === 0 && traits.length === 0) return '';

  const parts: string[] = ['[Memory]'];
  let currentTokens = estimateTokens(parts[0]);

  if (traits.length > 0) {
    const traitLine = `Known: ${traits.filter(t => t.confidence >= 0.3).map(t => `"${t.trait}"`).join(', ')}`;
    if (currentTokens + estimateTokens(traitLine) < tokenBudget) {
      parts.push(traitLine);
      currentTokens += estimateTokens(traitLine);
    }
  }

  if (episodes.length > 0) {
    const ep = episodes[0];
    const timeAgo = formatTimeAgo(ep.timestamp);
    let epLine = `Recent (${timeAgo}): "${ep.trigger}" → "${ep.emotion}"`;
    if (ep.lesson) epLine += ` — "${ep.lesson}"`;
    if (currentTokens + estimateTokens(epLine) < tokenBudget) {
      parts.push(epLine);
      currentTokens += estimateTokens(epLine);
    }
  }

  if (suggestedCoping.length > 0) {
    const copingLine = `Helpful tools: ${suggestedCoping.join(', ')}`;
    if (currentTokens + estimateTokens(copingLine) < tokenBudget) {
      parts.push(copingLine);
      currentTokens += estimateTokens(copingLine);
    }
  }

  if (sessions.length > 0 && sessions[0].insight) {
    const insightLine = `Last insight: "${sessions[0].insight}"`;
    if (currentTokens + estimateTokens(insightLine) < tokenBudget) {
      parts.push(insightLine);
      currentTokens += estimateTokens(insightLine);
    }
  }

  if (patternWarning) {
    const warnLine = `Pattern: ${patternWarning}`;
    if (currentTokens + estimateTokens(warnLine) < tokenBudget) {
      parts.push(warnLine);
    }
  }

  return parts.join('\n');
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const hours = Math.floor(diff / (60 * 60 * 1000));
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}
