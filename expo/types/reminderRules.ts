import { NotificationCategory } from './notifications';

export type ReminderPriority = 'critical_support' | 'high_value_support' | 'routine_support' | 'premium_insight' | 'reengagement';

export type ReminderRuleId =
  | 'daily_checkin'
  | 'calm_followup'
  | 'weekly_reflection_ready'
  | 'relationship_support'
  | 'ritual_habit'
  | 'reengagement';

export interface ReminderRuleContext {
  lastCheckInTime: number | null;
  lastJournalTime: number | null;
  lastAppOpenTime: number | null;
  lastWeeklyReflectionViewTime: number | null;
  lastRitualCompleteTime: number | null;
  recentDistressLevels: number[];
  highDistressToday: boolean;
  highDistressTimestamp: number | null;
  hasFollowUpAfterDistress: boolean;
  recentRelationshipFlowCount: number;
  recentSpiralDetected: boolean;
  recentMessageGuardUsage: number;
  recentRewriteCount: number;
  ritualCompletionsThisWeek: number;
  averageRitualCompletionsPerWeek: number;
  weeklyReflectionAvailable: boolean;
  weeklyReflectionViewed: boolean;
  daysSinceLastOpen: number;
  totalCoreFeatureUsageCount: number;
  mostUsedFeature: string | null;
  mostUsedFeatureCount: number;
  secondMostUsedFeature: string | null;
  isPremium: boolean;
  currentDistress: number;
  todayReminderCount: number;
  lastReminderTimestamp: number | null;
  hasReengagedToday: boolean;
}

export interface ReminderDecision {
  ruleId: ReminderRuleId;
  shouldFire: boolean;
  category: NotificationCategory;
  priority: ReminderPriority;
  priorityScore: number;
  delaySeconds: number;
  reason: string;
  deepLink: string;
  personalizedCopy?: {
    title: string;
    body: string;
  };
}

export interface ReminderRule {
  id: ReminderRuleId;
  category: NotificationCategory;
  priority: ReminderPriority;
  priorityScore: number;
  evaluate: (ctx: ReminderRuleContext) => ReminderDecision;
}

export interface SmartReminderState {
  lastEvaluationTime: number;
  activeReminders: ReminderDecision[];
  suppressedReminders: ReminderDecision[];
  todayFiredCount: number;
  todayFiredCategories: NotificationCategory[];
  lastFiredTimestamp: number | null;
}

export interface ReminderAnalyticsEvent {
  eventType: 'scheduled' | 'delivered' | 'opened' | 'dismissed' | 'converted' | 'suppressed';
  category: NotificationCategory;
  ruleId: ReminderRuleId;
  priority: ReminderPriority;
  reason: string;
  targetScreen: string;
  safetyState: string;
  isPremium: boolean;
  timeSinceLastOpen: number;
  timestamp: number;
}

export interface FeatureUsageProfile {
  featureCounts: Record<string, number>;
  mostUsedFeature: string | null;
  mostUsedFeatureCount: number;
  secondMostUsedFeature: string | null;
  secondMostUsedFeatureCount: number;
  preferredFollowUpRoute: string | null;
}
