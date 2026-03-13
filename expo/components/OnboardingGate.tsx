import { useEffect, useRef } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useOnboarding } from '@/providers/OnboardingProvider';

export default function OnboardingGate() {
  const { hasCompletedOnboarding, isLoading } = useOnboarding();
  const router = useRouter();
  const segments = useSegments();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (isLoading || hasRedirected.current) return;

    const isOnboardingScreen = segments.includes('onboarding' as never);

    if (!hasCompletedOnboarding && !isOnboardingScreen) {
      hasRedirected.current = true;
      console.log('[OnboardingGate] Redirecting to onboarding');
      setTimeout(() => {
        router.replace('/onboarding');
      }, 100);
    }
  }, [hasCompletedOnboarding, isLoading, segments, router]);

  return null;
}
