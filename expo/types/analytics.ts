export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, string | number | boolean>;
  timestamp: number;
}

export interface AnalyticsUserProperties {
  userId?: string;
  checkInCount?: number;
  journalStreak?: number;
  topTrigger?: string;
  appVersion?: string;
}
