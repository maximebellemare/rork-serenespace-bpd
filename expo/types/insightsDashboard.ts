export interface DashboardTimeRange {
  label: string;
  days: number;
  key: 'week' | 'month' | 'all';
}

export interface DistressDataPoint {
  date: string;
  dayLabel: string;
  value: number;
  checkInCount: number;
}

export interface WeeklyMoodAverage {
  weekLabel: string;
  average: number;
  checkIns: number;
}

export interface EmotionFrequency {
  label: string;
  emoji: string;
  count: number;
  percentage: number;
  color: string;
}

export interface TriggerPattern {
  label: string;
  count: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
  color: string;
}

export interface UrgePattern {
  label: string;
  count: number;
  percentage: number;
  risk: 'low' | 'medium' | 'high';
}

export interface CopingEffectivenessItem {
  tool: string;
  timesUsed: number;
  avgDistressBefore: number;
  avgDistressAfter: number;
  reductionPercent: number;
}

export interface AISummaryCard {
  id: string;
  text: string;
  sentiment: 'encouraging' | 'gentle' | 'observational';
  icon: string;
}

export interface InsightsDashboardData {
  distressTrend: DistressDataPoint[];
  weeklyMoodAverages: WeeklyMoodAverage[];
  emotionDistribution: EmotionFrequency[];
  triggerPatterns: TriggerPattern[];
  urgePatterns: UrgePattern[];
  copingEffectiveness: CopingEffectivenessItem[];
  aiSummaries: AISummaryCard[];
  totalCheckIns: number;
  averageDistress: number;
  distressTrendDirection: 'rising' | 'stable' | 'falling' | 'unknown';
  journalStreak: number;
  messageRewriteCount: number;
  pauseCount: number;
}
