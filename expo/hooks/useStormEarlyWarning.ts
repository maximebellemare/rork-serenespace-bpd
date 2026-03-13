import { useMemo } from 'react';
import { useApp } from '@/providers/AppProvider';
import { analyzeStormPatterns, StormEarlyWarningResult } from '@/services/prediction/stormPatternAnalyzer';

export function useStormEarlyWarning(): StormEarlyWarningResult {
  const { journalEntries, messageDrafts } = useApp();

  const result = useMemo(() => {
    return analyzeStormPatterns(journalEntries, messageDrafts);
  }, [journalEntries, messageDrafts]);

  return result;
}
