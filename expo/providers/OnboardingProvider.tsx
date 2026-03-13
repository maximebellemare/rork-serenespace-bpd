import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { OnboardingProfile, DEFAULT_ONBOARDING_PROFILE } from '@/types/onboarding';
import {
  loadOnboardingProfile,
  saveOnboardingProfile,
  isOnboardingComplete,
} from '@/services/onboarding/onboardingService';

export const [OnboardingProvider, useOnboarding] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [onboardingProfile, setOnboardingProfile] = useState<OnboardingProfile>(DEFAULT_ONBOARDING_PROFILE);

  const profileQuery = useQuery({
    queryKey: ['onboarding_profile'],
    queryFn: loadOnboardingProfile,
  });

  useEffect(() => {
    if (profileQuery.data) {
      setOnboardingProfile(profileQuery.data);
    }
  }, [profileQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (profile: OnboardingProfile) => saveOnboardingProfile(profile),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['onboarding_profile'] });
    },
  });

  const updateOnboarding = useCallback((updates: Partial<OnboardingProfile>) => {
    const updated = { ...onboardingProfile, ...updates };
    setOnboardingProfile(updated);
    saveMutation.mutate(updated);
  }, [onboardingProfile, saveMutation]);

  const completeOnboarding = useCallback((finalProfile: OnboardingProfile) => {
    const completed = { ...finalProfile, completedAt: Date.now() };
    setOnboardingProfile(completed);
    saveMutation.mutate(completed);
    console.log('[OnboardingProvider] Onboarding completed');
  }, [saveMutation]);

  const skipOnboarding = useCallback(() => {
    const skipped = { ...onboardingProfile, skippedAt: Date.now() };
    setOnboardingProfile(skipped);
    saveMutation.mutate(skipped);
    console.log('[OnboardingProvider] Onboarding skipped');
  }, [onboardingProfile, saveMutation]);

  const hasCompletedOnboarding = useMemo(
    () => isOnboardingComplete(onboardingProfile),
    [onboardingProfile],
  );

  return useMemo(() => ({
    onboardingProfile,
    hasCompletedOnboarding,
    isLoading: profileQuery.isLoading,
    updateOnboarding,
    completeOnboarding,
    skipOnboarding,
  }), [
    onboardingProfile,
    hasCompletedOnboarding,
    profileQuery.isLoading,
    updateOnboarding,
    completeOnboarding,
    skipOnboarding,
  ]);
});
