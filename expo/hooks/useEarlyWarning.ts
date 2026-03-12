import { useMemo } from 'react';
import { useApp } from '@/providers/AppProvider';
import { analyzePatterns } from '@/services/prediction/patternPredictionService';
import { EarlyWarningResult } from '@/types/prediction';

export function useEarlyWarning(): EarlyWarningResult {
  const { journalEntries, messageDrafts } = useApp();

  const result = useMemo(() => {
    return analyzePatterns(journalEntries, messageDrafts);
  }, [journalEntries, messageDrafts]);

  return result;
}
