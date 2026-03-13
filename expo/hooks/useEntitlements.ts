import { useCallback, useMemo } from 'react';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { PremiumFeature } from '@/types/subscription';
import {
  canAccess as canAccessFeature,
  canAccessAI,
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
  } = useSubscription();

  const canAccess = useCallback((feature: PremiumFeature): boolean => {
    return canAccessFeature(feature, tier);
  }, [tier]);

  const canUseAI = useMemo(() => {
    return canAccessAI(dailyAIUsage, tier);
  }, [dailyAIUsage, tier]);

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
    aiLimitReached,
    remainingAIMessages,
    shouldPromptUpgrade,
    getReasonForUpgrade,
    lockedFeatures,
    getFeatureInfo,
    trackAIUsage,
  }), [
    isPremium,
    tier,
    canAccess,
    canUseAI,
    aiLimitReached,
    remainingAIMessages,
    shouldPromptUpgrade,
    getReasonForUpgrade,
    lockedFeatures,
    getFeatureInfo,
    trackAIUsage,
  ]);
}
