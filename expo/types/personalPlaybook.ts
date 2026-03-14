export type EmotionalSituation =
  | 'rejected'
  | 'overwhelmed'
  | 'ashamed'
  | 'angry'
  | 'anxious'
  | 'lonely'
  | 'before-messaging'
  | 'after-conflict'
  | 'distress-spike'
  | 'numb';

export interface SituationCategory {
  id: EmotionalSituation;
  label: string;
  description: string;
  iconName: string;
  color: string;
  bgColor: string;
  keywords: string[];
}

export interface PersonalToolRecord {
  toolId: string;
  toolTitle: string;
  toolType: string;
  route: string;
  totalUses: number;
  helpfulCount: number;
  avgDistressReduction: number;
  situations: EmotionalSituation[];
  emotions: string[];
  lastUsed: number;
  pinned: boolean;
  effectivenessScore: number;
}

export interface ToolUsageLog {
  id: string;
  toolId: string;
  toolTitle: string;
  toolType: string;
  timestamp: number;
  emotion: string;
  situation: string;
  distressBefore: number;
  distressAfter: number;
  helpful: boolean | null;
  relationshipContext?: string;
  notes?: string;
}

export interface SituationRecommendation {
  situation: EmotionalSituation;
  tools: PersonalToolRecord[];
  insight?: string;
}

export interface PlaybookInsight {
  id: string;
  text: string;
  type: 'pattern' | 'effectiveness' | 'milestone' | 'suggestion';
  createdAt: number;
  situation?: EmotionalSituation;
  toolId?: string;
}

export interface PlaybookMilestone {
  id: string;
  label: string;
  description: string;
  achieved: boolean;
  achievedAt?: number;
  target: number;
  current: number;
}

export interface PlaybookStats {
  totalToolUses: number;
  toolsThisWeek: number;
  avgDistressReduction: number;
  streakDays: number;
  mostEffectiveTool: PersonalToolRecord | null;
  topSituation: EmotionalSituation | null;
}

export interface PersonalPlaybookData {
  tools: PersonalToolRecord[];
  usageLogs: ToolUsageLog[];
  insights: PlaybookInsight[];
  stats: PlaybookStats;
  milestones: PlaybookMilestone[];
  situationRecommendations: SituationRecommendation[];
  lastHelped: {
    situation: EmotionalSituation | null;
    tools: PersonalToolRecord[];
  } | null;
}
