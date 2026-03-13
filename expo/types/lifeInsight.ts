export interface LifeInsight {
  id: string;
  title: string;
  description: string;
  supportiveNote: string;
  suggestedAction: string;
  category: 'trigger' | 'relationship' | 'coping' | 'distress' | 'growth' | 'communication' | 'time_pattern' | 'emotional_loop';
  severity: 'gentle' | 'notable' | 'important';
  confidence: number;
  timestamp: number;
  viewed: boolean;
}

export interface WeeklySummary {
  id: string;
  weekLabel: string;
  generatedAt: number;
  periodStart: number;
  periodEnd: number;
  totalCheckIns: number;
  averageDistress: number;
  distressTrend: 'improving' | 'stable' | 'elevated' | 'insufficient';
  topTriggers: Array<{ label: string; count: number }>;
  topEmotions: Array<{ label: string; emoji: string; count: number }>;
  copingHighlight: string | null;
  growthSignals: string[];
  insights: LifeInsight[];
}

export interface LifeInsightReport {
  insights: LifeInsight[];
  weeklySummary: WeeklySummary | null;
  lastGenerated: number;
}
