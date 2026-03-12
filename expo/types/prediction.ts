export type WarningLevel = 'none' | 'mild' | 'moderate' | 'elevated';

export type SuggestionType = 'grounding' | 'journaling' | 'message_pause' | 'ai_companion';

export interface EarlyWarningSuggestion {
  id: string;
  type: SuggestionType;
  title: string;
  description: string;
  route: string;
  icon: string;
}

export interface DetectedPattern {
  id: string;
  type: 'abandonment_trigger' | 'distress_rising' | 'emotional_messages' | 'relationship_conflict' | 'urge_frequency';
  label: string;
  description: string;
  severity: WarningLevel;
  dataPoints: number;
}

export interface EmotionalTrend {
  distressTrend: 'rising' | 'stable' | 'falling' | 'unknown';
  distressTrendValue: number;
  topTriggerThisWeek: string | null;
  topEmotionThisWeek: string | null;
  averageDistressThisWeek: number;
  checkInsThisWeek: number;
}

export interface EarlyWarningResult {
  warningLevel: WarningLevel;
  patterns: DetectedPattern[];
  suggestions: EarlyWarningSuggestion[];
  emotionalTrend: EmotionalTrend;
  message: string | null;
}
