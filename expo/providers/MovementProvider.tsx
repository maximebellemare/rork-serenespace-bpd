import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import {
  MovementEntry,
  MovementType,
  MovementIntensity,
  MoodLevel,
} from '@/types/movement';
import { movementRepository } from '@/services/repositories';
import { movementService } from '@/services/movement/movementService';

export const [MovementProvider, useMovement] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [entries, setEntries] = useState<MovementEntry[]>([]);

  const stateQuery = useQuery({
    queryKey: ['movement'],
    queryFn: () => movementRepository.getState(),
  });

  useEffect(() => {
    if (stateQuery.data) {
      setEntries(stateQuery.data.entries);
    }
  }, [stateQuery.data]);

  const addEntryMutation = useMutation({
    mutationFn: (params: {
      type: MovementType;
      customType?: string;
      duration: number;
      intensity: MovementIntensity;
      moodBefore: MoodLevel;
      moodAfter: MoodLevel;
      notes: string;
    }) => movementService.addEntry(params),
    onSuccess: (newEntry) => {
      setEntries(prev => [newEntry, ...prev]);
      void queryClient.invalidateQueries({ queryKey: ['movement'] });
    },
  });

  const deleteEntryMutation = useMutation({
    mutationFn: (id: string) => movementService.deleteEntry(id),
    onSuccess: (_, id) => {
      setEntries(prev => prev.filter(e => e.id !== id));
      void queryClient.invalidateQueries({ queryKey: ['movement'] });
    },
  });

  const todayEntries = useMemo(
    () => movementService.getTodayEntries(entries),
    [entries],
  );

  const weekEntries = useMemo(
    () => movementService.getWeekEntries(entries),
    [entries],
  );

  const totalMinutesToday = useMemo(
    () => movementService.getTotalMinutesToday(entries),
    [entries],
  );

  const totalMinutesWeek = useMemo(
    () => movementService.getTotalMinutesWeek(entries),
    [entries],
  );

  const averageMoodShift = useMemo(
    () => movementService.getAverageMoodShift(entries),
    [entries],
  );

  const streakDays = useMemo(
    () => movementService.getStreakDays(entries),
    [entries],
  );

  const moodImpact = useMemo(
    () => movementService.getMoodImpactSummary(entries),
    [entries],
  );

  const getEntryById = useCallback(
    (id: string) => entries.find(e => e.id === id) ?? null,
    [entries],
  );

  return useMemo(() => ({
    entries,
    todayEntries,
    weekEntries,
    totalMinutesToday,
    totalMinutesWeek,
    averageMoodShift,
    streakDays,
    moodImpact,
    isLoading: stateQuery.isLoading,
    addEntry: addEntryMutation.mutateAsync,
    deleteEntry: deleteEntryMutation.mutateAsync,
    isAdding: addEntryMutation.isPending,
    getEntryById,
  }), [
    entries, todayEntries, weekEntries, totalMinutesToday, totalMinutesWeek,
    averageMoodShift, streakDays, moodImpact, stateQuery.isLoading,
    addEntryMutation.mutateAsync, addEntryMutation.isPending,
    deleteEntryMutation.mutateAsync, getEntryById,
  ]);
});
