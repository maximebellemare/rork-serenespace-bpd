import { useMemo, useState, useCallback } from 'react';
import { useApp } from '@/providers/AppProvider';
import { computeInsightsDashboard } from '@/services/insights/insightsDashboardService';
import { InsightsDashboardData, DashboardTimeRange } from '@/types/insightsDashboard';

const TIME_RANGES: DashboardTimeRange[] = [
  { label: 'Week', days: 7, key: 'week' },
  { label: 'Month', days: 30, key: 'month' },
  { label: 'All Time', days: 0, key: 'all' },
];

export function useInsightsDashboard() {
  const { journalEntries, messageDrafts, isLoading } = useApp();
  const [selectedRange, setSelectedRange] = useState<DashboardTimeRange>(TIME_RANGES[1]);

  const dashboard = useMemo<InsightsDashboardData>(() => {
    console.log('[useInsightsDashboard] Recomputing for range:', selectedRange.key, 'entries:', journalEntries.length);
    return computeInsightsDashboard(journalEntries, messageDrafts, selectedRange.days);
  }, [journalEntries, messageDrafts, selectedRange]);

  const changeRange = useCallback((range: DashboardTimeRange) => {
    setSelectedRange(range);
  }, []);

  return {
    dashboard,
    selectedRange,
    changeRange,
    timeRanges: TIME_RANGES,
    isLoading,
    hasData: journalEntries.length > 0,
  };
}
