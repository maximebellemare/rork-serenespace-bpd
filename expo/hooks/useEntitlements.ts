import { useCallback, useMemo } from 'react';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { PremiumFeature } from '@/types/subscription';
import {
  canAccess as canAccessFeature,
  canAccessAI,
  canAccessRewrite,
  shouldShowUpgradePrompt,
  getUpgradeReason,
  getLockedFeatures,
  getEntitlement,
  FeatureEntitlement,
} from '@/services/subscription/entitlementService';

export function useEntitlements() {
  const {
    tier,
    isPremium,
    dailyAIUsage,
    aiLimitReached,
    remainingAIMessages,
    trackAIUsage,
    dailyRewriteUsage,
    rewriteLimitReached,
    remainingRewrites,
    trackRewriteUsage,
  } = useSubscription();

  const canAccess = useCallback((feature: PremiumFeature): boolean => {
    return canAccessFeature(feature, tier);
  }, [tier]);

  const canUseAI = useMemo(() => {
    return canAccessAI(dailyAIUsage, tier);
  }, [dailyAIUsage, tier]);

  const canUseRewrite = useMemo(() => {
    return canAccessRewrite(dailyRewriteUsage, tier);
  }, [dailyRewriteUsage, tier]);

  const shouldPromptUpgrade = useCallback((
    feature: PremiumFeature,
    context?: { distressLevel?: number; isCrisis?: boolean }
  ): boolean => {
    return shouldShowUpgradePrompt(feature, tier, context);
  }, [tier]);

  const getReasonForUpgrade = useCallback((feature: PremiumFeature): string => {
    return getUpgradeReason(feature);
  }, []);

  const lockedFeatures = useMemo((): FeatureEntitlement[] => {
    return getLockedFeatures(tier);
  }, [tier]);

  const getFeatureInfo = useCallback((feature: PremiumFeature): FeatureEntitlement | undefined => {
    return getEntitlement(feature);
  }, []);

  return useMemo(() => ({
    isPremium,
    tier,
    canAccess,
    canUseAI,
    canUseRewrite,
    aiLimitReached,
    remainingAIMessages,
    rewriteLimitReached,
    remainingRewrites,
    shouldPromptUpgrade,
    getReasonForUpgrade,
    lockedFeatures,
    getFeatureInfo,
    trackAIUsage,
    trackRewriteUsage,
  }), [
    isPremium,
    tier,
    canAccess,
    canUseAI,
    canUseRewrite,
    aiLimitReached,
    remainingAIMessages,
    rewriteLimitReached,
    remainingRewrites,
    shouldPromptUpgrade,
    getReasonForUpgrade,
    lockedFeatures,
    getFeatureInfo,
    trackAIUsage,
    trackRewriteUsage,
  ]);
}
