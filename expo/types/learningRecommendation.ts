export type EmotionalSignal =
  | 'high_distress'
  | 'relationship_trigger'
  | 'abandonment_fear'
  | 'emotional_overwhelm'
  | 'communication_anxiety'
  | 'identity_confusion'
  | 'recent_conflict'
  | 'post_conflict_reflection'
  | 'crisis_recovery'
  | 'calm_growth'
  | 'self_worth_struggle'
  | 'trigger_awareness';

export type LearningTag =
  | 'abandonment'
  | 'communication'
  | 'relationship_conflict'
  | 'distress'
  | 'self_worth'
  | 'identity'
  | 'trigger_awareness'
  | 'emotional_regulation'
  | 'grounding'
  | 'coping_skills'
  | 'crisis'
  | 'mindfulness'
  | 'attachment'
  | 'self_compassion'
  | 'dbt_skills'
  | 'recovery'
  | 'daily_stability'
  | 'impulse_control';

export interface LearningRecommendation {
  lessonId: string;
  score: number;
  reason: string;
  signal: EmotionalSignal;
  contextLabel: string;
}

export interface LearningRecommendationResult {
  recommendations: LearningRecommendation[];
  topSignals: EmotionalSignal[];
  contextMessage: string;
}

export interface LearningHistoryEntry {
  lessonId: string;
  openedAt: number;
  completedAt: number | null;
  source: 'recommendation' | 'browse' | 'search' | 'post_event' | 'ai_companion';
  triggerContext: EmotionalSignal | null;
}

export interface LearningHistory {
  entries: LearningHistoryEntry[];
  lastRecommendationShown: number;
}

export interface PostEventSuggestion {
  lessonId: string;
  reason: string;
  flowSource: string;
}
