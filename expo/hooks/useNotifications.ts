import { useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { notificationService } from '@/services/notifications/notificationService';
import { notificationScheduler } from '@/services/notifications/notificationScheduler';
import { useProfile } from '@/providers/ProfileProvider';
import { useEmotionalContext } from '@/providers/EmotionalContextProvider';
import { useApp } from '@/providers/AppProvider';
import { NotificationSettings } from '@/types/notifications';

export function useNotifications() {
  const router = useRouter();
  const { profile } = useProfile();
  const { activeContext } = useEmotionalContext();
  const { journalEntries } = useApp();
  const lastSyncRef = useRef<string>('');
  const contextCheckRef = useRef<number>(0);

  const dailyCheckInReminder = profile.notifications.dailyCheckInReminder;
  const checkInReminderTime = profile.notifications.checkInReminderTime;
  const weeklyReflectionReminder = profile.notifications.weeklyReflectionReminder ?? profile.notifications.weeklyInsights;
  const relationshipSupportReminders = profile.notifications.relationshipSupportReminders ?? profile.notifications.gentleNudges;
  const regulationFollowUps = profile.notifications.regulationFollowUps ?? profile.notifications.gentleNudges;
  const gentleNudges = profile.notifications.gentleNudges;

  const settings: NotificationSettings = {
    dailyCheckInReminder,
    checkInReminderTime,
    weeklyReflectionReminder,
    relationshipSupportReminders,
    regulationFollowUps,
    gentleNudges,
  };

  useEffect(() => {
    void notificationService.initialize();
  }, []);

  useEffect(() => {
    const currentSettings: NotificationSettings = {
      dailyCheckInReminder,
      checkInReminderTime,
      weeklyReflectionReminder,
      relationshipSupportReminders,
      regulationFollowUps,
      gentleNudges,
    };
    const settingsKey = JSON.stringify(currentSettings);
    if (settingsKey === lastSyncRef.current) return;
    lastSyncRef.current = settingsKey;

    void notificationScheduler.syncReminders(currentSettings);
    console.log('[useNotifications] Reminders synced with profile settings');
  }, [dailyCheckInReminder, checkInReminderTime, weeklyReflectionReminder, relationshipSupportReminders, regulationFollowUps, gentleNudges]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        const category = data?.category as string | undefined;

        console.log('[useNotifications] Notification tapped:', category);

        switch (category) {
          case 'daily_checkin':
          case 'gentle_nudge':
            router.push('/check-in' as never);
            break;
          case 'weekly_reflection':
            router.push('/weekly-reflection' as never);
            break;
          case 'regulation_followup':
            router.push('/check-in' as never);
            break;
          case 'relationship_support':
            router.push('/relationship-copilot' as never);
            break;
          default:
            break;
        }
      },
    );

    return () => {
      responseSubscription.remove();
    };
  }, [router]);

  useEffect(() => {
    const now = Date.now();
    if (now - contextCheckRef.current < 5 * 60 * 1000) return;
    contextCheckRef.current = now;

    if (activeContext.highDistressRecent && activeContext.latestIntensity >= 6) {
      void notificationScheduler.scheduleRegulationFollowUp(
        activeContext.latestIntensity,
        settings.regulationFollowUps,
      );
    }

    if (activeContext.activeRelationshipContext || activeContext.recentRewriteCount >= 2) {
      void notificationScheduler.scheduleRelationshipSupport(
        settings.relationshipSupportReminders,
        activeContext.activeRelationshipContext,
        activeContext.recentRewriteCount,
      );
    }
  }, [activeContext, settings.regulationFollowUps, settings.relationshipSupportReminders]);

  useEffect(() => {
    void notificationScheduler.scheduleEveningCheckInNudge(
      journalEntries,
      settings.dailyCheckInReminder,
    );
  }, [journalEntries, settings.dailyCheckInReminder]);

  const triggerRegulationFollowUp = useCallback((distressLevel: number) => {
    void notificationScheduler.scheduleRegulationFollowUp(
      distressLevel,
      settings.regulationFollowUps,
    );
  }, [settings.regulationFollowUps]);

  const triggerRelationshipSupport = useCallback(() => {
    void notificationScheduler.scheduleRelationshipSupport(
      settings.relationshipSupportReminders,
      true,
      0,
    );
  }, [settings.relationshipSupportReminders]);

  return {
    triggerRegulationFollowUp,
    triggerRelationshipSupport,
    settings,
  };
}
