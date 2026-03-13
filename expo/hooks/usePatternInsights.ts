import { useMemo } from 'react';
import { useApp } from '@/providers/AppProvider';
import { analyzePatterns, PatternAnalysis } from '@/services/patterns/patternEngine';
import { generatePatternInsights, PatternInsightReport } from '@/services/patterns/patternInsightService';

export function usePatternInsights(periodDays: number = 30): {
  analysis: PatternAnalysis;
  insights: PatternInsightReport;
  isLoading: boolean;
} {
  const { journalEntries, messageDrafts, isLoading } = useApp();

  const analysis = useMemo(
    () => analyzePatterns(journalEntries, messageDrafts, periodDays),
    [journalEntries, messageDrafts, periodDays],
  );

  const insights = useMemo(
    () => generatePatternInsights(analysis),
    [analysis],
  );

  return { analysis, insights, isLoading };
}
