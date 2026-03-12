import { useMemo } from 'react';
import { useApp } from '@/providers/AppProvider';
import { predictCrisis, CrisisPredictionResult } from '@/services/prediction/crisisPredictionService';

export function useCrisisPrediction(): CrisisPredictionResult {
  const { journalEntries, messageDrafts } = useApp();

  const result = useMemo(() => {
    return predictCrisis(journalEntries, messageDrafts);
  }, [journalEntries, messageDrafts]);

  return result;
}
