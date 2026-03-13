export type CopilotSituation =
  | 'no_reply'
  | 'cold_tone'
  | 'conflict'
  | 'rejected'
  | 'need_reassurance'
  | 'want_to_message'
  | 'spiraling'
  | 'shame_after_conflict'
  | 'other';

export type CopilotEmotion =
  | 'abandoned'
  | 'anxious'
  | 'hurt'
  | 'angry'
  | 'ashamed'
  | 'confused'
  | 'numb'
  | 'desperate'
  | 'panicked'
  | 'lonely';

export type CopilotUrge =
  | 'text_again'
  | 'call'
  | 'explain_myself'
  | 'apologize_too_much'
  | 'withdraw'
  | 'lash_out'
  | 'seek_reassurance'
  | 'check_their_activity'
  | 'send_long_message';

export type CopilotNeed =
  | 'clarity'
  | 'reassurance'
  | 'connection'
  | 'stop_spiraling'
  | 'protect_relationship'
  | 'protect_dignity'
  | 'avoid_making_worse'
  | 'feel_safe';

export interface CopilotSessionIntake {
  situation: CopilotSituation;
  emotions: CopilotEmotion[];
  strongestUrge: CopilotUrge;
  intensity: number;
  deepestNeed: CopilotNeed;
  relationshipProfileId?: string;
}

export interface CopilotInterpretation {
  whatMayBeHappening: string;
  whatUsuallyFollows: string;
}

export interface CopilotNextStep {
  id: string;
  label: string;
  description: string;
  icon: string;
  route?: string;
  type: 'pause' | 'grounding' | 'breathing' | 'companion' | 'simulate' | 'rewrite' | 'journal' | 'secure_message';
}

export interface CopilotSessionResult {
  interpretation: CopilotInterpretation;
  nextSteps: CopilotNextStep[];
  secureMessagePrompt: string;
  affirmation: string;
}

export interface CopilotSession {
  id: string;
  timestamp: number;
  intake: CopilotSessionIntake;
  result: CopilotSessionResult;
  relationshipProfileId?: string;
}

export const SITUATION_OPTIONS: { id: CopilotSituation; label: string; emoji: string }[] = [
  { id: 'no_reply', label: 'They stopped replying', emoji: '📱' },
  { id: 'cold_tone', label: 'Their tone changed', emoji: '❄️' },
  { id: 'conflict', label: 'We had conflict', emoji: '⚡' },
  { id: 'rejected', label: 'I feel rejected', emoji: '💔' },
  { id: 'need_reassurance', label: 'I need reassurance', emoji: '🫂' },
  { id: 'want_to_message', label: 'I want to send a message', emoji: '✉️' },
  { id: 'spiraling', label: "I'm spiraling about what this means", emoji: '🌀' },
  { id: 'shame_after_conflict', label: 'I feel ashamed after conflict', emoji: '😞' },
  { id: 'other', label: 'Something else', emoji: '💭' },
];

export const EMOTION_OPTIONS: { id: CopilotEmotion; label: string; emoji: string }[] = [
  { id: 'abandoned', label: 'Abandoned', emoji: '🥀' },
  { id: 'anxious', label: 'Anxious', emoji: '😰' },
  { id: 'hurt', label: 'Hurt', emoji: '💔' },
  { id: 'angry', label: 'Angry', emoji: '😤' },
  { id: 'ashamed', label: 'Ashamed', emoji: '😔' },
  { id: 'confused', label: 'Confused', emoji: '😵‍💫' },
  { id: 'numb', label: 'Numb', emoji: '😶' },
  { id: 'desperate', label: 'Desperate', emoji: '😫' },
  { id: 'panicked', label: 'Panicked', emoji: '😱' },
  { id: 'lonely', label: 'Lonely', emoji: '🫥' },
];

export const URGE_OPTIONS: { id: CopilotUrge; label: string; emoji: string }[] = [
  { id: 'text_again', label: 'Text again', emoji: '📲' },
  { id: 'call', label: 'Call them', emoji: '📞' },
  { id: 'explain_myself', label: 'Explain myself', emoji: '🗣️' },
  { id: 'apologize_too_much', label: 'Over-apologize', emoji: '🙏' },
  { id: 'withdraw', label: 'Withdraw completely', emoji: '🚪' },
  { id: 'lash_out', label: 'Lash out', emoji: '💥' },
  { id: 'seek_reassurance', label: 'Seek reassurance', emoji: '🫂' },
  { id: 'check_their_activity', label: 'Check their activity', emoji: '👀' },
  { id: 'send_long_message', label: 'Send a long message', emoji: '📜' },
];

export const NEED_OPTIONS: { id: CopilotNeed; label: string; emoji: string }[] = [
  { id: 'clarity', label: 'Clarity', emoji: '🔍' },
  { id: 'reassurance', label: 'Reassurance', emoji: '💛' },
  { id: 'connection', label: 'To feel connected', emoji: '🤝' },
  { id: 'stop_spiraling', label: 'To stop spiraling', emoji: '🧘' },
  { id: 'protect_relationship', label: 'Protect the relationship', emoji: '🛡️' },
  { id: 'protect_dignity', label: 'Protect my dignity', emoji: '👑' },
  { id: 'avoid_making_worse', label: 'Avoid making it worse', emoji: '🕊️' },
  { id: 'feel_safe', label: 'To feel safe', emoji: '🏡' },
];
