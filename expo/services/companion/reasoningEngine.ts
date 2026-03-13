import { AssembledContext } from './contextAssembler';
import { CompanionMode } from '@/types/companionModes';
import { EmotionalState } from '@/types/companionMemory';

export interface ReasoningOutput {
  userEmotion: string;
  userInterpretation: string;
  alternativeExplanations: string[];
  relevantPastContext: string;
  relationshipContext: string;
  bestApproach: string;
  suggestedQuestion: string;
  urgencyLevel: 'low' | 'moderate' | 'high' | 'crisis';
  responseGuidance: string;
}

export function performReasoning(params: {
  userMessage: string;
  conversationHistory: Array<{ role: string; content: string }>;
  assembledContext: AssembledContext;
  detectedMode: CompanionMode;
  emotionalState: EmotionalState;
}): ReasoningOutput {
  const { userMessage, conversationHistory, assembledContext, detectedMode, emotionalState } = params;
  const lower = userMessage.toLowerCase();

  console.log('[ReasoningEngine] Analyzing message:', userMessage.substring(0, 60), 'mode:', detectedMode, 'state:', emotionalState);

  const userEmotion = inferPrimaryEmotion(lower, emotionalState);
  const userInterpretation = inferUserInterpretation(lower, conversationHistory);
  const alternativeExplanations = generateAlternativeExplanations(lower, userInterpretation);
  const relevantPastContext = extractRelevantPastContext(assembledContext);
  const relationshipContext = extractRelationshipContext(lower, assembledContext);
  const urgencyLevel = assessUrgency(lower, emotionalState);
  const bestApproach = determineBestApproach(detectedMode, urgencyLevel, userEmotion, conversationHistory);
  const suggestedQuestion = generateSuggestedQuestion(detectedMode, userEmotion, conversationHistory);
  const responseGuidance = buildResponseGuidance({
    userEmotion,
    userInterpretation,
    alternativeExplanations,
    relevantPastContext,
    relationshipContext,
    urgencyLevel,
    bestApproach,
    suggestedQuestion,
    detectedMode,
    conversationHistory,
  });

  console.log('[ReasoningEngine] Reasoning complete - emotion:', userEmotion, 'urgency:', urgencyLevel, 'approach:', bestApproach);

  return {
    userEmotion,
    userInterpretation,
    alternativeExplanations,
    relevantPastContext,
    relationshipContext,
    bestApproach,
    suggestedQuestion,
    urgencyLevel,
    responseGuidance,
  };
}

function inferPrimaryEmotion(lower: string, emotionalState: EmotionalState): string {
  const emotionMap: Array<{ keywords: string[]; emotion: string }> = [
    { keywords: ['terrified', 'scared', 'afraid', 'fear', 'panic', 'dread'], emotion: 'fear' },
    { keywords: ['furious', 'rage', 'angry', 'pissed', 'hate', 'mad'], emotion: 'anger' },
    { keywords: ['ashamed', 'shame', 'pathetic', 'worthless', 'disgusted with myself'], emotion: 'shame' },
    { keywords: ['abandoned', 'left me', 'leaving', 'no one cares', 'alone', 'forgotten'], emotion: 'abandonment fear' },
    { keywords: ['sad', 'crying', 'hopeless', 'depressed', 'empty', 'numb', 'hollow'], emotion: 'sadness' },
    { keywords: ['anxious', 'anxiety', 'worry', 'nervous', 'on edge', 'restless'], emotion: 'anxiety' },
    { keywords: ['overwhelmed', 'too much', 'can\'t handle', 'drowning', 'spiraling'], emotion: 'overwhelm' },
    { keywords: ['confused', 'don\'t know', 'can\'t tell', 'mixed up', 'lost'], emotion: 'confusion' },
    { keywords: ['guilty', 'fault', 'shouldn\'t have', 'messed up', 'ruined'], emotion: 'guilt' },
    { keywords: ['jealous', 'jealousy', 'envious'], emotion: 'jealousy' },
    { keywords: ['hurt', 'pain', 'wounded', 'betrayed', 'broken'], emotion: 'emotional pain' },
  ];

  for (const { keywords, emotion } of emotionMap) {
    if (keywords.some(k => lower.includes(k))) return emotion;
  }

  if (emotionalState === 'high_distress') return 'intense distress';
  if (emotionalState === 'abandonment_fear') return 'abandonment fear';
  if (emotionalState === 'relationship_trigger') return 'relationship activation';
  if (emotionalState === 'emotional_overwhelm') return 'overwhelm';
  if (emotionalState === 'communication_anxiety') return 'communication anxiety';
  if (emotionalState === 'identity_confusion') return 'identity confusion';
  if (emotionalState === 'recent_conflict') return 'post-conflict distress';

  return 'unspecified emotional distress';
}

function inferUserInterpretation(lower: string, history: Array<{ role: string; content: string }>): string {
  if (lower.includes('they don\'t care') || lower.includes('doesn\'t care')) {
    return 'The user believes someone important to them does not care about them.';
  }
  if (lower.includes('my fault') || lower.includes('i ruined') || lower.includes('i messed up')) {
    return 'The user is blaming themselves for a situation.';
  }
  if (lower.includes('overreacting') || lower.includes('too much') || lower.includes('too sensitive')) {
    return 'The user is questioning whether their emotional response is valid.';
  }
  if (lower.includes('always') || lower.includes('never') || lower.includes('every time')) {
    return 'The user is using absolute thinking patterns, seeing this as part of a permanent pattern.';
  }
  if (lower.includes('hate myself') || lower.includes('worthless') || lower.includes('pathetic')) {
    return 'The user is directing intense negative judgment inward.';
  }
  if (lower.includes('no point') || lower.includes('nothing matters') || lower.includes('give up')) {
    return 'The user is experiencing hopelessness about their situation or future.';
  }
  if (lower.includes('can\'t trust') || lower.includes('everyone leaves') || lower.includes('always end up alone')) {
    return 'The user is generalizing a painful experience into a permanent belief about relationships.';
  }

  const recentUser = history.filter(m => m.role === 'user').slice(-3);
  if (recentUser.length > 1) {
    const allRecent = recentUser.map(m => m.content.toLowerCase()).join(' ');
    if (allRecent.includes('again') || allRecent.includes('keep happening')) {
      return 'The user sees a repeating pattern and may feel stuck in a cycle.';
    }
  }

  return 'The user is sharing an emotional experience and seeking support.';
}

function generateAlternativeExplanations(lower: string, _interpretation: string): string[] {
  const alternatives: string[] = [];

  if (lower.includes('they don\'t care') || lower.includes('doesn\'t care') || lower.includes('ignoring')) {
    alternatives.push('The other person may be dealing with their own stress or distractions unrelated to the user.');
    alternatives.push('A delayed response might reflect the person\'s communication style, not their feelings.');
  }

  if (lower.includes('my fault') || lower.includes('i ruined')) {
    alternatives.push('Conflict involves multiple people — responsibility is rarely entirely one-sided.');
    alternatives.push('Making a mistake in a difficult moment does not define the user as a person.');
  }

  if (lower.includes('overreacting') || lower.includes('too sensitive')) {
    alternatives.push('The intensity of the reaction may be proportional to past experiences, not just the current situation.');
    alternatives.push('Emotional sensitivity can also be a strength — it reflects deep capacity for feeling.');
  }

  if (lower.includes('always') || lower.includes('never') || lower.includes('every time')) {
    alternatives.push('When emotions are high, patterns can feel more absolute than they actually are.');
    alternatives.push('There may be exceptions to this pattern that are harder to see right now.');
  }

  if (alternatives.length === 0) {
    alternatives.push('There may be more to this situation than what is visible in the current emotional state.');
  }

  return alternatives.slice(0, 3);
}

function extractRelevantPastContext(assembled: AssembledContext): string {
  const parts: string[] = [];

  if (assembled.retrievedMemories) {
    const { relevantEpisodes, relevantTraits, suggestedCoping, patternWarning } = assembled.retrievedMemories;

    if (relevantEpisodes.length > 0) {
      const ep = relevantEpisodes[0];
      parts.push(`The user experienced a similar situation before (trigger: "${ep.trigger}", emotion: "${ep.emotion}"${ep.lesson ? `, lesson learned: "${ep.lesson}"` : ''}).`);
    }

    if (relevantTraits.length > 0) {
      const traitDescriptions = relevantTraits
        .filter(t => t.confidence >= 0.3)
        .slice(0, 3)
        .map(t => `"${t.trait}" (observed ${t.observationCount} times)`);
      if (traitDescriptions.length > 0) {
        parts.push(`Known user patterns: ${traitDescriptions.join(', ')}.`);
      }
    }

    if (suggestedCoping.length > 0) {
      parts.push(`Previously helpful coping tools: ${suggestedCoping.join(', ')}.`);
    }

    if (patternWarning) {
      parts.push(`Pattern alert: ${patternWarning}`);
    }
  }

  if (assembled.relevantInsights.length > 0) {
    const topInsight = assembled.relevantInsights[0];
    parts.push(`Relevant pattern insight: ${topInsight.narrative}`);
  }

  return parts.join(' ');
}

function extractRelationshipContext(lower: string, assembled: AssembledContext): string {
  const isRelationshipTopic = lower.includes('partner') || lower.includes('boyfriend') || lower.includes('girlfriend') ||
    lower.includes('husband') || lower.includes('wife') || lower.includes('friend') ||
    lower.includes('relationship') || lower.includes('text') || lower.includes('message') ||
    lower.includes('fight') || lower.includes('conflict') || lower.includes('abandon');

  if (!isRelationshipTopic) return '';

  const parts: string[] = ['This involves a relationship situation.'];

  if (assembled.profileNarrative) {
    if (assembled.profileNarrative.includes('abandonment-sensitive')) {
      parts.push('The user tends to be sensitive to abandonment cues.');
    }
    if (assembled.profileNarrative.includes('conflict-avoidant')) {
      parts.push('The user tends to avoid conflict, which may lead to suppressed needs.');
    }
    if (assembled.profileNarrative.includes('reassurance-seeking')) {
      parts.push('The user often seeks reassurance in relationships.');
    }
  }

  return parts.join(' ');
}

function assessUrgency(lower: string, emotionalState: EmotionalState): 'low' | 'moderate' | 'high' | 'crisis' {
  const crisisWords = ['want to die', 'kill myself', 'hurt myself', 'self harm', 'ending it', 'can\'t take it anymore'];
  if (crisisWords.some(w => lower.includes(w))) return 'crisis';

  if (emotionalState === 'high_distress') return 'high';

  const highUrgencyWords = ['spiraling', 'can\'t breathe', 'losing control', 'can\'t stop', 'falling apart', 'desperate'];
  if (highUrgencyWords.some(w => lower.includes(w))) return 'high';

  const moderateWords = ['overwhelmed', 'anxious', 'panicking', 'scared', 'angry', 'ashamed', 'confused'];
  if (moderateWords.some(w => lower.includes(w))) return 'moderate';

  return 'low';
}

function determineBestApproach(
  mode: CompanionMode,
  urgency: 'low' | 'moderate' | 'high' | 'crisis',
  emotion: string,
  history: Array<{ role: string; content: string }>,
): string {
  if (urgency === 'crisis') {
    return 'Ultra-short, grounding-first. Acknowledge pain. One breath at a time. Suggest crisis resources if needed.';
  }

  if (urgency === 'high') {
    return 'Short and grounding. Validate first. One concrete step. Do not overwhelm with questions.';
  }

  if (mode === 'calm') return 'Lead with grounding. Short, warm. Sensory anchoring. Minimal questions.';
  if (mode === 'reflection') return 'Curious and gentle. One thoughtful question. Name what you observe. Reference patterns softly.';
  if (mode === 'clarity') return 'Help separate feelings from facts. Organize confusion. Offer a simple framework.';
  if (mode === 'relationship') return 'Slow down urgency. Separate what happened from what fear predicts. Help with secure communication.';
  if (mode === 'action') return 'One clear, specific next step. Direct but kind. Practical and immediate.';
  if (mode === 'post_conflict_repair') return 'Acknowledge without blame. Process shame gently. One small repair action. Self-compassion first.';
  if (mode === 'insight_review') return 'Share observations from data. Use "I\'ve noticed" language. Connect patterns across time. Highlight growth.';
  if (mode === 'coaching') return 'Walk through a structured skill step by step. Keep each step short and actionable.';

  if (history.length > 8) {
    return 'This is a longer conversation. Consider summarizing or offering a next step. Avoid repetition.';
  }

  return 'Validate, explore, offer gentle guidance. Be conversational and genuine.';
}

function generateSuggestedQuestion(
  mode: CompanionMode,
  emotion: string,
  history: Array<{ role: string; content: string }>,
): string {
  if (mode === 'calm' || mode === 'high_distress') return '';

  if (mode === 'reflection') {
    if (emotion === 'abandonment fear') return 'What does this feeling remind you of?';
    if (emotion === 'anger') return 'Underneath the anger, is there something that feels hurt or unmet?';
    if (emotion === 'shame') return 'What would you say to someone you love who felt this way?';
    return 'What feels most alive in you right now?';
  }

  if (mode === 'clarity') {
    return 'If you could separate what happened from what your mind is telling you it means, what would each part look like?';
  }

  if (mode === 'relationship') {
    return 'What do you actually need from this person right now — the real need underneath the urgency?';
  }

  if (history.length > 6) {
    return 'What feels like the most important thing to take from this conversation?';
  }

  return 'What feels most urgent right now?';
}

function buildResponseGuidance(params: {
  userEmotion: string;
  userInterpretation: string;
  alternativeExplanations: string[];
  relevantPastContext: string;
  relationshipContext: string;
  urgencyLevel: string;
  bestApproach: string;
  suggestedQuestion: string;
  detectedMode: CompanionMode;
  conversationHistory: Array<{ role: string; content: string }>;
}): string {
  const parts: string[] = [];

  parts.push(`[REASONING ANALYSIS]`);
  parts.push(`Primary emotion detected: ${params.userEmotion}`);
  parts.push(`User's interpretation: ${params.userInterpretation}`);
  parts.push(`Urgency: ${params.urgencyLevel}`);
  parts.push(`Approach: ${params.bestApproach}`);

  if (params.alternativeExplanations.length > 0) {
    parts.push(`Alternative perspectives to gently offer: ${params.alternativeExplanations.join(' | ')}`);
  }

  if (params.relevantPastContext) {
    parts.push(`Relevant past context: ${params.relevantPastContext}`);
  }

  if (params.relationshipContext) {
    parts.push(`Relationship context: ${params.relationshipContext}`);
  }

  if (params.suggestedQuestion) {
    parts.push(`Suggested question: ${params.suggestedQuestion}`);
  }

  const userMsgCount = params.conversationHistory.filter(m => m.role === 'user').length;
  if (userMsgCount === 0) {
    parts.push('This is the first message. Prioritize warmth, validation, and showing you are listening deeply.');
  } else if (userMsgCount >= 4) {
    parts.push('This is a longer conversation. Avoid repeating earlier points. Build on what has been discussed. Consider offering a summary or insight.');
  }

  const lastAssistant = [...params.conversationHistory].reverse().find(m => m.role === 'assistant');
  if (lastAssistant) {
    const lastContent = lastAssistant.content.toLowerCase();
    if (lastContent.includes('breathe') || lastContent.includes('ground')) {
      parts.push('You just guided grounding. Check in on how they are feeling now rather than repeating grounding.');
    }
    if (lastContent.includes('?')) {
      parts.push('You asked a question in your last message. Engage with their answer before asking another question.');
    }
  }

  return parts.join('\n');
}

export function buildReasoningPromptSection(reasoning: ReasoningOutput): string {
  return reasoning.responseGuidance;
}
