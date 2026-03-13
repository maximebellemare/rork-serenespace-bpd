import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ReminderDecision,
  SmartReminderState,
  FeatureUsageProfile,
  ReminderAnalyticsEvent,
} from '@/types/reminderRules';

import { FullNotificationSettings } from './notificationScheduler';
import { reminderDecisionEngine, buildRuleContext } from './reminderDecisionEngine';
import { notificationService } from './notificationService';
import { localEventStore } from '@/services/analytics/localEventStore';
import { premiumReminderEngine } from './premiumReminderEngine';
import { premiumIntentService } from '@/services/subscription/premiumIntentService';
import { PremiumReminderDecision } from '@/types/premiumReminder';
import { notificationExperimentService } from './notificationExperimentService';
import { notificationVariantResolver } from './notificationVariantResolver';


const STATE_KEY = 'bpd_smart_reminder_state';
const ANALYTICS_KEY = 'bpd_reminder_analytics';
const LAST_OPEN_KEY = 'bpd_last_app_open';
const DAY_MS = 24 * 60 * 60 * 1000;

const FEATURE_EVENT_MAP: Record<string, string> = {
  relationship_copilot_opened: 'relationship_copilot',
  relationship_copilot_completed: 'relationship_copilot',
  message_guard_opened: 'message_guard',
  message_rewrite: 'message_guard',
  ai_conversation_started: 'ai_companion',
  ai_conversation_completed: 'ai_companion',
  journal_entry_created: 'journal',
  identity_journal_opened: 'identity_journal',
  check_in_completed: 'check_in',
  crisis_mode_triggered: 'crisis',
  crisis_regulation_started: 'crisis_regulation',
  grounding_started: 'grounding',
  daily_ritual_completed: 'daily_ritual',
  weekly_reflection_viewed: 'weekly_reflection',
  therapy_report_viewed: 'therapy_report',
  emotional_loop_viewed: 'emotional_loops',
  message_simulator_used: 'scenario_simulator',
};

class SmartReminderEngine {
  private state: SmartReminderState = {
    lastEvaluationTime: 0,
    activeReminders: [],
    suppressedReminders: [],
    todayFiredCount: 0,
    todayFiredCategories: [],
    lastFiredTimestamp: null,
  };

  async initialize(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STATE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as SmartReminderState;
        const stateDate = new Date(parsed.lastEvaluationTime);
        const today = new Date();
        if (stateDate.getDate() !== today.getDate() ||
            stateDate.getMonth() !== today.getMonth() ||
            stateDate.getFullYear() !== today.getFullYear()) {
          this.state = {
            ...parsed,
            todayFiredCount: 0,
            todayFiredCategories: [],
            activeReminders: [],
            suppressedReminders: [],
          };
        } else {
          this.state = parsed;
        }
      }
      await premiumReminderEngine.initialize();
      await notificationExperimentService.initialize();
      console.log('[SmartReminderEngine] Initialized, today fired:', this.state.todayFiredCount);
    } catch (error) {
      console.error('[SmartReminderEngine] Init error:', error);
    }
  }

  private async persistState(): Promise<void> {
    try {
      await AsyncStorage.setItem(STATE_KEY, JSON.stringify(this.state));
    } catch (error) {
      console.error('[SmartReminderEngine] Persist error:', error);
    }
  }

  async recordAppOpen(): Promise<void> {
    await AsyncStorage.setItem(LAST_OPEN_KEY, String(Date.now()));
    console.log('[SmartReminderEngine] App open recorded');
  }

  async getLastAppOpenTime(): Promise<number | null> {
    const stored = await AsyncStorage.getItem(LAST_OPEN_KEY);
    return stored ? parseInt(stored, 10) : null;
  }

  async buildFeatureUsageProfile(): Promise<FeatureUsageProfile> {
    const events = await localEventStore.getEvents(500);
    const thirtyDaysAgo = Date.now() - 30 * DAY_MS;
    const recent = events.filter(e => e.timestamp > thirtyDaysAgo);

    const featureCounts: Record<string, number> = {};

    for (const event of recent) {
      const feature = FEATURE_EVENT_MAP[event.name];
      if (feature) {
        featureCounts[feature] = (featureCounts[feature] || 0) + 1;
      }
    }

    const sorted = Object.entries(featureCounts).sort(([, a], [, b]) => b - a);
    const [first, second] = sorted;

    let preferredFollowUpRoute: string | null = null;
    if (first) {
      switch (first[0]) {
        case 'journal':
        case 'identity_journal':
          preferredFollowUpRoute = '/check-in';
          break;
        case 'ai_companion':
          preferredFollowUpRoute = '/(tabs)/companion';
          break;
        case 'relationship_copilot':
          preferredFollowUpRoute = '/relationship-copilot';
          break;
        case 'grounding':
          preferredFollowUpRoute = '/guided-regulation';
          break;
        default:
          preferredFollowUpRoute = '/check-in';
      }
    }

    return {
      featureCounts,
      mostUsedFeature: first?.[0] ?? null,
      mostUsedFeatureCount: first?.[1] ?? 0,
      secondMostUsedFeature: second?.[0] ?? null,
      secondMostUsedFeatureCount: second?.[1] ?? 0,
      preferredFollowUpRoute,
    };
  }

  async extractContextFromEvents(params: {
    lastCheckInTime: number | null;
    lastJournalTime: number | null;
    currentDistress: number;
    highDistressToday: boolean;
    highDistressTimestamp: number | null;
    activeRelationshipContext: boolean;
    recentRewriteCount: number;
    isPremium: boolean;
  }): Promise<{
    recentDistressLevels: number[];
    hasFollowUpAfterDistress: boolean;
    recentRelationshipFlowCount: number;
    recentSpiralDetected: boolean;
    recentMessageGuardUsage: number;
    ritualCompletionsThisWeek: number;
    averageRitualCompletionsPerWeek: number;
    weeklyReflectionAvailable: boolean;
    weeklyReflectionViewed: boolean;
    lastWeeklyReflectionViewTime: number | null;
    lastRitualCompleteTime: number | null;
    daysSinceLastOpen: number;
  }> {
    const events = await localEventStore.getEvents(300);
    const now = Date.now();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const weekAgo = now - 7 * DAY_MS;

    const recentDistressLevels: number[] = [];
    let hasFollowUpAfterDistress = false;
    let recentRelationshipFlowCount = 0;
    let recentSpiralDetected = false;
    let recentMessageGuardUsage = 0;
    let ritualCompletionsThisWeek = 0;
    let weeklyReflectionViewed = false;
    let lastWeeklyReflectionViewTime: number | null = null;
    let lastRitualCompleteTime: number | null = null;

    for (const event of events) {
      if (event.timestamp < weekAgo) continue;

      if (event.name === 'check_in_completed' && event.properties?.intensity) {
        recentDistressLevels.push(Number(event.properties.intensity));
      }

      if (event.name === 'regulation_effectiveness') {
        recentDistressLevels.push(Number(event.properties?.distress_before ?? 0));
      }

      if (params.highDistressToday && event.timestamp > todayStart.getTime()) {
        if (event.name === 'check_in_completed' || event.name === 'journal_entry_created') {
          if (params.highDistressTimestamp && event.timestamp > params.highDistressTimestamp) {
            hasFollowUpAfterDistress = true;
          }
        }
      }

      if (event.name === 'relationship_copilot_opened' || event.name === 'relationship_copilot_completed') {
        recentRelationshipFlowCount++;
      }

      if (event.name === 'relationship_spiral_detected') {
        recentSpiralDetected = true;
      }

      if (event.name === 'message_guard_opened' || event.name === 'message_pause_used') {
        recentMessageGuardUsage++;
      }

      if (event.name === 'daily_ritual_completed') {
        ritualCompletionsThisWeek++;
        if (!lastRitualCompleteTime || event.timestamp > lastRitualCompleteTime) {
          lastRitualCompleteTime = event.timestamp;
        }
      }

      if (event.name === 'weekly_reflection_viewed') {
        weeklyReflectionViewed = true;
        if (!lastWeeklyReflectionViewTime || event.timestamp > lastWeeklyReflectionViewTime) {
          lastWeeklyReflectionViewTime = event.timestamp;
        }
      }
    }

    const lastOpen = await this.getLastAppOpenTime();
    const daysSinceLastOpen = lastOpen ? (now - lastOpen) / DAY_MS : 0;

    const dayOfWeek = new Date().getDay();
    const weeklyReflectionAvailable = dayOfWeek === 0 || dayOfWeek === 1;

    return {
      recentDistressLevels,
      hasFollowUpAfterDistress,
      recentRelationshipFlowCount,
      recentSpiralDetected,
      recentMessageGuardUsage,
      ritualCompletionsThisWeek,
      averageRitualCompletionsPerWeek: ritualCompletionsThisWeek,
      weeklyReflectionAvailable,
      weeklyReflectionViewed,
      lastWeeklyReflectionViewTime,
      lastRitualCompleteTime,
      daysSinceLastOpen,
    };
  }

  async evaluate(
    settings: FullNotificationSettings,
    params: {
      lastCheckInTime: number | null;
      lastJournalTime: number | null;
      currentDistress: number;
      highDistressToday: boolean;
      highDistressTimestamp: number | null;
      activeRelationshipContext: boolean;
      recentRewriteCount: number;
      isPremium: boolean;
    },
  ): Promise<{ active: ReminderDecision[]; suppressed: ReminderDecision[] }> {
    const featureUsage = await this.buildFeatureUsageProfile();
    const eventCtx = await this.extractContextFromEvents(params);
    const lastOpen = await this.getLastAppOpenTime();

    const ruleCtx = buildRuleContext({
      lastCheckInTime: params.lastCheckInTime,
      lastJournalTime: params.lastJournalTime,
      lastAppOpenTime: lastOpen,
      lastWeeklyReflectionViewTime: eventCtx.lastWeeklyReflectionViewTime,
      lastRitualCompleteTime: eventCtx.lastRitualCompleteTime,
      recentDistressLevels: eventCtx.recentDistressLevels,
      highDistressToday: params.highDistressToday,
      highDistressTimestamp: params.highDistressTimestamp,
      hasFollowUpAfterDistress: eventCtx.hasFollowUpAfterDistress,
      recentRelationshipFlowCount: eventCtx.recentRelationshipFlowCount,
      recentSpiralDetected: eventCtx.recentSpiralDetected,
      recentMessageGuardUsage: eventCtx.recentMessageGuardUsage,
      recentRewriteCount: params.recentRewriteCount,
      ritualCompletionsThisWeek: eventCtx.ritualCompletionsThisWeek,
      averageRitualCompletionsPerWeek: eventCtx.averageRitualCompletionsPerWeek,
      weeklyReflectionAvailable: eventCtx.weeklyReflectionAvailable,
      weeklyReflectionViewed: eventCtx.weeklyReflectionViewed,
      daysSinceLastOpen: eventCtx.daysSinceLastOpen,
      featureUsage,
      isPremium: params.isPremium,
      currentDistress: params.currentDistress,
      todayReminderCount: this.state.todayFiredCount,
      lastReminderTimestamp: this.state.lastFiredTimestamp,
      hasReengagedToday: lastOpen !== null && (Date.now() - lastOpen) < DAY_MS,
    });

    const result = reminderDecisionEngine.evaluateAll(ruleCtx, settings, this.state);

    this.state.lastEvaluationTime = Date.now();
    this.state.activeReminders = result.active;
    this.state.suppressedReminders = result.suppressed;
    await this.persistState();

    return result;
  }

  async fireReminder(
    decision: ReminderDecision,
    settings: FullNotificationSettings,
    currentDistress: number,
  ): Promise<string | null> {
    const resolved = notificationVariantResolver.resolve(decision.category, decision.personalizedCopy);
    const copy = { title: resolved.title, body: resolved.body };
    const delaySeconds = resolved.timingDelayOverride ?? decision.delaySeconds;

    const notifId = await notificationService.scheduleReminder(
      decision.category,
      copy.title,
      copy.body,
      Math.max(1, delaySeconds),
      false,
      { target_screen: decision.deepLink, rule_id: decision.ruleId },
      settings.quietHours,
      currentDistress,
    );

    if (notifId) {
      this.state.todayFiredCount++;
      this.state.todayFiredCategories.push(decision.category);
      this.state.lastFiredTimestamp = Date.now();
      await this.persistState();

      await this.trackReminderAnalytics({
        eventType: 'scheduled',
        category: decision.category,
        ruleId: decision.ruleId,
        priority: decision.priority,
        reason: decision.reason,
        targetScreen: decision.deepLink,
        safetyState: currentDistress >= 7 ? 'high_distress' : 'normal',
        isPremium: false,
        timeSinceLastOpen: 0,
        timestamp: Date.now(),
      });

      await notificationVariantResolver.trackSent(decision.category);
      console.log('[SmartReminderEngine] Fired:', decision.ruleId, '→', notifId, 'experiment:', resolved.experimentId, resolved.variantId);
    }

    return notifId;
  }

  async handleEventTriggered(eventName: string, properties?: Record<string, string | number | boolean>): Promise<void> {
    console.log('[SmartReminderEngine] Event triggered:', eventName);

    await premiumIntentService.recordIntentEvent(eventName, properties);

    switch (eventName) {
      case 'check_in_completed':
        await notificationService.cancelAllByCategory('daily_checkin');
        await notificationService.cancelAllByCategory('gentle_nudge');
        break;

      case 'daily_ritual_completed':
        await notificationService.cancelAllByCategory('ritual_reminder');
        break;

      case 'weekly_reflection_viewed':
        await notificationService.cancelAllByCategory('weekly_reflection');
        break;

      case 'crisis_mode_triggered':
      case 'crisis_regulation_started':
        await notificationService.cancelAllByCategory('reengagement');
        await notificationService.cancelAllByCategory('streak_support');
        await notificationService.cancelAllByCategory('premium_reflection');
        await notificationService.cancelAllByCategory('premium_upgrade');
        await premiumReminderEngine.handleSafetySuppression(
          `crisis_event: ${eventName}`,
        );
        break;

      case 'relationship_spiral_detected':
        await notificationService.cancelAllByCategory('premium_upgrade');
        await premiumReminderEngine.handleSafetySuppression(
          'relationship_spiral_detected',
        );
        break;

      case 'relationship_copilot_completed':
        break;

      case 'upgrade_screen_viewed':
        await premiumIntentService.recordUpgradeView();
        break;

      default:
        break;
    }
  }

  async evaluatePremiumReminders(
    settings: FullNotificationSettings,
    params: {
      currentDistress: number;
      highDistressToday: boolean;
      highDistressTimestamp: number | null;
      isPremium: boolean;
      recentCrisisMode: boolean;
      recentSpiralEvent: boolean;
    },
  ): Promise<{ fired: PremiumReminderDecision[]; suppressed: PremiumReminderDecision[] }> {
    const ctx = {
      isPremium: params.isPremium,
      currentDistress: params.currentDistress,
      highDistressToday: params.highDistressToday,
      highDistressTimestamp: params.highDistressTimestamp,
      recentCrisisMode: params.recentCrisisMode,
      recentSpiralEvent: params.recentSpiralEvent,
      premiumRemindersEnabled: settings.premiumInsightReminders,
      upgradeRemindersEnabled: settings.upgradeReminders,
      quietHours: settings.quietHours,
      frequency: settings.frequency,
    };

    const decisions = premiumReminderEngine.evaluate(ctx);
    const fired: PremiumReminderDecision[] = [];
    const suppressed: PremiumReminderDecision[] = [];

    for (const decision of decisions) {
      if (decision.shouldFire) {
        const notifId = await premiumReminderEngine.fireReminder(decision, ctx);
        if (notifId) {
          fired.push(decision);
        } else {
          suppressed.push(decision);
        }
      } else {
        suppressed.push(decision);
      }
    }

    console.log('[SmartReminderEngine] Premium evaluation:', fired.length, 'fired,', suppressed.length, 'suppressed');
    return { fired, suppressed };
  }

  async trackReminderAnalytics(event: ReminderAnalyticsEvent): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(ANALYTICS_KEY);
      const events: ReminderAnalyticsEvent[] = stored ? JSON.parse(stored) : [];
      const updated = [event, ...events].slice(0, 200);
      await AsyncStorage.setItem(ANALYTICS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('[SmartReminderEngine] Analytics persist error:', error);
    }
  }

  async getReminderAnalytics(limit: number = 50): Promise<ReminderAnalyticsEvent[]> {
    try {
      const stored = await AsyncStorage.getItem(ANALYTICS_KEY);
      const events: ReminderAnalyticsEvent[] = stored ? JSON.parse(stored) : [];
      return events.slice(0, limit);
    } catch {
      return [];
    }
  }

  getState(): SmartReminderState {
    return { ...this.state };
  }

  async resetState(): Promise<void> {
    this.state = {
      lastEvaluationTime: 0,
      activeReminders: [],
      suppressedReminders: [],
      todayFiredCount: 0,
      todayFiredCategories: [],
      lastFiredTimestamp: null,
    };
    await AsyncStorage.removeItem(STATE_KEY);
    await premiumReminderEngine.resetState();
    await premiumIntentService.clearSignals();
    console.log('[SmartReminderEngine] State reset');
  }

  getPremiumReminderState() {
    return premiumReminderEngine.getState();
  }

  async getPremiumReminderAnalytics(limit?: number) {
    return premiumReminderEngine.getAnalytics(limit);
  }
}

export const smartReminderEngine = new SmartReminderEngine();
