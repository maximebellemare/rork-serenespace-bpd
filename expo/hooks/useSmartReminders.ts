import { useEffect, useCallback, useRef, useMemo } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useProfile } from '@/providers/ProfileProvider';
import { useEmotionalContext } from '@/providers/EmotionalContextProvider';
import { useApp } from '@/providers/AppProvider';
import { useAnalytics } from '@/providers/AnalyticsProvider';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { smartReminderEngine } from '@/services/notifications/smartReminderEngine';
import { FullNotificationSettings } from '@/services/notifications/notificationScheduler';
import { QuietHours } from '@/types/notifications';
import { SmartReminderState } from '@/types/reminderRules';

const EVAL_INTERVAL_MS = 15 * 60 * 1000;
const MIN_EVAL_GAP_MS = 5 * 60 * 1000;

export function useSmartReminders() {
  const { profile } = useProfile();
  const { activeContext } = useEmotionalContext();
  const { journalEntries } = useApp();
  const { trackEvent } = useAnalytics();
  const { isPremium } = useSubscription();
  const lastEvalRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initializedRef = useRef(false);

  const quietHours = useMemo<QuietHours>(() => ({
    enabled: profile.notifications.quietHoursEnabled,
    startTime: profile.notifications.quietHoursStart,
    endTime: profile.notifications.quietHoursEnd,
  }), [
    profile.notifications.quietHoursEnabled,
    profile.notifications.quietHoursStart,
    profile.notifications.quietHoursEnd,
  ]);

  const fullSettings = useMemo<FullNotificationSettings>(() => ({
    dailyCheckInReminder: profile.notifications.dailyCheckInReminder,
    checkInReminderTime: profile.notifications.checkInReminderTime,
    weeklyReflectionReminder: profile.notifications.weeklyReflectionReminder ?? profile.notifications.weeklyInsights,
    weeklyReflectionDay: profile.notifications.weeklyReflectionDay ?? 1,
    weeklyReflectionTime: profile.notifications.weeklyReflectionTime ?? '10:00',
    relationshipSupportReminders: profile.notifications.relationshipSupportReminders ?? profile.notifications.gentleNudges,
    regulationFollowUps: profile.notifications.regulationFollowUps ?? profile.notifications.gentleNudges,
    gentleNudges: profile.notifications.gentleNudges,
    ritualReminders: profile.notifications.ritualReminders ?? true,
    morningRitualTime: profile.notifications.morningRitualTime ?? '08:00',
    eveningRitualTime: profile.notifications.eveningRitualTime ?? '20:00',
    calmFollowups: profile.notifications.calmFollowups ?? true,
    premiumReflections: profile.notifications.premiumReflections ?? true,
    therapistReportReminder: profile.notifications.therapistReportReminder ?? true,
    reengagementReminders: profile.notifications.reengagementReminders ?? true,
    streakSupport: profile.notifications.streakSupport ?? true,
    quietHours,
    weekendReminders: profile.notifications.weekendReminders ?? true,
    frequency: profile.notifications.frequency ?? 'balanced',
  }), [profile.notifications, quietHours]);

  const buildEvalParams = useCallback(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEntries = journalEntries.filter(e => e.timestamp >= todayStart.getTime());
    const lastCheckInTime = todayEntries.length > 0 ? todayEntries[0].timestamp : null;
    const lastJournalTime = journalEntries.length > 0 ? journalEntries[0].timestamp : null;

    const recentHighDistress = todayEntries.find(e => e.checkIn.intensityLevel >= 7);

    return {
      lastCheckInTime,
      lastJournalTime,
      currentDistress: activeContext.latestIntensity,
      highDistressToday: activeContext.highDistressRecent,
      highDistressTimestamp: recentHighDistress?.timestamp ?? null,
      activeRelationshipContext: activeContext.activeRelationshipContext,
      recentRewriteCount: activeContext.recentRewriteCount,
      isPremium,
    };
  }, [journalEntries, activeContext, isPremium]);

  const runEvaluation = useCallback(async () => {
    const now = Date.now();
    if (now - lastEvalRef.current < MIN_EVAL_GAP_MS) {
      console.log('[useSmartReminders] Skipping eval — too soon');
      return;
    }
    lastEvalRef.current = now;

    try {
      const params = buildEvalParams();
      const result = await smartReminderEngine.evaluate(fullSettings, params);

      console.log('[useSmartReminders] Evaluation complete:', result.active.length, 'active,', result.suppressed.length, 'suppressed');

      for (const decision of result.active) {
        await smartReminderEngine.fireReminder(decision, fullSettings, params.currentDistress);

        trackEvent('notification_scheduled', {
          category: decision.category,
          rule_id: decision.ruleId,
          priority: decision.priority,
          reason: decision.reason,
          target_screen: decision.deepLink,
          safety_state: params.currentDistress >= 7 ? 'high_distress' : 'normal',
          is_premium: isPremium,
        });
      }

      for (const suppressed of result.suppressed) {
        trackEvent('notification_suppressed', {
          category: suppressed.category,
          rule_id: suppressed.ruleId,
          reason: suppressed.reason,
        });
      }
    } catch (error) {
      console.error('[useSmartReminders] Evaluation error:', error);
    }
  }, [buildEvalParams, fullSettings, trackEvent, isPremium]);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const init = async () => {
      await smartReminderEngine.initialize();
      await smartReminderEngine.recordAppOpen();
      await runEvaluation();
    };
    void init();
  }, [runEvaluation]);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    intervalRef.current = setInterval(() => {
      void runEvaluation();
    }, EVAL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [runEvaluation]);

  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        console.log('[useSmartReminders] App foregrounded — re-evaluating');
        void smartReminderEngine.recordAppOpen();
        void runEvaluation();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [runEvaluation]);

  const handleAnalyticsEvent = useCallback(async (eventName: string, properties?: Record<string, string | number | boolean>) => {
    await smartReminderEngine.handleEventTriggered(eventName, properties);

    if (eventName === 'check_in_completed' ||
        eventName === 'daily_ritual_completed' ||
        eventName === 'weekly_reflection_viewed' ||
        eventName === 'crisis_mode_triggered') {
      void runEvaluation();
    }
  }, [runEvaluation]);

  const getState = useCallback((): SmartReminderState => {
    return smartReminderEngine.getState();
  }, []);

  const getReminderAnalytics = useCallback(async (limit?: number) => {
    return smartReminderEngine.getReminderAnalytics(limit);
  }, []);

  const resetEngine = useCallback(async () => {
    await smartReminderEngine.resetState();
    console.log('[useSmartReminders] Engine reset');
  }, []);

  return {
    handleAnalyticsEvent,
    runEvaluation,
    getState,
    getReminderAnalytics,
    resetEngine,
    settings: fullSettings,
  };
}
