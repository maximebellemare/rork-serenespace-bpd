export interface MessageUsageStats {
  totalRewrites: number;
  totalPauses: number;
  rewriteTypes: Record<string, number>;
  pauseSuccessRate: number;
  sentAfterRewrite: number;
  notSentAfterPause: number;
}

export interface MemoryProfile {
  topTriggers: PatternItem[];
  topEmotions: PatternItem[];
  topUrges: PatternItem[];
  copingToolsUsed: PatternItem[];
  relationshipPatterns: RelationshipPattern[];
  recentImprovements: Improvement[];
  recentCheckInCount: number;
  averageIntensity: number;
  intensityTrend: 'rising' | 'stable' | 'falling' | 'unknown';
  recentThemes: string[];
  lastCheckInDate: number | null;
  copingSuccessRate: number;
  mostEffectiveCoping: PatternItem | null;
  weeklyCheckInAvg: number;
  messageUsage: MessageUsageStats;
  supportiveSummary: string;
  relationshipPatternSummary: string;
  distressTrendDescription: string;
}

export interface PatternItem {
  label: string;
  count: number;
  percentage: number;
}

export interface RelationshipPattern {
  id: string;
  pattern: string;
  frequency: number;
  associatedTrigger: string;
  associatedEmotion: string;
}

export interface Improvement {
  id: string;
  area: string;
  description: string;
  metric: 'intensity' | 'frequency' | 'coping' | 'streak';
  change: number;
}

export interface MemoryInsight {
  id: string;
  category: 'trigger' | 'emotion' | 'coping' | 'relationship' | 'improvement' | 'pattern';
  icon: string;
  title: string;
  description: string;
  detail?: string;
  sentiment: 'positive' | 'neutral' | 'cautious';
}

export interface InsightCard {
  id: string;
  type: 'trigger' | 'emotion' | 'urge' | 'coping' | 'pattern' | 'message' | 'progress';
  title: string;
  description: string;
  value?: string;
  trend?: 'up' | 'down' | 'stable';
}
