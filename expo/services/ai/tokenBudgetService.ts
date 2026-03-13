const CHARS_PER_TOKEN = 4;

export interface TokenBudget {
  maxTotalTokens: number;
  systemPromptBudget: number;
  conversationBudget: number;
  memoryBudget: number;
  contextBudget: number;
  reserveForResponse: number;
}

export interface TokenEstimate {
  systemPromptTokens: number;
  conversationTokens: number;
  memoryTokens: number;
  contextTokens: number;
  totalTokens: number;
  isOverBudget: boolean;
  overageTokens: number;
}

export type ModelTier = 'fast' | 'standard' | 'advanced';

const BUDGET_BY_TIER: Record<ModelTier, TokenBudget> = {
  fast: {
    maxTotalTokens: 2000,
    systemPromptBudget: 800,
    conversationBudget: 600,
    memoryBudget: 300,
    contextBudget: 300,
    reserveForResponse: 400,
  },
  standard: {
    maxTotalTokens: 4000,
    systemPromptBudget: 1500,
    conversationBudget: 1200,
    memoryBudget: 600,
    contextBudget: 700,
    reserveForResponse: 600,
  },
  advanced: {
    maxTotalTokens: 6000,
    systemPromptBudget: 2000,
    conversationBudget: 1800,
    memoryBudget: 1000,
    contextBudget: 1200,
    reserveForResponse: 800,
  },
};

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

export function getBudgetForTier(tier: ModelTier): TokenBudget {
  return BUDGET_BY_TIER[tier];
}

export function estimateRequestTokens(params: {
  systemPrompt: string;
  conversationMessages: Array<{ content: string }>;
  memoryNarrative: string;
  contextNarrative: string;
}): TokenEstimate {
  const systemPromptTokens = estimateTokens(params.systemPrompt);
  const conversationTokens = params.conversationMessages.reduce(
    (sum, msg) => sum + estimateTokens(msg.content),
    0,
  );
  const memoryTokens = estimateTokens(params.memoryNarrative);
  const contextTokens = estimateTokens(params.contextNarrative);
  const totalTokens = systemPromptTokens + conversationTokens + memoryTokens + contextTokens;

  const standardBudget = BUDGET_BY_TIER.standard;
  const maxAllowed = standardBudget.maxTotalTokens;

  return {
    systemPromptTokens,
    conversationTokens,
    memoryTokens,
    contextTokens,
    totalTokens,
    isOverBudget: totalTokens > maxAllowed,
    overageTokens: Math.max(0, totalTokens - maxAllowed),
  };
}

export function enforceTokenBudget(params: {
  systemPrompt: string;
  conversationMessages: Array<{ role: string; content: string }>;
  memoryNarrative: string;
  contextNarrative: string;
  tier: ModelTier;
}): {
  systemPrompt: string;
  conversationMessages: Array<{ role: string; content: string }>;
  memoryNarrative: string;
  contextNarrative: string;
  wasCompressed: boolean;
  originalTokens: number;
  finalTokens: number;
} {
  const budget = BUDGET_BY_TIER[params.tier];
  let { systemPrompt, conversationMessages, memoryNarrative, contextNarrative } = params;
  let wasCompressed = false;

  const originalTokens = estimateTokens(systemPrompt) +
    conversationMessages.reduce((s, m) => s + estimateTokens(m.content), 0) +
    estimateTokens(memoryNarrative) + estimateTokens(contextNarrative);

  if (estimateTokens(contextNarrative) > budget.contextBudget) {
    contextNarrative = truncateToTokenBudget(contextNarrative, budget.contextBudget);
    wasCompressed = true;
  }

  if (estimateTokens(memoryNarrative) > budget.memoryBudget) {
    memoryNarrative = truncateToTokenBudget(memoryNarrative, budget.memoryBudget);
    wasCompressed = true;
  }

  const convTokens = conversationMessages.reduce((s, m) => s + estimateTokens(m.content), 0);
  if (convTokens > budget.conversationBudget) {
    conversationMessages = trimConversationToBudget(conversationMessages, budget.conversationBudget);
    wasCompressed = true;
  }

  if (estimateTokens(systemPrompt) > budget.systemPromptBudget) {
    systemPrompt = truncateToTokenBudget(systemPrompt, budget.systemPromptBudget);
    wasCompressed = true;
  }

  const finalTokens = estimateTokens(systemPrompt) +
    conversationMessages.reduce((s, m) => s + estimateTokens(m.content), 0) +
    estimateTokens(memoryNarrative) + estimateTokens(contextNarrative);

  console.log('[TokenBudget] Budget enforcement:', {
    tier: params.tier,
    originalTokens,
    finalTokens,
    wasCompressed,
    maxAllowed: budget.maxTotalTokens,
  });

  return { systemPrompt, conversationMessages, memoryNarrative, contextNarrative, wasCompressed, originalTokens, finalTokens };
}

function truncateToTokenBudget(text: string, tokenBudget: number): string {
  const maxChars = tokenBudget * CHARS_PER_TOKEN;
  if (text.length <= maxChars) return text;

  const lines = text.split('\n');
  let result = '';
  for (const line of lines) {
    if ((result + line + '\n').length > maxChars) break;
    result += line + '\n';
  }

  return result.trim() || text.substring(0, maxChars);
}

function trimConversationToBudget(
  messages: Array<{ role: string; content: string }>,
  tokenBudget: number,
): Array<{ role: string; content: string }> {
  let totalTokens = messages.reduce((s, m) => s + estimateTokens(m.content), 0);

  const result = [...messages];
  while (totalTokens > tokenBudget && result.length > 2) {
    const removed = result.shift();
    if (removed) {
      totalTokens -= estimateTokens(removed.content);
    }
  }

  return result;
}
