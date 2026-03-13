import { CompanionPremiumGate } from '@/types/companionModes';
import { storageService } from '@/services/storage/storageService';
import { trackEvent } from '@/services/analytics/analyticsService';

const USAGE_KEY = 'bpd_companion_premium_usage';
const FREE_SESSION_LIMIT = 5;
const FREE_MEMORY_VIEW_LIMIT = 3;
const RESET_INTERVAL_MS = 24 * 60 * 60 * 1000;

interface PremiumUsage {
  sessionsToday: number;
  memoryViewsToday: number;
  insightViewsToday: number;
  lastResetAt: number;
}

async function loadUsage(): Promise<PremiumUsage> {
  try {
    const stored = await storageService.get<PremiumUsage>(USAGE_KEY);
    if (!stored) return createFreshUsage();
    if (Date.now() - stored.lastResetAt > RESET_INTERVAL_MS) {
      return createFreshUsage();
    }
    return stored;
  } catch {
    return createFreshUsage();
  }
}

async function saveUsage(usage: PremiumUsage): Promise<void> {
  try {
    await storageService.set(USAGE_KEY, usage);
  } catch (error) {
    console.log('[PremiumGate] Error saving usage:', error);
  }
}

function createFreshUsage(): PremiumUsage {
  return {
    sessionsToday: 0,
    memoryViewsToday: 0,
    insightViewsToday: 0,
    lastResetAt: Date.now(),
  };
}

export async function incrementSessionUsage(): Promise<void> {
  const usage = await loadUsage();
  usage.sessionsToday += 1;
  await saveUsage(usage);
  console.log('[PremiumGate] Session count:', usage.sessionsToday);
}

export async function incrementMemoryViewUsage(): Promise<void> {
  const usage = await loadUsage();
  usage.memoryViewsToday += 1;
  await saveUsage(usage);
}

export async function shouldShowPremiumGate(
  feature: string,
  isPremium: boolean,
): Promise<boolean> {
  if (isPremium) return false;

  const usage = await loadUsage();

  switch (feature) {
    case 'companion_session':
      return usage.sessionsToday >= FREE_SESSION_LIMIT;
    case 'memory_view':
      return usage.memoryViewsToday >= FREE_MEMORY_VIEW_LIMIT;
    case 'advanced_insights':
    case 'weekly_companion_insight':
    case 'deep_pattern_analysis':
    case 'session_summaries':
      return true;
    default:
      return false;
  }
}

export function getPremiumGateConfig(feature: string): CompanionPremiumGate {
  const configs: Record<string, CompanionPremiumGate> = {
    companion_session: {
      feature: 'companion_session',
      title: 'Unlimited Companion Sessions',
      description: 'Get unlimited conversations with your personalized AI companion for deeper support and better insights.',
      freeLimit: FREE_SESSION_LIMIT,
    },
    memory_view: {
      feature: 'memory_view',
      title: 'Full Emotional Memory',
      description: 'Access your complete emotional memory — past events, patterns, and the lessons your companion has learned about you.',
      freeLimit: FREE_MEMORY_VIEW_LIMIT,
    },
    advanced_insights: {
      feature: 'advanced_insights',
      title: 'Advanced Pattern Insights',
      description: 'Unlock deeper analysis of your emotional patterns, relationship cycles, and growth over time.',
    },
    weekly_companion_insight: {
      feature: 'weekly_companion_insight',
      title: 'Weekly Companion Insights',
      description: 'Get a personalized weekly emotional summary with actionable patterns and growth signals.',
    },
    deep_pattern_analysis: {
      feature: 'deep_pattern_analysis',
      title: 'Deep Pattern Analysis',
      description: 'See detailed trigger chains, emotion clusters, and long-term growth trajectories.',
    },
    session_summaries: {
      feature: 'session_summaries',
      title: 'Session Summaries',
      description: 'After meaningful conversations, get structured summaries you can review and share with your therapist.',
    },
  };

  return configs[feature] ?? {
    feature,
    title: 'Premium Feature',
    description: 'Unlock this feature for deeper emotional support and insight.',
  };
}

export async function trackPremiumGateEvent(
  feature: string,
  action: 'shown' | 'dismissed' | 'conversion_intent',
): Promise<void> {
  void trackEvent(`companion_premium_gate_${action}`, { feature });
}
