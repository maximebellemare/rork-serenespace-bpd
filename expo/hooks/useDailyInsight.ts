import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApp } from '@/providers/AppProvider';
import {
  getDailyInsightState,
  selectDailyInsight,
  recordInsightFeedback,
  toggleSaveInsight,
  markInsightViewed,
  getSavedInsights,
  generateWeeklyLearningSummary,
  getWeeklyLearningSummary,
  saveWeeklyLearningSummary,
} from '@/services/learn/dailyInsightService';
import {
  DailyInsightState,
  DailyInsightSelection,
  InsightFeedback,
  DailyInsight,
} from '@/types/dailyInsight';

export function useDailyInsight() {
  const queryClient = useQueryClient();
  const { journalEntries } = useApp();
  const [insightState, setInsightState] = useState<DailyInsightState | null>(null);

  const stateQuery = useQuery({
    queryKey: ['daily_insight_state'],
    queryFn: getDailyInsightState,
  });

  useEffect(() => {
    if (stateQuery.data) {
      setInsightState(stateQuery.data);
    }
  }, [stateQuery.data]);

  const selection = useMemo<DailyInsightSelection | null>(() => {
    if (!insightState) return null;
    return selectDailyInsight(journalEntries, insightState);
  }, [journalEntries, insightState]);

  const savedInsights = useMemo<DailyInsight[]>(() => {
    if (!insightState) return [];
    return getSavedInsights(insightState);
  }, [insightState]);

  const isSaved = useMemo(() => {
    if (!insightState || !selection) return false;
    return insightState.savedInsightIds.includes(selection.insight.id);
  }, [insightState, selection]);

  const currentFeedback = useMemo<InsightFeedback | null>(() => {
    if (!insightState || !selection) return null;
    return insightState.feedback[selection.insight.id] ?? null;
  }, [insightState, selection]);

  const feedbackMutation = useMutation({
    mutationFn: async ({ insightId, feedback }: { insightId: string; feedback: InsightFeedback }) => {
      if (!insightState) return insightState;
      return recordInsightFeedback(insightId, feedback, insightState);
    },
    onSuccess: (updated) => {
      if (updated) {
        setInsightState(updated);
        void queryClient.invalidateQueries({ queryKey: ['daily_insight_state'] });
      }
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (insightId: string) => {
      if (!insightState) return insightState;
      return toggleSaveInsight(insightId, insightState);
    },
    onSuccess: (updated) => {
      if (updated) {
        setInsightState(updated);
        void queryClient.invalidateQueries({ queryKey: ['daily_insight_state'] });
      }
    },
  });

  const viewMutation = useMutation({
    mutationFn: async (insightId: string) => {
      if (!insightState) return insightState;
      return markInsightViewed(insightId, insightState);
    },
    onSuccess: (updated) => {
      if (updated) {
        setInsightState(updated);
        void queryClient.invalidateQueries({ queryKey: ['daily_insight_state'] });
      }
    },
  });

  const submitFeedback = useCallback((insightId: string, feedback: InsightFeedback) => {
    feedbackMutation.mutate({ insightId, feedback });
  }, [feedbackMutation]);

  const toggleSave = useCallback((insightId: string) => {
    saveMutation.mutate(insightId);
  }, [saveMutation]);

  const markViewed = useCallback((insightId: string) => {
    viewMutation.mutate(insightId);
  }, [viewMutation]);

  return {
    selection,
    savedInsights,
    isSaved,
    currentFeedback,
    isLoading: stateQuery.isLoading,
    submitFeedback,
    toggleSave,
    markViewed,
  };
}

export function useWeeklyLearningSummary() {
  const { journalEntries } = useApp();

  const stateQuery = useQuery({
    queryKey: ['daily_insight_state'],
    queryFn: getDailyInsightState,
  });

  const summaryQuery = useQuery({
    queryKey: ['weekly_learning_summary'],
    queryFn: async () => {
      let summary = await getWeeklyLearningSummary();
      if (!summary && stateQuery.data) {
        summary = generateWeeklyLearningSummary(journalEntries, stateQuery.data);
        await saveWeeklyLearningSummary(summary);
      }
      return summary;
    },
    enabled: !!stateQuery.data,
  });

  return {
    summary: summaryQuery.data ?? null,
    isLoading: summaryQuery.isLoading,
  };
}
