import { useMemo } from 'react';
import { useApp } from '@/providers/AppProvider';
import { useEmotionalLoops } from '@/hooks/useEmotionalLoops';
import { detectActiveLoops } from '@/services/patterns/loopMappingService';
import { ActiveLoopSignal } from '@/types/emotionalLoop';

export function useActiveLoops(): ActiveLoopSignal[] {
  const { journalEntries, messageDrafts } = useApp();
  const report = useEmotionalLoops();

  const allLoops = useMemo(() => [
    ...report.triggerChains,
    ...report.emotionChains,
    ...report.behaviorChains,
  ], [report]);

  const signals = useMemo(() => {
    if (allLoops.length === 0) return [];
    return detectActiveLoops(journalEntries, messageDrafts, allLoops);
  }, [journalEntries, messageDrafts, allLoops]);

  return signals;
}
