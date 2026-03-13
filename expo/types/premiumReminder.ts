import { NotificationCategory } from './notifications';

export type PremiumReminderType =
  | 'weekly_reflection_depth'
  | 'therapist_report_history'
  | 'unlimited_ai_companion'
  | 'relationship_intelligence'
  | 'emotional_pattern_insight';

export interface PremiumIntentSignal {
  type: PremiumReminderType;
  eventName: string;
  timestamp: number;
  featureAttempted: string;
  context?: string;
}

export interface PremiumIntentProfile {
  signals: PremiumIntentSignal[];
  totalSignalCount: number;
  strongestIntent: PremiumReminderType | null;
  strongestIntentCount: number;
  lastUpgradeViewTime: number | null;
  daysSinceLastUpgradeView: number;
  lastIntentTime: number | null;
  hasRepeatedIntent: boolean;
  intentByType: Record<PremiumReminderType, number>;
}

export interface PremiumReminderDecision {
  reminderType: PremiumReminderType;
  shouldFire: boolean;
  category: NotificationCategory;
  reason: string;
  delaySeconds: number;
  deepLink: string;
  upgradeAnchor: string;
  copy: {
    title: string;
    body: string;
  };
  safetyPassed: boolean;
  intentStrength: number;
}

export interface PremiumReminderState {
  lastFiredTime: number | null;
  lastFiredType: PremiumReminderType | null;
  firedCountThisWeek: number;
  weekStartTimestamp: number;
  suppressedCount: number;
  convertedCount: number;
}

export interface PremiumReminderAnalyticsEvent {
  eventType: 'scheduled' | 'opened' | 'dismissed' | 'converted' | 'suppressed_safety' | 'suppressed_frequency' | 'suppressed_no_intent';
  reminderType: PremiumReminderType;
  lastIntentEvent: string;
  safetyState: string;
  daysSinceLastUpgradeView: number;
  premiumStatus: boolean;
  timestamp: number;
}

export const PREMIUM_REMINDER_CONFIG: Record<PremiumReminderType, {
  label: string;
  notificationCategory: NotificationCategory;
  upgradeAnchor: string;
  deepLink: string;
  minIntentSignals: number;
  cooldownHours: number;
  maxPerWeek: number;
}> = {
  weekly_reflection_depth: {
    label: 'Weekly Reflection Depth',
    notificationCategory: 'premium_reflection',
    upgradeAnchor: 'weekly_reflection',
    deepLink: '/upgrade',
    minIntentSignals: 1,
    cooldownHours: 48,
    maxPerWeek: 1,
  },
  therapist_report_history: {
    label: 'Therapist Report History',
    notificationCategory: 'premium_reflection',
    upgradeAnchor: 'therapist_report',
    deepLink: '/upgrade',
    minIntentSignals: 1,
    cooldownHours: 72,
    maxPerWeek: 1,
  },
  unlimited_ai_companion: {
    label: 'Unlimited AI Companion',
    notificationCategory: 'premium_reflection',
    upgradeAnchor: 'unlimited_ai',
    deepLink: '/upgrade',
    minIntentSignals: 2,
    cooldownHours: 48,
    maxPerWeek: 1,
  },
  relationship_intelligence: {
    label: 'Relationship Intelligence',
    notificationCategory: 'premium_reflection',
    upgradeAnchor: 'relationship_analysis',
    deepLink: '/upgrade',
    minIntentSignals: 2,
    cooldownHours: 72,
    maxPerWeek: 1,
  },
  emotional_pattern_insight: {
    label: 'Emotional Pattern Insight',
    notificationCategory: 'premium_reflection',
    upgradeAnchor: 'emotional_profile',
    deepLink: '/upgrade',
    minIntentSignals: 2,
    cooldownHours: 72,
    maxPerWeek: 1,
  },
};

export const PREMIUM_REMINDER_COPY: Record<PremiumReminderType, Array<{ title: string; body: string }>> = {
  weekly_reflection_depth: [
    { title: 'Deeper reflection available', body: 'Your weekly reflection has more to show you.' },
    { title: 'Your week in more detail', body: 'Unlock fuller insight into this week\'s patterns.' },
  ],
  therapist_report_history: [
    { title: 'Your therapy insights', body: 'Want to keep a longer history of your therapy-style reports?' },
    { title: 'Report history', body: 'Track your progress across sessions with full report history.' },
  ],
  unlimited_ai_companion: [
    { title: 'Continue with deeper support', body: 'Your AI companion can offer more when you need it.' },
    { title: 'Unlimited support available', body: 'Continue with deeper AI guidance whenever you need it.' },
  ],
  relationship_intelligence: [
    { title: 'Relationship patterns', body: 'Unlock deeper relationship pattern insight and guidance.' },
    { title: 'Deeper relationship support', body: 'Advanced tools can help you understand relationship dynamics better.' },
  ],
  emotional_pattern_insight: [
    { title: 'Pattern insight available', body: 'Your emotional data reveals something worth noticing.' },
    { title: 'Emotional intelligence', body: 'Deeper pattern analysis can help you understand your responses.' },
  ],
};
