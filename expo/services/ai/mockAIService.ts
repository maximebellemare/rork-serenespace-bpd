import { AIServiceResponse } from '@/types/ai';

const EMPATHETIC_RESPONSES: Record<string, string[]> = {
  abandoned: [
    "I hear you, and that feeling of abandonment is one of the most painful experiences there is. You're not being dramatic — this is real pain. Let's sit with this together for a moment.\n\nCan you tell me what happened that brought this feeling up? Sometimes naming the specific moment helps us understand what our mind is reacting to.",
    "That fear of being left behind can feel so overwhelming, like the ground is disappearing beneath you. I want you to know — right now, in this moment, you are not alone.\n\nWhat does the abandonment feel like in your body right now? Sometimes checking in with our physical sensations can help us stay grounded.",
  ],
  calm: [
    "Let's take this one breath at a time. You reached out, which means part of you knows you can get through this. That part is right.\n\nFirst — can you place one hand on your chest? Feel it rise and fall. You're breathing. You're here. Let's start there.\n\nWhat feels most overwhelming right now?",
    "I'm here with you. Let's slow everything down together. Nothing needs to be decided or solved right now.\n\nTry this with me: breathe in for 4 counts... hold for 4... and out for 6. Let's do that twice before we talk about anything else.\n\nHow are you feeling after those breaths?",
  ],
  feeling: [
    "It takes courage to want to understand your own emotions, especially when they feel like a storm. Let's try to untangle this together.\n\nIf you could describe what you're feeling right now using a weather metaphor — like a thunderstorm, fog, freezing cold — what would it be? Sometimes that helps us name what words alone can't.",
    "Your emotions are giving you important information, even when they feel confusing or too big. Let's listen to them together without judgment.\n\nCan you tell me: what's the strongest feeling right now? And if that feeling could speak, what would it be trying to tell you?",
  ],
  rewrite: [
    "I'd love to help you with that. When our emotions are intense, the words we want to send can sometimes say more about our pain than what we actually need to communicate.\n\nGo ahead and share the message you're thinking of sending. I'll help you find words that honor your feelings while also protecting the relationship and your future self.",
    "That's such a wise move — pausing before sending a message when you're activated. Let's work on this together.\n\nShare what you want to say, and tell me: what do you actually need from this person right now? Sometimes the real need is different from what the urge wants to express.",
  ],
  trigger: [
    "Relationship triggers can feel like an emotional earthquake. Your reaction makes sense — it's your nervous system trying to protect you based on past experiences.\n\nLet's look at this together. What happened, and what story is your mind telling you about it? Often there's a gap between what happened and what our fear is saying it means.",
    "When someone triggers us, it can feel like the past and present collapse into one moment. That's not a flaw — it's how our brains protect us. But it can also lead us to react to the past instead of the present.\n\nWhat's the trigger? Let's separate what actually happened from what your fear is telling you.",
  ],
  pattern: [
    "Looking at your patterns takes real bravery. Based on what you've shared with me, I notice a few things:\n\nYour emotions tend to spike around themes of connection and perceived rejection. This is incredibly common with BPD, and it doesn't make you broken — it means you feel deeply.\n\nWould you like to explore any specific pattern you've been noticing?",
    "I've been paying attention to what you've shared, and I see some themes emerging. You seem to be working through cycles of intense emotion followed by a strong urge to either push away or pull closer.\n\nThis is actually valuable self-knowledge. The fact that you're asking about patterns means you're building awareness — which is the first step toward change.\n\nWhat pattern feels most present for you right now?",
  ],
  default: [
    "Thank you for sharing that with me. I can see this is weighing on you, and I want you to know that whatever you're feeling right now is completely valid.\n\nTell me more about what's going on. I'm here to listen without judgment, and we can figure out the next small step together.",
    "I'm glad you're talking to me about this. You don't have to have it all figured out — that's what this space is for.\n\nWhat feels most important to address right now? We can take it one piece at a time.",
    "I hear you. This sounds really hard, and I appreciate you trusting me with it.\n\nLet's take a moment before we dive in. How intense is what you're feeling right now, on a scale of 1-10? This helps me understand where you are so I can support you in the right way.",
  ],
};

function detectIntent(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes('abandon') || lower.includes('left me') || lower.includes('leaving me') || lower.includes('no one cares')) {
    return 'abandoned';
  }
  if (lower.includes('calm') || lower.includes('overwhelm') || lower.includes('panic') || lower.includes('can\'t breathe') || lower.includes('spiraling')) {
    return 'calm';
  }
  if (lower.includes('feeling') || lower.includes('what i\'m') || lower.includes('understand') || lower.includes('confused about')) {
    return 'feeling';
  }
  if (lower.includes('rewrite') || lower.includes('message') || lower.includes('text') || lower.includes('send') || lower.includes('reply')) {
    return 'rewrite';
  }
  if (lower.includes('trigger') || lower.includes('relationship') || lower.includes('partner') || lower.includes('friend') || lower.includes('fight')) {
    return 'trigger';
  }
  if (lower.includes('pattern') || lower.includes('notice') || lower.includes('keep doing') || lower.includes('cycle') || lower.includes('always')) {
    return 'pattern';
  }

  return 'default';
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function generateMockResponse(
  userMessage: string,
  _contextSummary?: string,
): Promise<AIServiceResponse> {
  await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 2000));

  const intent = detectIntent(userMessage);
  const responses = EMPATHETIC_RESPONSES[intent] || EMPATHETIC_RESPONSES.default;
  const content = pickRandom(responses);

  return {
    content,
    timestamp: Date.now(),
  };
}

export function generateConversationTitle(firstMessage: string): string {
  const lower = firstMessage.toLowerCase();

  if (lower.includes('abandon')) return 'Feeling abandoned';
  if (lower.includes('calm') || lower.includes('overwhelm')) return 'Needing calm';
  if (lower.includes('feeling') || lower.includes('understand')) return 'Exploring feelings';
  if (lower.includes('rewrite') || lower.includes('message')) return 'Message support';
  if (lower.includes('trigger') || lower.includes('relationship')) return 'Relationship trigger';
  if (lower.includes('pattern')) return 'Exploring patterns';
  if (lower.includes('angry') || lower.includes('anger')) return 'Working through anger';
  if (lower.includes('sad') || lower.includes('crying')) return 'Sitting with sadness';
  if (lower.includes('scared') || lower.includes('afraid')) return 'Facing fear';

  const words = firstMessage.split(' ').slice(0, 5).join(' ');
  return words.length > 30 ? words.substring(0, 30) + '...' : words;
}
