import { useMemo } from 'react';
import { useApp } from '@/providers/AppProvider';
import { computeProgressSummary } from '@/services/progress/progressService';
import { ProgressSummary } from '@/types/progress';
import { useQuery } from '@tanstack/react-query';
import { ritualRepository } from '@/services/repositories';

export function useProgress(): ProgressSummary {
  const { journalEntries, messageDrafts } = useApp();

  const ritualQuery = useQuery({
    queryKey: ['ritual'],
    queryFn: () => ritualRepository.getState(),
  });

  const ritualStreak = ritualQuery.data?.streak?.currentStreak ?? 0;

  const summary = useMemo(
    () => computeProgressSummary(journalEntries, messageDrafts, ritualStreak),
    [journalEntries, messageDrafts, ritualStreak],
  );

  return summary;
}
