import { useMemo } from 'react';
import { useApp } from '@/providers/AppProvider';
import { useJournal } from '@/providers/JournalProvider';
import { detectSpiralFromSmartEntries, generateWeeklySpiralInsight } from '@/services/emotions/spiralDetectionService';
import { SpiralDetectionResult, SpiralWeeklyInsight } from '@/types/spiral';

export function useSpiralDetection(): SpiralDetectionResult {
  const { journalEntries, messageDrafts } = useApp();
  const { smartEntries } = useJournal();

  const result = useMemo(
    () => detectSpiralFromSmartEntries(smartEntries, journalEntries, messageDrafts),
    [smartEntries, journalEntries, messageDrafts],
  );

  return result;
}

export function useSpiralWeeklyInsight(): SpiralWeeklyInsight | null {
  const { journalEntries, messageDrafts } = useApp();

  const insight = useMemo(
    () => generateWeeklySpiralInsight(journalEntries, messageDrafts),
    [journalEntries, messageDrafts],
  );

  return insight;
}
