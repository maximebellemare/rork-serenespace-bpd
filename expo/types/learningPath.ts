export interface LearningPathStep {
  id: string;
  lessonId: string;
  title: string;
  description: string;
  estimatedMinutes: number;
}

export interface LearningPath {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  color: string;
  steps: LearningPathStep[];
  suggestedToolIds: string[];
  tags: string[];
}

export interface LearningPathProgress {
  pathId: string;
  completedStepIds: string[];
  startedAt: number;
  lastActivityAt: number;
}

export interface LearningPathState {
  pathProgress: Record<string, LearningPathProgress>;
  activePathId: string | null;
}

export interface EmotionalPattern {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  description: string;
  howItWorks: string;
  commonTriggers: string[];
  whatItFeelsLike: string[];
  helpfulStrategies: string[];
  relatedToolIds: string[];
  relatedLessonIds: string[];
  reflectionQuestions: string[];
}

export interface LearningScenario {
  id: string;
  title: string;
  category: 'relationship' | 'emotional' | 'communication' | 'identity' | 'crisis';
  color: string;
  situation: string;
  interpretations: ScenarioInterpretation[];
  keyInsight: string;
  relatedPatternId: string;
  relatedToolIds: string[];
  relatedLessonIds: string[];
  reflectionPrompt: string;
}

export interface ScenarioInterpretation {
  id: string;
  label: string;
  thought: string;
  emotion: string;
  urge: string;
  outcome: string;
  isBalanced: boolean;
}

export interface WeeklyLearningInsight {
  id: string;
  weekStart: number;
  suggestedPathId: string | null;
  suggestedPatternIds: string[];
  suggestedLessonIds: string[];
  message: string;
  generatedAt: number;
}
