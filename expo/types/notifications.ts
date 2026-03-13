export type NotificationCategory =
  | 'daily_checkin'
  | 'weekly_reflection'
  | 'regulation_followup'
  | 'relationship_support'
  | 'gentle_nudge';

export interface ScheduledReminder {
  id: string;
  category: NotificationCategory;
  title: string;
  body: string;
  scheduledAt: number;
  repeating: boolean;
  data?: Record<string, string>;
}

export interface NotificationSettings {
  dailyCheckInReminder: boolean;
  checkInReminderTime: string;
  weeklyReflectionReminder: boolean;
  relationshipSupportReminders: boolean;
  regulationFollowUps: boolean;
  gentleNudges: boolean;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  dailyCheckInReminder: true,
  checkInReminderTime: '20:00',
  weeklyReflectionReminder: true,
  relationshipSupportReminders: true,
  regulationFollowUps: true,
  gentleNudges: true,
};

export interface NotificationEvent {
  id: string;
  category: NotificationCategory;
  title: string;
  body: string;
  sentAt: number;
  tapped: boolean;
  data?: Record<string, string>;
}
