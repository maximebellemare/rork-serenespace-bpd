import { AnalyticsUserProperties } from '@/types/analytics';
import { analyticsRepository } from '@/services/repositories';

export async function trackEvent(
  name: string,
  properties?: Record<string, string | number | boolean>,
): Promise<void> {
  return analyticsRepository.trackEvent(name, properties);
}

export async function setUserProperties(properties: AnalyticsUserProperties): Promise<void> {
  return analyticsRepository.setUserProperties(properties);
}

export async function flush(): Promise<void> {
  return analyticsRepository.flush();
}

export async function trackScreenView(screenName: string): Promise<void> {
  return analyticsRepository.trackEvent('screen_view', { screen: screenName });
}

export async function trackCheckIn(intensity: number, triggerCount: number): Promise<void> {
  return analyticsRepository.trackEvent('check_in_completed', {
    intensity,
    trigger_count: triggerCount,
  });
}

export async function trackExerciseStarted(exerciseId: string, exerciseName: string): Promise<void> {
  return analyticsRepository.trackEvent('exercise_started', {
    exercise_id: exerciseId,
    exercise_name: exerciseName,
  });
}

export async function trackMessageRewrite(style: string): Promise<void> {
  return analyticsRepository.trackEvent('message_rewrite', { style });
}

export async function trackLessonViewed(lessonId: string, categoryId: string): Promise<void> {
  return analyticsRepository.trackEvent('lesson_viewed', {
    lesson_id: lessonId,
    category_id: categoryId,
  });
}

export async function trackAIConversationStarted(): Promise<void> {
  return analyticsRepository.trackEvent('ai_conversation_started');
}

export async function trackCommunityPostCreated(category: string): Promise<void> {
  return analyticsRepository.trackEvent('community_post_created', { category });
}
