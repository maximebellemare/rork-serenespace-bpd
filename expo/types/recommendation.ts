export type RecommendationPriority = 'high' | 'medium' | 'low';

export type RecommendationCategory =
  | 'breathing'
  | 'grounding'
  | 'journaling'
  | 'self_soothing'
  | 'reality_check'
  | 'opposite_action'
  | 'message_pause'
  | 'ai_companion'
  | 'dbt_skill';

export interface CopingRecommendation {
  id: string;
  category: RecommendationCategory;
  title: string;
  message: string;
  route: string;
  icon: string;
  priority: RecommendationPriority;
  reason: string;
}

export interface RecommendationResult {
  recommendations: CopingRecommendation[];
  topRecommendation: CopingRecommendation | null;
  hasData: boolean;
}
