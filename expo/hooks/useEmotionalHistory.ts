import { useMemo, useState, useCallback } from 'react';
import { useApp } from '@/providers/AppProvider';
import {
  computeEmotionalHistory,
  EmotionalHistorySnapshot,
  TimePeriodOption,
  TIME_PERIODS,
} from '@/services/history/emotionalHistoryService';

export function useEmotionalHistory() {
  const { journalEntries, messageDrafts, isLoading } = useApp();
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriodOption>(TIME_PERIODS[0]);

  const snapshot = useMemo<EmotionalHistorySnapshot>(() => {
    console.log('[useEmotionalHistory] Recomputing for period:', selectedPeriod.key);
    return computeEmotionalHistory(journalEntries, messageDrafts, selectedPeriod);
  }, [journalEntries, messageDrafts, selectedPeriod]);

  const changePeriod = useCallback((period: TimePeriodOption) => {
    setSelectedPeriod(period);
  }, []);

  return {
    snapshot,
    selectedPeriod,
    changePeriod,
    periods: TIME_PERIODS,
    isLoading,
    hasData: journalEntries.length > 0,
  };
}
