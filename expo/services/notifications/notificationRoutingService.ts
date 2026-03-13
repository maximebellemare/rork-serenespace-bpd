import { NotificationCategory } from '@/types/notifications';
import {
  NotificationRoute,
  NotificationQuickAction,
  NotificationQuickActionConfig,
} from '@/types/notificationRouting';

const NOTIFICATION_ROUTES: NotificationRoute[] = [
  {
    category: 'daily_checkin',
    route: '/check-in',
    entryTitle: "Let's take a quick check-in.",
    entrySubtitle: 'A moment to notice how you feel right now.',
    quickActions: ['check_in_now', 'dismiss'],
    contextKeys: ['latestIntensity', 'latestEmotion'],
  },
  {
    category: 'weekly_reflection',
    route: '/weekly-reflection',
    entryTitle: 'Your reflection is ready.',
    entrySubtitle: 'A calm look back at your emotional week.',
    quickActions: ['view_reflection', 'dismiss'],
    contextKeys: ['recentCheckInCount'],
  },
  {
    category: 'ritual_reminder',
    route: '/daily-ritual',
    entryTitle: 'Time for your ritual.',
    entrySubtitle: 'A small moment of calm can shift your whole day.',
    quickActions: ['open_ritual', 'dismiss'],
    contextKeys: [],
  },
  {
    category: 'relationship_support',
    route: '/relationship-copilot',
    entryTitle: "Let's slow this down together.",
    entrySubtitle: 'A calmer approach to what feels intense right now.',
    quickActions: ['open_copilot', 'breathe', 'dismiss'],
    contextKeys: ['activeRelationshipContext', 'latestTrigger'],
  },
  {
    category: 'calm_followup',
    route: '/check-in',
    entryTitle: 'A quieter moment to look back.',
    entrySubtitle: 'Things felt intense earlier. How are you now?',
    quickActions: ['check_in_now', 'journal', 'dismiss'],
    contextKeys: ['highDistressRecent', 'latestIntensity'],
  },
  {
    category: 'regulation_followup',
    route: '/check-in',
    entryTitle: 'Checking in after the intensity.',
    entrySubtitle: 'You showed up for yourself. How are things now?',
    quickActions: ['check_in_now', 'breathe', 'dismiss'],
    contextKeys: ['highDistressRecent', 'latestIntensity'],
  },
  {
    category: 'premium_reflection',
    route: '/emotional-insights',
    entryTitle: 'A deeper look at your patterns.',
    entrySubtitle: 'Your emotional data reveals something worth noticing.',
    quickActions: ['reflect', 'dismiss'],
    contextKeys: [],
  },
  {
    category: 'therapist_report',
    route: '/therapy-report',
    entryTitle: 'Your therapist report is ready.',
    entrySubtitle: 'Bring this to your next session — it may help.',
    quickActions: ['view_report', 'dismiss'],
    contextKeys: [],
  },
  {
    category: 'reengagement',
    route: '/',
    entryTitle: 'Welcome back.',
    entrySubtitle: 'A calmer space is here whenever you need it.',
    quickActions: ['check_in_now', 'dismiss'],
    contextKeys: [],
  },
  {
    category: 'streak_support',
    route: '/check-in',
    entryTitle: 'Keep your rhythm.',
    entrySubtitle: 'A quick check-in keeps your self-awareness growing.',
    quickActions: ['check_in_now', 'dismiss'],
    contextKeys: [],
  },
  {
    category: 'gentle_nudge',
    route: '/check-in',
    entryTitle: 'Before the day ends.',
    entrySubtitle: 'Even a quick reflection can bring closure to your day.',
    quickActions: ['check_in_now', 'journal', 'dismiss'],
    contextKeys: [],
  },
];

export const QUICK_ACTION_CONFIGS: NotificationQuickActionConfig[] = [
  { id: 'check_in_now', label: 'Check in now', route: '/check-in', icon: 'Heart' },
  { id: 'reflect', label: 'Reflect', route: '/emotional-insights', icon: 'Sparkles' },
  { id: 'open_copilot', label: 'Open Copilot', route: '/relationship-copilot', icon: 'MessageCircle' },
  { id: 'breathe', label: 'Breathe', route: '/guided-regulation', icon: 'Wind' },
  { id: 'journal', label: 'Journal', route: '/check-in', icon: 'BookOpen' },
  { id: 'view_reflection', label: 'View Reflection', route: '/weekly-reflection', icon: 'Calendar' },
  { id: 'view_report', label: 'View Report', route: '/therapy-report', icon: 'FileText' },
  { id: 'open_ritual', label: 'Start Ritual', route: '/daily-ritual', icon: 'Flame' },
  { id: 'dismiss', label: 'Not now', route: '', icon: 'X' },
];

class NotificationRoutingService {
  getRouteForCategory(category: NotificationCategory): NotificationRoute | null {
    const route = NOTIFICATION_ROUTES.find(r => r.category === category);
    if (!route) {
      console.log('[NotificationRouting] No route found for category:', category);
      return null;
    }
    return route;
  }

  resolveRoute(
    category: NotificationCategory,
    data?: Record<string, string>,
  ): string {
    if (data?.target_screen) {
      console.log('[NotificationRouting] Using target_screen from data:', data.target_screen);
      return data.target_screen;
    }

    const routeConfig = this.getRouteForCategory(category);
    if (routeConfig) {
      return routeConfig.route;
    }

    console.log('[NotificationRouting] Falling back to check-in for:', category);
    return '/check-in';
  }

  resolveQuickAction(action: NotificationQuickAction): string {
    const config = QUICK_ACTION_CONFIGS.find(c => c.id === action);
    return config?.route ?? '/check-in';
  }

  getEntryState(
    category: NotificationCategory,
  ): { title: string; subtitle: string } {
    const route = this.getRouteForCategory(category);
    if (route) {
      return {
        title: route.entryTitle,
        subtitle: route.entrySubtitle,
      };
    }
    return {
      title: 'Welcome back.',
      subtitle: 'Support is here when you need it.',
    };
  }

  getQuickActionsForCategory(category: NotificationCategory): NotificationQuickActionConfig[] {
    const route = this.getRouteForCategory(category);
    if (!route) return [];

    return route.quickActions
      .filter(a => a !== 'dismiss')
      .map(actionId => QUICK_ACTION_CONFIGS.find(c => c.id === actionId))
      .filter((c): c is NotificationQuickActionConfig => c !== undefined);
  }

  shouldPrefillContext(category: NotificationCategory): boolean {
    const route = this.getRouteForCategory(category);
    return (route?.contextKeys.length ?? 0) > 0;
  }

  getContextKeysForCategory(category: NotificationCategory): string[] {
    const route = this.getRouteForCategory(category);
    return route?.contextKeys ?? [];
  }

  buildNotificationData(
    category: NotificationCategory,
    extras?: Record<string, string>,
  ): Record<string, string> {
    const route = this.resolveRoute(category);
    return {
      category,
      target_screen: route,
      notification_entry: 'true',
      ...extras,
    };
  }
}

export const notificationRoutingService = new NotificationRoutingService();
