import { generateText } from '@rork-ai/toolkit-sdk';
import { AIMode } from '@/types/aiModes';
import { CompanionMode } from '@/types/companionModes';
import { MemoryProfile } from '@/types/memory';
import { MemorySnapshot } from '@/types/userMemory';
import { EmotionalIntent } from '@/services/ai/aiResponseTemplates';
import { AssembledContext } from './contextAssembler';
import { ReasoningOutput, performReasoning, buildReasoningPromptSection } from './reasoningEngine';
import { buildCompanionSystemPrompt } from './companionPromptBuilder';
import { detectAIMode } from '@/services/ai/aiModeService';
import { detectEmotionalState } from './memoryService';
import { buildModeSystemPrompt } from '@/services/ai/aiResponseStrategy';

const QUICK_ACTIONS_BY_MODE: Record<CompanionMode, string[]> = {
  calm: ['Ground me', 'Safety mode'],
  reflection: ['Journal this', 'Show coping tools', 'Reflection'],
  clarity: ['Journal this', 'Slow this down'],
  relationship: ['Help me rewrite a message', 'Slow this down', 'Journal this'],
  action: ['Ground me', 'Show coping tools', 'Help me rewrite a message'],
  high_distress: ['Ground me', 'Safety mode'],
  post_conflict_repair: ['Journal this', 'Slow this down', 'Reflection'],
  insight_review: ['Journal this', 'Show coping tools'],
  coaching: ['Ground me', 'Show coping tools', 'Journal this'],
};

const INTENT_BY_MODE: Record<CompanionMode, EmotionalIntent> = {
  calm: 'calming',
  reflection: 'general',
  clarity: 'confused',
  relationship: 'relationship',
  action: 'general',
  high_distress: 'high_distress',
  post_conflict_repair: 'ashamed',
  insight_review: 'pattern',
  coaching: 'general',
};

export interface CompanionAIResponse {
  content: string;
  timestamp: number;
  intent: EmotionalIntent;
  quickActions: string[];
  activeMode: AIMode;
  reasoning: ReasoningOutput;
}

export interface CompanionAIRequestParams {
  userMessage: string;
  conversationHistory: Array<{ role: string; content: string }>;
  assembledContext: AssembledContext;
  detectedMode: CompanionMode;
  manualMode: AIMode | null;
  memoryProfile: MemoryProfile;
  memorySnapshot: MemorySnapshot | null;
}

function buildFullSystemPrompt(
  detectedMode: CompanionMode,
  assembledContext: AssembledContext,
  reasoning: ReasoningOutput,
  memoryProfile: MemoryProfile,
  activeMode: AIMode,
): string {
  const basePrompt = buildCompanionSystemPrompt(detectedMode, assembledContext);
  const modePrompt = buildModeSystemPrompt(activeMode);
  const reasoningSection = buildReasoningPromptSection(reasoning);

  const personalContext = buildPersonalContextSection(memoryProfile);

  const parts = [
    basePrompt,
    '',
    modePrompt,
    '',
    reasoningSection,
  ];

  if (personalContext) {
    parts.push('');
    parts.push(personalContext);
  }

  parts.push('');
  parts.push(`CRITICAL RESPONSE RULES:
- Respond DIRECTLY to what the user said. Do NOT give a generic response.
- If the user shares a specific situation, respond to THAT situation specifically.
- If the user answers a question you asked, acknowledge their answer before moving on.
- Reference specific words or phrases the user used to show you are truly listening.
- Keep responses concise. 2-5 sentences for high distress, 3-8 sentences for normal conversation.
- Do NOT start every response with "I hear you" or "That makes sense" — vary your openings.
- Use the user's own language and emotional vocabulary when reflecting back.
- If you have memory context about this user, weave it in naturally — do not dump it.
- Never list multiple coping tools at once. Suggest ONE specific thing.
- Avoid ending every message with a question. Sometimes a reflection or validation is enough.
- Be specific, not generic. "That fear of being forgotten when they don't reply" is better than "That feeling of abandonment."
- When the user shares something vulnerable, sit with it before moving to solutions.`);

  return parts.join('\n');
}

function buildPersonalContextSection(memoryProfile: MemoryProfile): string {
  const parts: string[] = [];

  if (memoryProfile.topTriggers.length > 0) {
    parts.push(`User's known triggers: ${memoryProfile.topTriggers.slice(0, 3).map(t => t.label).join(', ')}`);
  }

  if (memoryProfile.topEmotions.length > 0) {
    parts.push(`Frequent emotions: ${memoryProfile.topEmotions.slice(0, 3).map(e => e.label).join(', ')}`);
  }

  if (memoryProfile.mostEffectiveCoping) {
    parts.push(`Most effective coping tool: "${memoryProfile.mostEffectiveCoping.label}"`);
  }

  if (memoryProfile.intensityTrend && memoryProfile.intensityTrend !== 'unknown') {
    parts.push(`Recent intensity trend: ${memoryProfile.intensityTrend}`);
  }

  if (memoryProfile.relationshipPatterns.length > 0) {
    parts.push(`Relationship patterns: ${memoryProfile.relationshipPatterns.slice(0, 2).map(p => p.pattern).join('; ')}`);
  }

  if (parts.length === 0) return '';
  return `[PERSONAL CONTEXT]\n${parts.join('\n')}`;
}

function buildConversationMessages(
  systemPrompt: string,
  conversationHistory: Array<{ role: string; content: string }>,
  userMessage: string,
): Array<{ role: 'user' | 'assistant'; content: string }> {
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  messages.push({
    role: 'user' as const,
    content: `[System context — do not repeat this to the user]\n${systemPrompt}\n[End system context]\n\nUser's message: ${conversationHistory.length === 0 ? userMessage : '(see conversation below)'}`,
  });

  messages.push({
    role: 'assistant' as const,
    content: 'I understand the context. I will respond as the companion, directly to the user.',
  });

  const recentHistory = conversationHistory.slice(-12);
  for (const msg of recentHistory) {
    messages.push({
      role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
      content: msg.content,
    });
  }

  if (conversationHistory.length > 0) {
    messages.push({
      role: 'user' as const,
      content: userMessage,
    });
  }

  return messages;
}

export async function generateCompanionResponse(
  params: CompanionAIRequestParams,
): Promise<CompanionAIResponse> {
  const {
    userMessage,
    conversationHistory,
    assembledContext,
    detectedMode,
    manualMode,
    memoryProfile,
  } = params;

  console.log('[CompanionAI] Generating response for:', userMessage.substring(0, 60));
  console.log('[CompanionAI] Mode:', detectedMode, 'manual:', manualMode);

  const emotionalState = detectEmotionalState(userMessage);

  const reasoning = performReasoning({
    userMessage,
    conversationHistory,
    assembledContext,
    detectedMode,
    emotionalState,
  });

  const modeDetection = detectAIMode({
    messageContent: userMessage,
    conversationHistory,
    averageIntensity: memoryProfile.averageIntensity,
    relationshipSignals: memoryProfile.topTriggers.some(t => t.label.toLowerCase().includes('relationship')),
  });

  const activeMode: AIMode = manualMode ?? modeDetection.mode;

  const systemPrompt = buildFullSystemPrompt(
    detectedMode,
    assembledContext,
    reasoning,
    memoryProfile,
    activeMode,
  );

  const messages = buildConversationMessages(systemPrompt, conversationHistory, userMessage);

  try {
    const content = await generateText({ messages });

    console.log('[CompanionAI] AI response generated, length:', content.length);

    const quickActions = selectQuickActions(detectedMode, reasoning);
    const intent = INTENT_BY_MODE[detectedMode] ?? 'general';

    return {
      content,
      timestamp: Date.now(),
      intent,
      quickActions,
      activeMode,
      reasoning,
    };
  } catch (error) {
    console.log('[CompanionAI] AI generation failed, falling back to contextual response:', error);
    return generateFallbackResponse(userMessage, detectedMode, reasoning, activeMode);
  }
}

function selectQuickActions(mode: CompanionMode, reasoning: ReasoningOutput): string[] {
  const baseActions = QUICK_ACTIONS_BY_MODE[mode] ?? ['Ground me', 'Journal this', 'Show coping tools'];

  if (reasoning.urgencyLevel === 'crisis') {
    return ['Ground me', 'Safety mode'];
  }

  if (reasoning.urgencyLevel === 'high') {
    return ['Ground me', 'Safety mode', 'Slow this down'];
  }

  if (reasoning.relationshipContext) {
    const relActions = ['Help me rewrite a message', 'Slow this down'];
    const merged = [...new Set([...relActions, ...baseActions])];
    return merged.slice(0, 3);
  }

  return baseActions.slice(0, 4);
}

function generateFallbackResponse(
  userMessage: string,
  mode: CompanionMode,
  reasoning: ReasoningOutput,
  activeMode: AIMode,
): CompanionAIResponse {
  console.log('[CompanionAI] Generating fallback response');

  let content: string;

  if (reasoning.urgencyLevel === 'crisis') {
    content = "I'm here with you right now. Let's take one breath together — in through your nose, slowly out through your mouth.\n\nYou don't have to handle everything in this moment. If you're in danger, please reach out to the 988 Suicide & Crisis Lifeline by calling or texting 988.";
  } else if (reasoning.urgencyLevel === 'high') {
    content = `I can feel how intense this is right now. Let's slow everything down.\n\nFirst, just notice your feet on the ground. Press them down gently. You're here, you're breathing.\n\nWhat feels like the most urgent thing right now?`;
  } else if (reasoning.userEmotion === 'abandonment fear') {
    content = `That fear of being left or forgotten — it's one of the most painful things to sit with. And it makes sense that you'd feel it right now.\n\nCan you tell me what specifically triggered this feeling? Sometimes naming the exact moment helps us see what our mind is reacting to.`;
  } else if (reasoning.userEmotion === 'shame') {
    content = `Shame is so heavy because it tells us we ARE the problem, not that we HAVE a problem. But that's the shame talking, not the truth.\n\nYou're here, sharing this — that takes real courage. What happened that brought this feeling up?`;
  } else if (mode === 'relationship') {
    content = `When relationships activate us, everything can feel urgent — like we need to act right now. But that urgency is usually the emotion talking, not the situation.\n\nLet's slow this down. What happened, and what is your mind telling you it means?`;
  } else {
    content = `I hear what you're sharing, and I want to make sure I understand it fully.\n\nWhat feels most important about what you just said? I want to focus on the part that matters most to you right now.`;
  }

  const quickActions = selectQuickActions(mode, reasoning);
  const intent = INTENT_BY_MODE[mode] ?? 'general';

  return {
    content,
    timestamp: Date.now(),
    intent,
    quickActions,
    activeMode,
    reasoning,
  };
}
