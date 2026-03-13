import { NotificationCategory } from './notifications';

export type NotificationQuickAction =
  | 'check_in_now'
  | 'reflect'
  | 'open_copilot'
  | 'breathe'
  | 'journal'
  | 'view_reflection'
  | 'view_report'
  | 'open_ritual'
  | 'dismiss';

export interface NotificationRoute {
  category: NotificationCategory;
  route: string;
  entryTitle: string;
  entrySubtitle: string;
  quickActions: NotificationQuickAction[];
  contextKeys: string[];
}

export interface NotificationQuickActionConfig {
  id: NotificationQuickAction;
  label: string;
  route: string;
  icon: string;
}

export interface NotificationEntryState {
  active: boolean;
  category: NotificationCategory | null;
  route: string | null;
  entryTitle: string | null;
  entrySubtitle: string | null;
  timestamp: number | null;
  notificationData: Record<string, string> | null;
  quickAction: NotificationQuickAction | null;
  sessionId: string | null;
}

export interface NotificationConversionEvent {
  sessionId: string;
  category: NotificationCategory;
  ruleId: string | null;
  targetRoute: string;
  quickAction: NotificationQuickAction | null;
  openedAt: number;
  flowStartedAt: number | null;
  flowCompletedAt: number | null;
  bouncedAt: number | null;
  distressBefore: number | null;
  distressAfter: number | null;
  outcome: 'completed' | 'bounced' | 'partial' | 'pending';
}

export const NOTIFICATION_ENTRY_INITIAL: NotificationEntryState = {
  active: false,
  category: null,
  route: null,
  entryTitle: null,
  entrySubtitle: null,
  timestamp: null,
  notificationData: null,
  quickAction: null,
  sessionId: null,
};
