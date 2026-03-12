import { AIServiceResponse } from '@/types/ai';
import {
  EmotionalIntent,
  RESPONSE_TEMPLATES,
  HIGH_DISTRESS_KEYWORDS,
  FOLLOW_UP_RESPONSES,
} from './aiResponseTemplates';

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function detectHighDistress(message: string): boolean {
  const lower = message.toLowerCase();
  return HIGH_DISTRESS_KEYWORDS.some(keyword => lower.includes(keyword));
}

function detectIntent(message: string): EmotionalIntent {
  const lower = message.toLowerCase();

  if (detectHighDistress(message)) {
    return 'high_distress';
  }

  if (lower.includes('abandon') || lower.includes('left me') || lower.includes('leaving me') || lower.includes('no one cares') || lower.includes('don\'t care about me')) {
    return 'abandoned';
  }
  if (lower.includes('angry') || lower.includes('rage') || lower.includes('furious') || lower.includes('pissed') || lower.includes('hate them') || lower.includes('so mad')) {
    return 'angry';
  }
  if (lower.includes('anxious') || lower.includes('anxiety') || lower.includes('worry') || lower.includes('panic') || lower.includes('dread') || lower.includes('scared')) {
    return 'anxious';
  }
  if (lower.includes('ashamed') || lower.includes('shame') || lower.includes('embarrass') || lower.includes('pathetic') || lower.includes('worthless') || lower.includes('disgusted with myself')) {
    return 'ashamed';
  }
  if (lower.includes('confused') || lower.includes('don\'t know what i feel') || lower.includes('can\'t tell') || lower.includes('overreacting') || lower.includes('what am i feeling') || lower.includes('mixed up')) {
    return 'confused';
  }
  if (lower.includes('calm') || lower.includes('overwhelm') || lower.includes('slow down') || lower.includes('breathe') || lower.includes('spiraling') || lower.includes('too much')) {
    return 'calming';
  }
  if (lower.includes('rewrite') || lower.includes('help me text') || lower.includes('what should i say') || lower.includes('send this') || lower.includes('draft a message') || lower.includes('reply to')) {
    return 'rewrite';
  }
  if (lower.includes('trigger') || lower.includes('relationship') || lower.includes('partner') || lower.includes('friend') || lower.includes('fight') || lower.includes('conflict') || lower.includes('boyfriend') || lower.includes('girlfriend')) {
    return 'relationship';
  }
  if (lower.includes('pattern') || lower.includes('notice') || lower.includes('keep doing') || lower.includes('cycle') || lower.includes('always do this')) {
    return 'pattern';
  }
  if (lower.includes('feeling') || lower.includes('what i\'m') || lower.includes('understand') || lower.includes('what is this')) {
    return 'confused';
  }
  if (lower.includes('message') || lower.includes('text') || lower.includes('send') || lower.includes('reply') || lower.includes('not calm')) {
    return 'rewrite';
  }

  return 'general';
}

function detectConversationContext(
  messageHistory: Array<{ role: string; content: string }>,
  currentMessage: string,
): string | null {
  if (messageHistory.length < 2) return null;

  const lastAssistant = [...messageHistory].reverse().find(m => m.role === 'assistant');
  if (!lastAssistant) return null;

  const lower = currentMessage.toLowerCase();
  if (lower.includes('yes') || lower.includes('okay') || lower.includes('yeah') || lower.includes('sure') || lower.includes('please')) {
    if (lastAssistant.content.includes('ground') || lastAssistant.content.includes('breath')) {
      return 'after_grounding';
    }
    return 'after_venting';
  }

  if (currentMessage.length > 150) {
    return 'after_venting';
  }

  return null;
}

export interface MockResponseOptions {
  contextSummary?: string;
  conversationHistory?: Array<{ role: string; content: string }>;
}

export async function generateMockResponse(
  userMessage: string,
  _contextSummary?: string,
  options?: MockResponseOptions,
): Promise<AIServiceResponse & { intent: EmotionalIntent; quickActions: string[] }> {
  const delay = detectHighDistress(userMessage) ? 800 + Math.random() * 600 : 1200 + Math.random() * 1500;
  await new Promise(resolve => setTimeout(resolve, delay));

  const history = options?.conversationHistory ?? [];
  const contextType = detectConversationContext(history, userMessage);

  let content: string;
  let intent: EmotionalIntent;
  let quickActions: string[];

  if (contextType && FOLLOW_UP_RESPONSES[contextType]) {
    content = pickRandom(FOLLOW_UP_RESPONSES[contextType]);
    intent = 'general';
    quickActions = RESPONSE_TEMPLATES.general.quickActions ?? [];
  } else {
    intent = detectIntent(userMessage);
    const template = RESPONSE_TEMPLATES[intent];
    content = pickRandom(template.responses);
    quickActions = template.quickActions ?? [];
  }

  console.log('[MockAI] Detected intent:', intent, 'context:', contextType);

  return {
    content,
    timestamp: Date.now(),
    intent,
    quickActions,
  };
}

export function generateConversationTitle(firstMessage: string): string {
  const lower = firstMessage.toLowerCase();

  if (detectHighDistress(firstMessage)) return 'Moment of support';
  if (lower.includes('abandon')) return 'Feeling abandoned';
  if (lower.includes('calm') || lower.includes('overwhelm')) return 'Needing calm';
  if (lower.includes('feeling') || lower.includes('understand')) return 'Exploring feelings';
  if (lower.includes('rewrite') || lower.includes('message') || lower.includes('text')) return 'Message support';
  if (lower.includes('trigger') || lower.includes('relationship')) return 'Relationship trigger';
  if (lower.includes('pattern')) return 'Exploring patterns';
  if (lower.includes('angry') || lower.includes('anger') || lower.includes('rage')) return 'Working through anger';
  if (lower.includes('sad') || lower.includes('crying')) return 'Sitting with sadness';
  if (lower.includes('scared') || lower.includes('afraid') || lower.includes('anxious')) return 'Facing fear';
  if (lower.includes('ashamed') || lower.includes('shame')) return 'Working through shame';
  if (lower.includes('confused') || lower.includes('overreacting')) return 'Sorting through feelings';

  const words = firstMessage.split(' ').slice(0, 5).join(' ');
  return words.length > 30 ? words.substring(0, 30) + '...' : words;
}
