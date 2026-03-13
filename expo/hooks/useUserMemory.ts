import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApp } from '@/providers/AppProvider';
import { useAICompanion } from '@/providers/AICompanionProvider';
import { MemorySnapshot, MemorySummary } from '@/types/userMemory';
import {
  loadMemorySnapshot,
  saveMemorySnapshot,
  buildMemoriesFromJournal,
  buildMemoriesFromMessages,
  buildMemoriesFromProfile,
  buildMemorySummary,
  buildAIMemoryContext,
  getMemoryBasedSuggestion,
  addValueMemory,
} from '@/services/memory/userMemoryService';

export function useUserMemory() {
  const queryClient = useQueryClient();
  const { journalEntries, messageDrafts } = useApp();
  const { memoryProfile } = useAICompanion();
  const [snapshot, setSnapshot] = useState<MemorySnapshot | null>(null);

  const snapshotQuery = useQuery({
    queryKey: ['user-memory-snapshot'],
    queryFn: loadMemorySnapshot,
  });

  useEffect(() => {
    if (snapshotQuery.data) {
      setSnapshot(snapshotQuery.data);
    }
  }, [snapshotQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (snap: MemorySnapshot) => saveMemorySnapshot(snap),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['user-memory-snapshot'] });
    },
  });

  const rebuildMemories = useCallback(() => {
    if (!snapshot) return;

    console.log('[useUserMemory] Rebuilding memories from', journalEntries.length, 'entries');

    let updated = { ...snapshot, memories: [...snapshot.memories], connections: [...snapshot.connections] };
    updated = buildMemoriesFromJournal(updated, journalEntries);
    updated = buildMemoriesFromMessages(updated, messageDrafts);
    updated = buildMemoriesFromProfile(updated, memoryProfile);

    setSnapshot(updated);
    saveMutation.mutate(updated);
  }, [snapshot, journalEntries, messageDrafts, memoryProfile, saveMutation]);

  const snapshotLastUpdated = snapshot?.lastUpdated ?? 0;
  const snapshotMemoryCount = snapshot?.memories.length ?? 0;

  useEffect(() => {
    if (!snapshot) return;
    if (journalEntries.length === 0 && messageDrafts.length === 0) return;

    const timeSinceUpdate = Date.now() - snapshotLastUpdated;
    const needsRebuild = timeSinceUpdate > 3 * 60 * 1000 || snapshotMemoryCount === 0;

    if (needsRebuild) {
      console.log('[useUserMemory] Auto-rebuilding memories');
      rebuildMemories();
    }
  }, [snapshot, snapshotLastUpdated, snapshotMemoryCount, journalEntries.length, messageDrafts.length, rebuildMemories]);

  const summary = useMemo<MemorySummary>(() => {
    if (!snapshot) {
      return {
        topTriggers: [],
        commonLoops: [],
        helpfulTools: [],
        growthSignals: [],
        personalValues: [],
        relationshipPatterns: [],
        narratives: [],
        totalMemories: 0,
        strongMemoryCount: 0,
      };
    }
    return buildMemorySummary(snapshot);
  }, [snapshot]);

  const aiMemoryContext = useMemo(() => {
    if (!snapshot) return '';
    return buildAIMemoryContext(snapshot);
  }, [snapshot]);

  const getSuggestion = useCallback(
    (trigger?: string, emotion?: string) => {
      if (!snapshot) return null;
      return getMemoryBasedSuggestion(snapshot, trigger, emotion);
    },
    [snapshot],
  );

  const addValue = useCallback(
    (label: string, description: string) => {
      if (!snapshot) return;
      const updated = addValueMemory(
        { ...snapshot, memories: [...snapshot.memories], connections: [...snapshot.connections] },
        label,
        description,
      );
      setSnapshot(updated);
      saveMutation.mutate(updated);
    },
    [snapshot, saveMutation],
  );

  return useMemo(
    () => ({
      snapshot,
      summary,
      aiMemoryContext,
      isLoading: snapshotQuery.isLoading,
      isReady: !!snapshot,
      rebuildMemories,
      getSuggestion,
      addValue,
    }),
    [snapshot, summary, aiMemoryContext, snapshotQuery.isLoading, rebuildMemories, getSuggestion, addValue],
  );
}
