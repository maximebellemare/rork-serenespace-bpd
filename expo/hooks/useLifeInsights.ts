import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApp } from '@/providers/AppProvider';
import {
  generateLifeInsights,
  generateWeeklySummary,
  getStoredLifeInsights,
  getStoredWeeklySummaries,
  saveLifeInsights,
  saveWeeklySummary,
  markInsightViewed,
  getInsightForAICompanion,
} from '@/services/insights/lifeInsightService';
import { WeeklySummary } from '@/types/lifeInsight';
import { trackEvent } from '@/services/analytics/analyticsService';

export function useLifeInsights() {
  const { journalEntries, messageDrafts } = useApp();
  const queryClient = useQueryClient();

  const storedInsightsQuery = useQuery({
    queryKey: ['lifeInsights'],
    queryFn: getStoredLifeInsights,
  });

  const storedSummariesQuery = useQuery({
    queryKey: ['weeklySummaries'],
    queryFn: getStoredWeeklySummaries,
  });

  const currentInsights = useMemo(() => {
    return generateLifeInsights(journalEntries, messageDrafts);
  }, [journalEntries, messageDrafts]);

  const generateAndSaveMutation = useMutation({
    mutationFn: async () => {
      const insights = generateLifeInsights(journalEntries, messageDrafts);
      await saveLifeInsights(insights);
      void trackEvent('insight_generated', { count: insights.length });
      return insights;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['lifeInsights'] });
    },
  });

  const generateWeeklyMutation = useMutation({
    mutationFn: async () => {
      const summary = generateWeeklySummary(journalEntries, messageDrafts);
      await saveWeeklySummary(summary);
      void trackEvent('insight_generated', { type: 'weekly_summary' });
      return summary;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['weeklySummaries'] });
    },
  });

  const markViewedMutation = useMutation({
    mutationFn: async (insightId: string) => {
      await markInsightViewed(insightId);
      void trackEvent('insight_viewed', { insight_id: insightId });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['lifeInsights'] });
    },
  });

  const aiCompanionInsight = useMemo(() => {
    return getInsightForAICompanion(currentInsights);
  }, [currentInsights]);

  const topInsights = useMemo(() => {
    return currentInsights.slice(0, 6);
  }, [currentInsights]);

  const pastSummaries = useMemo<WeeklySummary[]>(() => {
    return storedSummariesQuery.data ?? [];
  }, [storedSummariesQuery.data]);

  return {
    insights: topInsights,
    allInsights: currentInsights,
    storedInsights: storedInsightsQuery.data ?? [],
    pastSummaries,
    aiCompanionInsight,
    isLoading: storedInsightsQuery.isLoading || storedSummariesQuery.isLoading,
    generateInsights: generateAndSaveMutation.mutate,
    generateWeeklySummary: generateWeeklyMutation.mutate,
    markViewed: markViewedMutation.mutate,
    isGenerating: generateAndSaveMutation.isPending,
    isGeneratingWeekly: generateWeeklyMutation.isPending,
  };
}
