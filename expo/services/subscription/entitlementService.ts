import { SubscriptionTier, PremiumFeature, FREE_DAILY_AI_LIMIT } from '@/types/subscription';

export type EntitlementCategory = 'free' | 'premium';

export interface FeatureEntitlement {
  feature: PremiumFeature;
  category: EntitlementCategory;
  label: string;
  description: string;
  freeLimit?: number;
  premiumLimit?: number | null;
}

export const FEATURE_ENTITLEMENTS: FeatureEntitlement[] = [
  {
    feature: 'unlimited_ai',
    category: 'premium',
    label: 'AI Companion',
    description: 'Unlimited conversations with your AI companion',
    freeLimit: FREE_DAILY_AI_LIMIT,
    premiumLimit: null,
  },
  {
    feature: 'relationship_analysis',
    category: 'premium',
    label: 'Advanced Relationship Insights',
    description: 'Deep relationship pattern analysis and intelligence',
  },
  {
    feature: 'relationship_copilot',
    category: 'premium',
    label: 'Relationship Copilot',
    description: 'Guided relationship-triggered distress support',
  },
  {
    feature: 'weekly_reflection',
    category: 'premium',
    label: 'Weekly Reflection History',
    description: 'Access past weekly reflections and trends',
  },
  {
    feature: 'therapist_report',
    category: 'premium',
    label: 'Therapist Report History',
    description: 'Save and review past therapist reports',
  },
  {
    feature: 'emotional_profile',
    category: 'premium',
    label: 'Emotional Pattern Intelligence',
    description: 'Long-term emotional pattern tracking and summaries',
  },
  {
    feature: 'emotional_timeline',
    category: 'premium',
    label: 'Emotional Timeline',
    description: 'Detailed emotional history and trend visualization',
  },
  {
    feature: 'predictive_insights',
    category: 'premium',
    label: 'Predictive Insights',
    description: 'Early pattern detection before escalation',
  },
  {
    feature: 'advanced_progress',
    category: 'premium',
    label: 'Advanced Progress Dashboard',
    description: 'Detailed metrics, trends, and growth tracking',
  },
  {
    feature: 'long_term_memory',
    category: 'premium',
    label: 'Long-Term AI Memory',
    description: 'AI remembers your patterns across sessions',
  },
  {
    feature: 'emotional_simulator',
    category: 'premium',
    label: 'Response Simulator',
    description: 'Explore different response outcomes before acting',
  },
  {
    feature: 'therapy_plan',
    category: 'premium',
    label: 'Adaptive Therapy Plans',
    description: 'Personalized weekly plans that evolve with you',
  },
  {
    feature: 'ai_summaries',
    category: 'premium',
    label: 'AI Summaries',
    description: 'AI-generated summaries of your emotional patterns',
  },
  {
    feature: 'reflection_mirror',
    category: 'premium',
    label: 'Reflection Mirror',
    description: 'Deep self-reflection with AI guidance',
  },
];

const FREE_FEATURES: Set<string> = new Set([
  'check_in',
  'journal',
  'basic_tools',
  'basic_ai',
  'crisis_support',
  'safety_mode',
  'basic_rewrite',
  'grounding',
  'breathing',
  'dbt_basics',
]);

export function canAccess(feature: PremiumFeature, tier: SubscriptionTier): boolean {
  if (tier === 'premium') return true;

  const entitlement = FEATURE_ENTITLEMENTS.find(e => e.feature === feature);
  if (!entitlement) {
    console.log('[EntitlementService] Unknown feature, defaulting to free:', feature);
    return true;
  }

  return entitlement.category === 'free';
}

export function canAccessAI(dailyUsage: number, tier: SubscriptionTier): boolean {
  if (tier === 'premium') return true;
  return dailyUsage < FREE_DAILY_AI_LIMIT;
}

export function isFreeFeature(featureKey: string): boolean {
  return FREE_FEATURES.has(featureKey);
}

export function getEntitlement(feature: PremiumFeature): FeatureEntitlement | undefined {
  return FEATURE_ENTITLEMENTS.find(e => e.feature === feature);
}

export function getUpgradeReason(feature: PremiumFeature): string {
  const entitlement = getEntitlement(feature);
  if (!entitlement) return 'Unlock this feature with Premium.';

  const reasons: Record<PremiumFeature, string> = {
    unlimited_ai: 'Upgrade for unlimited AI companion conversations.',
    relationship_analysis: 'Upgrade to unlock deeper relationship pattern insights.',
    relationship_copilot: 'Upgrade for guided relationship support during distress.',
    weekly_reflection: 'Upgrade to access your full weekly reflection history.',
    therapist_report: 'Upgrade to save and review past therapist reports.',
    emotional_profile: 'Upgrade for long-term emotional pattern intelligence.',
    emotional_timeline: 'Upgrade to see your detailed emotional timeline.',
    predictive_insights: 'Upgrade for early pattern detection and predictions.',
    advanced_progress: 'Upgrade for detailed progress metrics and growth tracking.',
    long_term_memory: 'Upgrade so your AI companion remembers your patterns.',
    emotional_simulator: 'Upgrade to explore different response outcomes.',
    therapy_plan: 'Upgrade for personalized adaptive therapy plans.',
    ai_summaries: 'Upgrade for AI-generated pattern summaries.',
    reflection_mirror: 'Upgrade for deep self-reflection with AI guidance.',
  };

  return reasons[feature] ?? entitlement.description;
}

export function shouldShowUpgradePrompt(
  feature: PremiumFeature,
  tier: SubscriptionTier,
  context?: { distressLevel?: number; isCrisis?: boolean }
): boolean {
  if (tier === 'premium') return false;

  if (context?.isCrisis || (context?.distressLevel !== undefined && context.distressLevel >= 8)) {
    console.log('[EntitlementService] Suppressing upgrade prompt during high distress/crisis');
    return false;
  }

  return !canAccess(feature, tier);
}

export function getPremiumFeaturesForTier(tier: SubscriptionTier): PremiumFeature[] {
  if (tier === 'premium') {
    return FEATURE_ENTITLEMENTS.map(e => e.feature);
  }
  return [];
}

export function getLockedFeatures(tier: SubscriptionTier): FeatureEntitlement[] {
  if (tier === 'premium') return [];
  return FEATURE_ENTITLEMENTS.filter(e => e.category === 'premium');
}
