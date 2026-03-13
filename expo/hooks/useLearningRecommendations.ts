import { useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useApp } from '@/providers/AppProvider';
import { generateLearningRecommendations, getPostEventSuggestions } from '@/services/learn/learningRecommendationEngine';
import { getLearningHistory, recordArticleOpened, recordArticleCompleted, recordRecommendationShown } from '@/services/learn/learningHistoryService';
import { getLearnState } from '@/services/learn/learnService';
import { getLessonById } from '@/services/learn/learnService';
import { LearningRecommendation, LearningRecommendationResult, PostEventSuggestion, EmotionalSignal } from '@/types/learningRecommendation';
import { Lesson } from '@/types/learn';

export interface LearningRecommendationWithLesson extends LearningRecommendation {
  lesson: Lesson;
}

export interface UseLearningRecommendationsResult {
  recommendations: LearningRecommendationWithLesson[];
  contextMessage: string;
  topSignals: EmotionalSignal[];
  isLoading: boolean;
  getPostEventSuggestions: (flowSource: string) => PostEventSuggestion[];
  trackArticleOpened: (lessonId: string, source: 'recommendation' | 'browse' | 'search' | 'post_event' | 'ai_companion', signal?: EmotionalSignal | null) => Promise<void>;
  trackArticleCompleted: (lessonId: string) => Promise<void>;
  trackRecommendationShown: () => Promise<void>;
}

export function useLearningRecommendations(): UseLearningRecommendationsResult {
  const { journalEntries, messageDrafts } = useApp();
  const queryClient = useQueryClient();

  const learnStateQuery = useQuery({
    queryKey: ['learn_state_for_recs'],
    queryFn: () => getLearnState(),
    staleTime: 60000,
  });

  const historyQuery = useQuery({
    queryKey: ['learning_history'],
    queryFn: () => getLearningHistory(),
    staleTime: 30000,
  });

  const completedIds = useMemo(() => {
    if (!learnStateQuery.data) return [];
    return Object.entries(learnStateQuery.data.progress)
      .filter(([, p]) => p.completed)
      .map(([id]) => id);
  }, [learnStateQuery.data]);

  const recentlyViewedIds = useMemo(() => {
    return learnStateQuery.data?.recentlyViewed ?? [];
  }, [learnStateQuery.data]);

  const result = useMemo<LearningRecommendationResult>(() => {
    return generateLearningRecommendations(
      journalEntries,
      messageDrafts,
      completedIds,
      recentlyViewedIds,
      3,
    );
  }, [journalEntries, messageDrafts, completedIds, recentlyViewedIds]);

  const recommendations = useMemo<LearningRecommendationWithLesson[]>(() => {
    return result.recommendations
      .map(rec => {
        const lesson = getLessonById(rec.lessonId);
        if (!lesson) return null;
        return { ...rec, lesson };
      })
      .filter((r): r is LearningRecommendationWithLesson => r !== null);
  }, [result.recommendations]);

  const trackArticleOpened = useCallback(async (
    lessonId: string,
    source: 'recommendation' | 'browse' | 'search' | 'post_event' | 'ai_companion',
    signal: EmotionalSignal | null = null,
  ) => {
    await recordArticleOpened(lessonId, source, signal);
    void queryClient.invalidateQueries({ queryKey: ['learning_history'] });
  }, [queryClient]);

  const trackArticleCompleted = useCallback(async (lessonId: string) => {
    await recordArticleCompleted(lessonId);
    void queryClient.invalidateQueries({ queryKey: ['learning_history'] });
  }, [queryClient]);

  const trackRecommendationShown = useCallback(async () => {
    await recordRecommendationShown();
    void queryClient.invalidateQueries({ queryKey: ['learning_history'] });
  }, [queryClient]);

  const getPostEventSuggestionsWrapped = useCallback((flowSource: string) => {
    return getPostEventSuggestions(flowSource);
  }, []);

  return {
    recommendations,
    contextMessage: result.contextMessage,
    topSignals: result.topSignals,
    isLoading: learnStateQuery.isLoading || historyQuery.isLoading,
    getPostEventSuggestions: getPostEventSuggestionsWrapped,
    trackArticleOpened,
    trackArticleCompleted,
    trackRecommendationShown,
  };
}
