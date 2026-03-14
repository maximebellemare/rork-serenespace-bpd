export type InsightCategory =
  | 'emotional_escalation'
  | 'rejection_sensitivity'
  | 'abandonment_anxiety'
  | 'shame_cycles'
  | 'rumination'
  | 'interpretation_errors'
  | 'relationship_conflict'
  | 'impulsivity'
  | 'emotional_memory_bias'
  | 'self_compassion'
  | 'communication'
  | 'identity'
  | 'regulation'
  | 'mindfulness'
  | 'boundaries'
  | 'vulnerability'
  | 'trust'
  | 'grief'
  | 'anger'
  | 'numbness';

export interface DailyInsight {
  id: string;
  title: string;
  explanation: string;
  scenario: string;
  suggestedToolId: string;
  suggestedToolLabel: string;
  relatedPatternTags: InsightCategory[];
  relatedLessonIds: string[];
}

export type InsightFeedback = 'helpful' | 'not_relevant' | 'more_like_this';

export interface DailyInsightState {
  currentInsightId: string;
  dateStr: string;
  savedInsightIds: string[];
  feedback: Record<string, InsightFeedback>;
  viewedIds: string[];
  categoryPreferences: Partial<Record<InsightCategory, number>>;
}

export interface DailyInsightSelection {
  insight: DailyInsight;
  reason: string;
  isPatternTriggered: boolean;
  patternMessage?: string;
}

export interface WeeklyLearningSummary {
  id: string;
  weekStart: string;
  dominantThemes: InsightCategory[];
  suggestedInsightIds: string[];
  suggestedLessonIds: string[];
  message: string;
  generatedAt: number;
}
