import { AnalyticsUserProperties } from '@/types/analytics';
import { analyticsEngine } from './analyticsEngine';

export async function trackEvent(
  name: string,
  properties?: Record<string, string | number | boolean>,
): Promise<void> {
  return analyticsEngine.trackEvent(name, properties);
}

export async function setUserProperties(properties: AnalyticsUserProperties): Promise<void> {
  return analyticsEngine.setUserProperties(properties);
}

export async function flush(): Promise<void> {
  return analyticsEngine.flush();
}

export async function trackScreenView(screenName: string): Promise<void> {
  return analyticsEngine.trackScreen(screenName);
}

export async function trackCheckIn(intensity: number, triggerCount: number): Promise<void> {
  return analyticsEngine.trackEvent('check_in_completed', {
    intensity,
    trigger_count: triggerCount,
  });
}

export async function trackExerciseStarted(exerciseId: string, exerciseName: string): Promise<void> {
  return analyticsEngine.trackEvent('exercise_started', {
    exercise_id: exerciseId,
    exercise_name: exerciseName,
  });
}

export async function trackMessageRewrite(style: string): Promise<void> {
  return analyticsEngine.trackEvent('message_rewrite', { style });
}

export async function trackLessonViewed(lessonId: string, categoryId: string): Promise<void> {
  return analyticsEngine.trackEvent('lesson_viewed', {
    lesson_id: lessonId,
    category_id: categoryId,
  });
}

export async function trackAIConversationStarted(): Promise<void> {
  return analyticsEngine.trackEvent('ai_conversation_started');
}

export async function trackCommunityPostCreated(category: string): Promise<void> {
  return analyticsEngine.trackEvent('community_post_created', { category });
}

export async function trackRelationshipCopilotOpened(): Promise<void> {
  return analyticsEngine.trackEvent('relationship_copilot_opened');
}

export async function trackRelationshipCopilotCompleted(properties?: Record<string, string | number | boolean>): Promise<void> {
  return analyticsEngine.trackEvent('relationship_copilot_completed', properties);
}

export async function trackCrisisMode(action: 'triggered' | 'regulation_started' | 'regulation_completed'): Promise<void> {
  return analyticsEngine.trackEvent(`crisis_${action === 'triggered' ? 'mode_triggered' : action}`);
}

export async function trackMessageGuard(action: string, properties?: Record<string, string | number | boolean>): Promise<void> {
  return analyticsEngine.trackEvent(`message_${action}`, properties);
}

export async function trackPremiumSignal(signal: string, properties?: Record<string, string | number | boolean>): Promise<void> {
  return analyticsEngine.trackEvent(signal, properties);
}

export async function trackRegulationOutcome(
  tool: string,
  distressBefore: number,
  distressAfter: number,
): Promise<void> {
  return analyticsEngine.trackRegulationOutcome({
    tool,
    distressBefore,
    distressAfter,
    timestamp: Date.now(),
  });
}
