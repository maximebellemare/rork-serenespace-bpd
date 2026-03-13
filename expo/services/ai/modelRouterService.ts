import { ModelTier, estimateTokens } from './tokenBudgetService';
import { EmotionalState } from '@/types/companionMemory';

export interface ModelRoutingDecision {
  tier: ModelTier;
  reason: string;
  maxResponseTokens: number;
}

interface RoutingContext {
  userMessage: string;
  conversationLength: number;
  emotionalState: EmotionalState;
  hasRelationshipContext: boolean;
  isFollowUp: boolean;
  hasMemoryContext: boolean;
}

const COMPLEX_KEYWORDS = [
  'pattern', 'why do i', 'what do you notice', 'help me understand',
  'relationship', 'partner', 'always do this', 'never learn',
  'conflict', 'argument', 'fight', 'betrayal',
  'abandonment', 'rejection', 'splitting', 'identity',
  'therapy', 'therapist', 'medication', 'diagnosis',
];

const SIMPLE_KEYWORDS = [
  'yes', 'no', 'okay', 'thanks', 'thank you', 'got it',
  'hmm', 'maybe', 'i guess', 'sure', 'alright',
];

export function routeToModel(context: RoutingContext): ModelRoutingDecision {
  const { userMessage, conversationLength, emotionalState, hasRelationshipContext, hasMemoryContext } = context;
  const lower = userMessage.toLowerCase().trim();
  const messageTokens = estimateTokens(userMessage);

  if (emotionalState === 'high_distress') {
    return {
      tier: 'standard',
      reason: 'high_distress_requires_quality',
      maxResponseTokens: 300,
    };
  }

  if (SIMPLE_KEYWORDS.some(k => lower === k || lower === k + '.')) {
    return {
      tier: 'fast',
      reason: 'simple_acknowledgment',
      maxResponseTokens: 200,
    };
  }

  if (messageTokens < 10 && conversationLength > 2) {
    return {
      tier: 'fast',
      reason: 'short_followup_message',
      maxResponseTokens: 250,
    };
  }

  const complexityScore = calculateComplexity(lower, conversationLength, hasRelationshipContext, hasMemoryContext);

  if (complexityScore >= 6) {
    return {
      tier: 'advanced',
      reason: 'high_complexity_analysis',
      maxResponseTokens: 500,
    };
  }

  if (complexityScore >= 3) {
    return {
      tier: 'standard',
      reason: 'moderate_complexity',
      maxResponseTokens: 400,
    };
  }

  return {
    tier: 'fast',
    reason: 'low_complexity',
    maxResponseTokens: 250,
  };
}

function calculateComplexity(
  message: string,
  conversationLength: number,
  hasRelationshipContext: boolean,
  hasMemoryContext: boolean,
): number {
  let score = 0;

  const complexMatches = COMPLEX_KEYWORDS.filter(k => message.includes(k)).length;
  score += Math.min(complexMatches * 2, 4);

  if (message.length > 200) score += 1;
  if (message.length > 400) score += 1;

  if (message.includes('?') && message.split('?').length > 2) score += 1;

  if (hasRelationshipContext) score += 1;
  if (hasMemoryContext) score += 1;

  if (conversationLength > 8) score += 1;

  return score;
}

export function getResponseLengthInstruction(tier: ModelTier, emotionalState: EmotionalState): string {
  if (emotionalState === 'high_distress') {
    return 'Keep your response to 1-3 short sentences. Be brief and grounding.';
  }

  switch (tier) {
    case 'fast':
      return 'Keep your response concise: 2-4 sentences. One reflection, one insight or question.';
    case 'standard':
      return 'Respond in 3-6 sentences. Include reflection, insight, and a follow-up question or next step.';
    case 'advanced':
      return 'You may respond in 4-8 sentences if needed for depth. Include reflection, insight, pattern connection, and one question.';
  }
}
