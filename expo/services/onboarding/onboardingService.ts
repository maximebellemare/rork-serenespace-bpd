import { storageService } from '@/services/storage/storageService';
import { OnboardingProfile, DEFAULT_ONBOARDING_PROFILE } from '@/types/onboarding';

const ONBOARDING_KEY = 'bpd_onboarding_profile';

export async function loadOnboardingProfile(): Promise<OnboardingProfile> {
  const stored = await storageService.get<OnboardingProfile>(ONBOARDING_KEY);
  if (stored) {
    console.log('[OnboardingService] Loaded onboarding profile');
    return { ...DEFAULT_ONBOARDING_PROFILE, ...stored };
  }
  console.log('[OnboardingService] No onboarding profile found');
  return { ...DEFAULT_ONBOARDING_PROFILE };
}

export async function saveOnboardingProfile(profile: OnboardingProfile): Promise<OnboardingProfile> {
  await storageService.set(ONBOARDING_KEY, profile);
  console.log('[OnboardingService] Saved onboarding profile');
  return profile;
}

export async function clearOnboardingProfile(): Promise<void> {
  await storageService.remove(ONBOARDING_KEY);
  console.log('[OnboardingService] Cleared onboarding profile');
}

export function isOnboardingComplete(profile: OnboardingProfile): boolean {
  return profile.completedAt !== null || profile.skippedAt !== null;
}
