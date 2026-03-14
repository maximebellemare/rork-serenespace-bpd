import {
  SupportCircle,
  SupportTopic,
  SupportPreferences,
  CommunityChallenge,
  TrustedContributor,
} from '@/types/community';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFERENCES_KEY = 'support_circle_preferences';

const TOPIC_TO_CIRCLE_TAGS: Record<SupportTopic, string[]> = {
  'relationship-triggers': ['relationships', 'attachment', 'communication'],
  'fear-of-rejection': ['rejection', 'abandonment', 'attachment'],
  'shame-recovery': ['shame', 'self-compassion', 'recovery'],
  'emotional-regulation': ['dbt', 'coping', 'regulation'],
  'communication-skills': ['communication', 'relationships', 'conflict'],
  'daily-stability': ['daily', 'check-in', 'routine'],
};

export function matchCirclesToPreferences(
  circles: SupportCircle[],
  preferences: SupportPreferences
): SupportCircle[] {
  if (preferences.topics.length === 0) return circles;

  const relevantTags = new Set<string>();
  for (const topic of preferences.topics) {
    const tags = TOPIC_TO_CIRCLE_TAGS[topic] ?? [];
    tags.forEach((t) => relevantTags.add(t));
  }

  const scored = circles.map((circle) => {
    let score = 0;
    for (const tag of circle.tags) {
      if (relevantTags.has(tag)) score += 2;
    }
    if (circle.isJoined) score += 3;
    score += Math.min(circle.memberCount / 100, 3);
    const hoursSinceActivity = (Date.now() - circle.recentActivity) / 3600000;
    if (hoursSinceActivity < 1) score += 2;
    else if (hoursSinceActivity < 6) score += 1;
    return { circle, score };
  });

  scored.sort((a, b) => b.score - a.score);
  console.log('[SupportMatching] Matched circles:', scored.map((s) => `${s.circle.name}(${s.score})`).join(', '));
  return scored.map((s) => s.circle);
}

export function getRecommendedCircles(
  circles: SupportCircle[],
  preferences: SupportPreferences,
  limit: number = 3
): SupportCircle[] {
  const notJoined = circles.filter((c) => !c.isJoined);
  const matched = matchCirclesToPreferences(notJoined, preferences);
  return matched.slice(0, limit);
}

export async function loadSupportPreferences(): Promise<SupportPreferences> {
  try {
    const raw = await AsyncStorage.getItem(PREFERENCES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SupportPreferences;
      console.log('[SupportMatching] Loaded preferences:', parsed.topics.length, 'topics');
      return parsed;
    }
  } catch (e) {
    console.log('[SupportMatching] Error loading preferences:', e);
  }
  return { topics: [], updatedAt: 0 };
}

export async function saveSupportPreferences(preferences: SupportPreferences): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
    console.log('[SupportMatching] Saved preferences:', preferences.topics.length, 'topics');
  } catch (e) {
    console.log('[SupportMatching] Error saving preferences:', e);
  }
}

export function identifyTrustedContributors(
  contributors: Array<{ userId: string; displayName: string; helpfulCount: number; positiveFeedback: number; activityStreak: number }>
): TrustedContributor[] {
  return contributors
    .filter((c) => c.helpfulCount >= 10 && c.positiveFeedback >= 5 && c.activityStreak >= 3)
    .map((c) => ({ ...c, badge: 'trusted-helper' as const }))
    .sort((a, b) => b.helpfulCount - a.helpfulCount);
}

export function getMatchingChallenges(
  challenges: CommunityChallenge[],
  preferences: SupportPreferences
): CommunityChallenge[] {
  if (preferences.topics.length === 0) return challenges;

  const relevantTags = new Set<string>();
  for (const topic of preferences.topics) {
    const tags = TOPIC_TO_CIRCLE_TAGS[topic] ?? [];
    tags.forEach((t) => relevantTags.add(t));
  }

  const scored = challenges.map((challenge) => {
    let score = 0;
    for (const tag of challenge.tags) {
      if (relevantTags.has(tag)) score += 2;
    }
    if (challenge.isJoined) score += 5;
    score += Math.min(challenge.participantCount / 50, 2);
    return { challenge, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.challenge);
}

export function trackSupportCircleEvent(
  eventName: string,
  properties?: Record<string, string | number | boolean>
): void {
  console.log('[SupportCircle Analytics]', eventName, properties ?? {});
}
