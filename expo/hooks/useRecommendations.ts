import { useMemo } from 'react';
import { useApp } from '@/providers/AppProvider';
import { generateRecommendations } from '@/services/recommendation/copingRecommendationService';
import { RecommendationResult } from '@/types/recommendation';

export function useRecommendations(): RecommendationResult {
  const { journalEntries, messageDrafts } = useApp();

  const result = useMemo(() => {
    return generateRecommendations(journalEntries, messageDrafts);
  }, [journalEntries, messageDrafts]);

  return result;
}
