import { useMemo } from 'react';
import { useApp } from '@/providers/AppProvider';
import { EmotionalMemoryGraph, GraphPatternSummary } from '@/types/memoryGraph';
import { MemoryProfile, InsightCard } from '@/types/memory';
import {
  buildFullMemoryState,
  getTopDistressTriggers,
  getMostEffectiveCopingTools,
  getImprovingAreas,
  generatePersonalizationContext,
  MemoryGraphState,
} from '@/services/memory/memoryGraphService';
import { buildInsightCards } from '@/services/memory/memoryProfileService';

export interface UseMemoryGraphResult {
  graph: EmotionalMemoryGraph;
  patterns: GraphPatternSummary;
  profile: MemoryProfile;
  insightCards: InsightCard[];
  contextSummary: string;
  personalizationContext: string;
  topDistressTriggers: string[];
  mostEffectiveCoping: string[];
  improvingAreas: string[];
  isReady: boolean;
  totalDataPoints: number;
}

export function useMemoryGraph(): UseMemoryGraphResult {
  const { journalEntries, messageDrafts, triggerPatterns, isLoading } = useApp();

  const memoryState = useMemo<MemoryGraphState>(() => {
    console.log('[useMemoryGraph] Computing memory graph state');
    return buildFullMemoryState(
      journalEntries,
      messageDrafts,
      triggerPatterns.triggerCounts,
      triggerPatterns.emotionCounts,
      triggerPatterns.urgeCounts,
    );
  }, [journalEntries, messageDrafts, triggerPatterns]);

  const insightCards = useMemo(() => {
    return buildInsightCards(memoryState.profile);
  }, [memoryState.profile]);

  const topDistressTriggers = useMemo(() => {
    return getTopDistressTriggers(memoryState.patterns);
  }, [memoryState.patterns]);

  const mostEffectiveCoping = useMemo(() => {
    return getMostEffectiveCopingTools(memoryState.patterns);
  }, [memoryState.patterns]);

  const improvingAreas = useMemo(() => {
    return getImprovingAreas(memoryState.patterns);
  }, [memoryState.patterns]);

  const personalizationContext = useMemo(() => {
    return generatePersonalizationContext(memoryState);
  }, [memoryState]);

  return useMemo(() => ({
    graph: memoryState.graph,
    patterns: memoryState.patterns,
    profile: memoryState.profile,
    insightCards,
    contextSummary: memoryState.contextSummary,
    personalizationContext,
    topDistressTriggers,
    mostEffectiveCoping,
    improvingAreas,
    isReady: !isLoading && memoryState.lastUpdated > 0,
    totalDataPoints: memoryState.graph.totalDataPoints,
  }), [
    memoryState,
    insightCards,
    personalizationContext,
    topDistressTriggers,
    mostEffectiveCoping,
    improvingAreas,
    isLoading,
  ]);
}
