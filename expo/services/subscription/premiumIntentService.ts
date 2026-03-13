import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  PremiumIntentSignal,
  PremiumIntentProfile,
  PremiumReminderType,
} from '@/types/premiumReminder';

const INTENT_STORAGE_KEY = 'bpd_premium_intent_signals';
const UPGRADE_VIEW_KEY = 'bpd_last_upgrade_view';
const MAX_SIGNALS = 200;
const SIGNAL_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const EVENT_TO_INTENT_MAP: Record<string, { type: PremiumReminderType; feature: string }> = {
  weekly_reflection_locked: { type: 'weekly_reflection_depth', feature: 'weekly_reflection' },
  premium_gate_shown: { type: 'weekly_reflection_depth', feature: 'generic' },
  therapist_report_locked: { type: 'therapist_report_history', feature: 'therapist_report' },
  ai_limit_reached: { type: 'unlimited_ai_companion', feature: 'unlimited_ai' },
  premium_feature_attempted: { type: 'emotional_pattern_insight', feature: 'generic' },
  relationship_deep_insight_attempted: { type: 'relationship_intelligence', feature: 'relationship_analysis' },
  upgrade_screen_viewed: { type: 'weekly_reflection_depth', feature: 'upgrade_browse' },
};

class PremiumIntentService {
  private signals: PremiumIntentSignal[] = [];
  private lastUpgradeViewTime: number | null = null;
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const stored = await AsyncStorage.getItem(INTENT_STORAGE_KEY);
      if (stored) {
        const parsed: PremiumIntentSignal[] = JSON.parse(stored);
        const cutoff = Date.now() - SIGNAL_TTL_MS;
        this.signals = parsed.filter(s => s.timestamp > cutoff);
      }

      const upgradeTime = await AsyncStorage.getItem(UPGRADE_VIEW_KEY);
      if (upgradeTime) {
        this.lastUpgradeViewTime = parseInt(upgradeTime, 10);
      }

      this.initialized = true;
      console.log('[PremiumIntentService] Initialized with', this.signals.length, 'signals');
    } catch (error) {
      console.error('[PremiumIntentService] Init error:', error);
      this.initialized = true;
    }
  }

  async recordIntentEvent(
    eventName: string,
    properties?: Record<string, string | number | boolean>,
  ): Promise<void> {
    const mapping = EVENT_TO_INTENT_MAP[eventName];
    if (!mapping) return;

    let intentType = mapping.type;
    const feature = String(properties?.feature ?? mapping.feature);

    if (eventName === 'premium_feature_attempted' && properties?.feature) {
      const featureStr = String(properties.feature);
      if (featureStr.includes('relationship')) {
        intentType = 'relationship_intelligence';
      } else if (featureStr.includes('ai') || featureStr.includes('companion')) {
        intentType = 'unlimited_ai_companion';
      } else if (featureStr.includes('therapist') || featureStr.includes('report')) {
        intentType = 'therapist_report_history';
      } else if (featureStr.includes('reflection')) {
        intentType = 'weekly_reflection_depth';
      } else {
        intentType = 'emotional_pattern_insight';
      }
    }

    if (eventName === 'premium_gate_shown' && properties?.feature) {
      const featureStr = String(properties.feature);
      if (featureStr.includes('relationship')) {
        intentType = 'relationship_intelligence';
      } else if (featureStr.includes('ai')) {
        intentType = 'unlimited_ai_companion';
      } else if (featureStr.includes('therapist')) {
        intentType = 'therapist_report_history';
      }
    }

    const signal: PremiumIntentSignal = {
      type: intentType,
      eventName,
      timestamp: Date.now(),
      featureAttempted: feature,
      context: properties?.context ? String(properties.context) : undefined,
    };

    this.signals.push(signal);

    if (this.signals.length > MAX_SIGNALS) {
      this.signals = this.signals.slice(-MAX_SIGNALS);
    }

    await this.persist();
    console.log('[PremiumIntentService] Recorded intent:', intentType, 'from', eventName);
  }

  async recordUpgradeView(): Promise<void> {
    this.lastUpgradeViewTime = Date.now();
    await AsyncStorage.setItem(UPGRADE_VIEW_KEY, String(this.lastUpgradeViewTime));
    console.log('[PremiumIntentService] Upgrade view recorded');
  }

  buildIntentProfile(): PremiumIntentProfile {
    const now = Date.now();
    const recentCutoff = now - 14 * DAY_MS;
    const recentSignals = this.signals.filter(s => s.timestamp > recentCutoff);

    const intentByType: Record<PremiumReminderType, number> = {
      weekly_reflection_depth: 0,
      therapist_report_history: 0,
      unlimited_ai_companion: 0,
      relationship_intelligence: 0,
      emotional_pattern_insight: 0,
    };

    for (const signal of recentSignals) {
      intentByType[signal.type] = (intentByType[signal.type] || 0) + 1;
    }

    let strongestIntent: PremiumReminderType | null = null;
    let strongestIntentCount = 0;

    for (const [type, count] of Object.entries(intentByType) as Array<[PremiumReminderType, number]>) {
      if (count > strongestIntentCount) {
        strongestIntent = type;
        strongestIntentCount = count;
      }
    }

    const daysSinceLastUpgradeView = this.lastUpgradeViewTime
      ? (now - this.lastUpgradeViewTime) / DAY_MS
      : Infinity;

    const lastSignal = recentSignals.length > 0
      ? recentSignals[recentSignals.length - 1]
      : null;

    return {
      signals: recentSignals,
      totalSignalCount: recentSignals.length,
      strongestIntent,
      strongestIntentCount,
      lastUpgradeViewTime: this.lastUpgradeViewTime,
      daysSinceLastUpgradeView,
      lastIntentTime: lastSignal?.timestamp ?? null,
      hasRepeatedIntent: strongestIntentCount >= 2,
      intentByType,
    };
  }

  getLastIntentEvent(): string {
    if (this.signals.length === 0) return 'none';
    return this.signals[this.signals.length - 1].eventName;
  }

  async clearSignals(): Promise<void> {
    this.signals = [];
    await AsyncStorage.removeItem(INTENT_STORAGE_KEY);
    console.log('[PremiumIntentService] Signals cleared');
  }

  private async persist(): Promise<void> {
    try {
      await AsyncStorage.setItem(INTENT_STORAGE_KEY, JSON.stringify(this.signals));
    } catch (error) {
      console.error('[PremiumIntentService] Persist error:', error);
    }
  }
}

export const premiumIntentService = new PremiumIntentService();
