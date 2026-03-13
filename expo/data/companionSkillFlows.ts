import { EmotionalState } from '@/types/companionMemory';

export interface GuidedFlowStep {
  promptText: string;
  reflectionQuestion?: string;
  isGrounding?: boolean;
  waitForResponse?: boolean;
}

export interface GuidedFlow {
  id: string;
  title: string;
  shortDescription: string;
  category: 'grounding' | 'urge_management' | 'relationship' | 'self_compassion' | 'reframing' | 'emotional_awareness' | 'communication' | 'crisis';
  estimatedMinutes: number;
  forStates: EmotionalState[];
  steps: GuidedFlowStep[];
  completionInsight: string;
  tags: string[];
}

export const GUIDED_FLOWS: GuidedFlow[] = [
  {
    id: 'flow_grounding_spike',
    title: 'Grounding When Emotions Spike',
    shortDescription: 'A quick anchor when everything feels too much',
    category: 'grounding',
    estimatedMinutes: 3,
    forStates: ['high_distress', 'emotional_overwhelm'],
    steps: [
      { promptText: 'Right now, emotions are running high. That is real and valid. Let us slow everything down to just this moment.', isGrounding: true },
      { promptText: 'Press your feet into the ground. Feel the pressure. You are here, in this room, right now.', isGrounding: true },
      { promptText: 'Name one thing you can see. Just one.', reflectionQuestion: 'What do you see?', waitForResponse: true },
      { promptText: 'Good. Now take one slow breath in... and let it out even slower.', isGrounding: true },
      { promptText: 'The intensity you felt a moment ago — has it shifted at all, even slightly?', reflectionQuestion: 'How does the intensity feel now?', waitForResponse: true },
    ],
    completionInsight: 'You practiced grounding during an emotional spike.',
    tags: ['grounding', 'distress', 'regulation'],
  },
  {
    id: 'flow_urge_surfing',
    title: 'Surfing the Urge',
    shortDescription: 'Ride the wave without acting on it',
    category: 'urge_management',
    estimatedMinutes: 4,
    forStates: ['high_distress', 'communication_anxiety', 'emotional_overwhelm'],
    steps: [
      { promptText: 'There is an urge pulling at you right now. That is okay. Urges are like waves — they rise, peak, and fall. You do not have to act on them.' },
      { promptText: 'What is the urge right now? What does it want you to do?', reflectionQuestion: 'Describe the urge.', waitForResponse: true },
      { promptText: 'Where do you feel it in your body? Chest? Stomach? Hands? Just notice it without judging.', reflectionQuestion: 'Where is it in your body?', waitForResponse: true },
      { promptText: 'Now imagine watching this urge like a wave. It is rising... it is peaking... and it will come down. Stay with it.', isGrounding: true },
      { promptText: 'Breathe slowly. The wave is moving. Has it shifted at all?', reflectionQuestion: 'Has anything changed?', waitForResponse: true },
    ],
    completionInsight: 'You practiced urge surfing — riding the wave without acting.',
    tags: ['urge_surfing', 'impulse', 'regulation'],
  },
  {
    id: 'flow_pause_before_message',
    title: 'Pause Before Sending',
    shortDescription: 'Create space between the urge and the send button',
    category: 'communication',
    estimatedMinutes: 3,
    forStates: ['communication_anxiety', 'relationship_trigger', 'recent_conflict'],
    steps: [
      { promptText: 'You want to send something. That makes sense. But the urgency you feel may not match what will actually help.' },
      { promptText: 'What are you actually feeling underneath the urge to message?', reflectionQuestion: 'Name the feeling.', waitForResponse: true },
      { promptText: 'What do you need most right now — reassurance, connection, to be heard, or something else?', reflectionQuestion: 'What do you need?', waitForResponse: true },
      { promptText: 'Will sending this message meet that need? Or could it create a new problem while emotions are high?' },
      { promptText: 'If you still want to send it, try writing it here first. Let it sit for 10 minutes before deciding.', reflectionQuestion: 'What would you want to say?', waitForResponse: true },
    ],
    completionInsight: 'You paused before sending an emotional message.',
    tags: ['pause', 'messaging', 'communication', 'relationship'],
  },
  {
    id: 'flow_abandonment_slowdown',
    title: 'When Abandonment Feels Real',
    shortDescription: 'Slow down the fear and find what is actually happening',
    category: 'reframing',
    estimatedMinutes: 5,
    forStates: ['abandonment_fear', 'relationship_trigger'],
    steps: [
      { promptText: 'Abandonment fear can feel absolutely certain. The pain is real even when the threat may not be. Let us slow this down together.' },
      { promptText: 'What happened that triggered this feeling? Just the facts, as simply as you can.', reflectionQuestion: 'What happened?', waitForResponse: true },
      { promptText: 'Now, what story is your mind telling you about what it means?', reflectionQuestion: 'What is the fear saying?', waitForResponse: true },
      { promptText: 'Is there another explanation? A simpler one, even if it does not feel as strong right now?', reflectionQuestion: 'What else could be true?', waitForResponse: true },
      { promptText: 'You have been through this feeling before and you are still here. This feeling will pass. What would you say to a friend who felt this way?', reflectionQuestion: 'What compassionate words come to mind?', waitForResponse: true },
    ],
    completionInsight: 'You worked through an abandonment trigger with more awareness.',
    tags: ['abandonment', 'reframing', 'relationship', 'fear'],
  },
  {
    id: 'flow_post_conflict_compassion',
    title: 'Self-Compassion After Conflict',
    shortDescription: 'Tend to yourself after things got hard',
    category: 'self_compassion',
    estimatedMinutes: 4,
    forStates: ['post_conflict_reflection', 'recent_conflict'],
    steps: [
      { promptText: 'After conflict, shame and self-blame often arrive fast. Before we look at what happened, let us take care of you first.' },
      { promptText: 'Place your hand gently on your chest if that feels comfortable. Feel the warmth.', isGrounding: true },
      { promptText: 'Say to yourself: "This was a hard moment. I am doing the best I can with what I have right now."' },
      { promptText: 'What happened is done. What matters now is: what do you need in this moment?', reflectionQuestion: 'What do you need right now?', waitForResponse: true },
      { promptText: 'Growth does not require perfection. The fact that you are here reflecting shows real strength.' },
    ],
    completionInsight: 'You practiced self-compassion after a conflict.',
    tags: ['self_compassion', 'conflict', 'repair', 'shame'],
  },
  {
    id: 'flow_emotional_spiral',
    title: 'Recognizing the Spiral',
    shortDescription: 'See the pattern before it takes over',
    category: 'emotional_awareness',
    estimatedMinutes: 4,
    forStates: ['emotional_overwhelm', 'high_distress', 'relationship_trigger'],
    steps: [
      { promptText: 'It feels like things are spiraling. That pattern is familiar and recognizable. Naming it is already a powerful step.' },
      { promptText: 'What was the first thing that triggered this spiral?', reflectionQuestion: 'What started it?', waitForResponse: true },
      { promptText: 'Then what happened inside? What emotion came first, and what followed?', reflectionQuestion: 'Describe the chain.', waitForResponse: true },
      { promptText: 'Spirals have a pattern: trigger, emotion, urge, action. You are here at the "noticing" stage. That means you are not fully inside it.' },
      { promptText: 'What is one small thing you could do right now that is different from the usual pattern?', reflectionQuestion: 'What could be different this time?', waitForResponse: true },
    ],
    completionInsight: 'You recognized an emotional spiral pattern.',
    tags: ['spiral', 'pattern', 'awareness', 'regulation'],
  },
  {
    id: 'flow_secure_communication',
    title: 'Preparing a Secure Response',
    shortDescription: 'Respond from a place of strength, not reactivity',
    category: 'communication',
    estimatedMinutes: 5,
    forStates: ['communication_anxiety', 'relationship_trigger', 'post_conflict_reflection'],
    steps: [
      { promptText: 'You need to respond to someone, and you want to do it well. That intention alone shows real growth.' },
      { promptText: 'What are you feeling right now about this situation?', reflectionQuestion: 'Name the feeling.', waitForResponse: true },
      { promptText: 'What do you want the other person to understand? Not what you want to say in the heat of the moment, but what you truly want them to know.', reflectionQuestion: 'What do you want them to understand?', waitForResponse: true },
      { promptText: 'Try framing it as: "I feel [emotion] when [situation] because [need]. What I need is [request]."', reflectionQuestion: 'Try writing it in that format.', waitForResponse: true },
      { promptText: 'Read it back slowly. Does it sound like the person you want to be? If not, what would you adjust?', reflectionQuestion: 'Any adjustments?', waitForResponse: true },
    ],
    completionInsight: 'You prepared a thoughtful, secure response.',
    tags: ['communication', 'secure', 'relationship', 'response'],
  },
  {
    id: 'flow_shame_recovery',
    title: 'Working Through Shame',
    shortDescription: 'When shame feels like it is swallowing you whole',
    category: 'self_compassion',
    estimatedMinutes: 5,
    forStates: ['post_conflict_reflection', 'identity_confusion', 'recent_conflict'],
    steps: [
      { promptText: 'Shame says you ARE the mistake. Guilt says you MADE a mistake. There is a world of difference. Let us sit with this gently.' },
      { promptText: 'What is the shame saying about you? Let it speak, even if it is harsh.', reflectionQuestion: 'What is shame telling you?', waitForResponse: true },
      { promptText: 'Now, imagine someone who cares about you deeply heard what shame just said. Would they agree? What would they say instead?', reflectionQuestion: 'What would they say?', waitForResponse: true },
      { promptText: 'Shame shrinks when it is spoken. You just did that. The feeling may still be there, but you are no longer alone with it.' },
      { promptText: 'What is one true thing about yourself that shame cannot take away?', reflectionQuestion: 'What is true about you?', waitForResponse: true },
    ],
    completionInsight: 'You faced shame and found something true about yourself.',
    tags: ['shame', 'self_compassion', 'identity', 'recovery'],
  },
  {
    id: 'flow_reframe_uncertainty',
    title: 'Sitting With Uncertainty',
    shortDescription: 'When you cannot know and that feels unbearable',
    category: 'reframing',
    estimatedMinutes: 4,
    forStates: ['communication_anxiety', 'abandonment_fear', 'emotional_overwhelm'],
    steps: [
      { promptText: 'Not knowing is one of the hardest feelings. Your mind wants certainty, but right now it cannot have it. That is painful.' },
      { promptText: 'What is the uncertainty about?', reflectionQuestion: 'What do you not know?', waitForResponse: true },
      { promptText: 'What is your mind doing with that uncertainty? Is it creating worst-case scenarios?', reflectionQuestion: 'What stories is your mind telling?', waitForResponse: true },
      { promptText: 'What if you could hold the uncertainty without needing to resolve it right now? Not forever — just for the next hour.' },
      { promptText: 'What is one thing within your control that you could focus on instead?', reflectionQuestion: 'What can you control?', waitForResponse: true },
    ],
    completionInsight: 'You practiced sitting with uncertainty without needing to resolve it immediately.',
    tags: ['uncertainty', 'reframing', 'anxiety', 'control'],
  },
  {
    id: 'flow_values_response',
    title: 'Responding From Your Values',
    shortDescription: 'Choose who you want to be in this moment',
    category: 'emotional_awareness',
    estimatedMinutes: 4,
    forStates: ['relationship_trigger', 'recent_conflict', 'communication_anxiety', 'post_conflict_reflection'],
    steps: [
      { promptText: 'When emotions are high, we often react from pain instead of from who we want to be. Let us reconnect with your values.' },
      { promptText: 'In this situation, who do you want to be? Not what you want to DO, but who do you want to BE?', reflectionQuestion: 'Who do you want to be?', waitForResponse: true },
      { promptText: 'What matters most to you in this relationship or situation?', reflectionQuestion: 'What matters most?', waitForResponse: true },
      { promptText: 'If you responded from that value instead of from the pain, what would be different?' },
      { promptText: 'You get to choose. Not perfectly, but intentionally. That is enough.', reflectionQuestion: 'What will you choose?', waitForResponse: true },
    ],
    completionInsight: 'You connected a difficult moment to your core values.',
    tags: ['values', 'identity', 'intentional', 'growth'],
  },
];

export function getFlowById(id: string): GuidedFlow | null {
  return GUIDED_FLOWS.find(f => f.id === id) ?? null;
}

export function getFlowsForState(state: EmotionalState): GuidedFlow[] {
  return GUIDED_FLOWS.filter(f => f.forStates.includes(state));
}

export function getFlowsByCategory(category: GuidedFlow['category']): GuidedFlow[] {
  return GUIDED_FLOWS.filter(f => f.category === category);
}

export function getRecommendedFlow(
  emotionalState: EmotionalState,
  recentFlowIds: string[],
): GuidedFlow | null {
  const matching = getFlowsForState(emotionalState);
  const notRecent = matching.filter(f => !recentFlowIds.includes(f.id));
  if (notRecent.length > 0) {
    return notRecent[Math.floor(Math.random() * notRecent.length)];
  }
  if (matching.length > 0) {
    return matching[Math.floor(Math.random() * matching.length)];
  }
  return null;
}
