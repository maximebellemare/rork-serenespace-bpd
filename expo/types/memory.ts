export interface MemoryProfile {
  topTriggers: PatternItem[];
  topEmotions: PatternItem[];
  topUrges: PatternItem[];
  copingToolsUsed: PatternItem[];
  recentCheckInCount: number;
  averageIntensity: number;
  intensityTrend: 'rising' | 'stable' | 'falling' | 'unknown';
  recentThemes: string[];
  lastCheckInDate: number | null;
}

export interface PatternItem {
  label: string;
  count: number;
  percentage: number;
}

export interface InsightCard {
  id: string;
  type: 'trigger' | 'emotion' | 'urge' | 'coping' | 'pattern';
  title: string;
  description: string;
  value?: string;
  trend?: 'up' | 'down' | 'stable';
}
