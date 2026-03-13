import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import {
  SmartJournalEntry,
  JournalEntryFormat,
  JournalAIInsight,
  JournalPatternResult,
  JournalWeeklyReport,
  JournalStats,
} from '@/types/journalEntry';
import { Emotion, Trigger } from '@/types';
import { journalEntryRepository } from '@/services/journal/journalEntryRepository';
import {
  analyzeJournalEntry,
  detectJournalPatterns,
  generateWeeklyJournalReport,
  computeJournalStats,
} from '@/services/journal/journalAnalysisService';

function generateId(): string {
  return `sj_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export const [JournalProvider, useJournal] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [smartEntries, setSmartEntries] = useState<SmartJournalEntry[]>([]);

  const entriesQuery = useQuery({
    queryKey: ['smart_journal'],
    queryFn: () => journalEntryRepository.getAll(),
  });

  useEffect(() => {
    if (entriesQuery.data) {
      setSmartEntries(entriesQuery.data);
    }
  }, [entriesQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (entries: SmartJournalEntry[]) => journalEntryRepository.save(entries),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['smart_journal'] });
    },
  });

  const addEntry = useCallback((params: {
    format: JournalEntryFormat;
    title?: string;
    content: string;
    emotions: Emotion[];
    triggers: Trigger[];
    distressLevel: number;
    notes?: string;
    guidedFlowId?: string;
    guidedResponses?: Record<string, string>;
    voiceRecordingUri?: string;
    transcript?: string;
  }): SmartJournalEntry => {
    const now = Date.now();
    const entry: SmartJournalEntry = {
      id: generateId(),
      timestamp: now,
      format: params.format,
      title: params.title,
      content: params.content,
      emotions: params.emotions,
      triggers: params.triggers,
      tags: [],
      distressLevel: params.distressLevel,
      notes: params.notes,
      guidedFlowId: params.guidedFlowId,
      guidedResponses: params.guidedResponses,
      isImportant: false,
      isTherapyNote: false,
      voiceRecordingUri: params.voiceRecordingUri,
      transcript: params.transcript,
      createdAt: now,
      updatedAt: now,
    };

    const updated = [entry, ...smartEntries];
    setSmartEntries(updated);
    saveMutation.mutate(updated);
    console.log('[JournalProvider] Added entry:', entry.id, entry.format);
    return entry;
  }, [smartEntries, saveMutation]);

  const updateEntry = useCallback((id: string, updates: Partial<SmartJournalEntry>) => {
    const updated = smartEntries.map(e =>
      e.id === id ? { ...e, ...updates, updatedAt: Date.now() } : e
    );
    setSmartEntries(updated);
    saveMutation.mutate(updated);
  }, [smartEntries, saveMutation]);

  const deleteEntry = useCallback((id: string) => {
    const updated = smartEntries.filter(e => e.id !== id);
    setSmartEntries(updated);
    saveMutation.mutate(updated);
  }, [smartEntries, saveMutation]);

  const toggleImportant = useCallback((id: string) => {
    const entry = smartEntries.find(e => e.id === id);
    if (entry) {
      updateEntry(id, { isImportant: !entry.isImportant });
    }
  }, [smartEntries, updateEntry]);

  const toggleTherapyNote = useCallback((id: string) => {
    const entry = smartEntries.find(e => e.id === id);
    if (entry) {
      updateEntry(id, { isTherapyNote: !entry.isTherapyNote });
    }
  }, [smartEntries, updateEntry]);

  const setAIInsight = useCallback((id: string, insight: JournalAIInsight) => {
    updateEntry(id, { aiInsight: insight });
  }, [updateEntry]);

  const analyzeEntryMutation = useMutation({
    mutationFn: async (entry: SmartJournalEntry) => {
      const insight = await analyzeJournalEntry(entry);
      setAIInsight(entry.id, insight);
      return insight;
    },
  });

  const stats = useMemo<JournalStats>(
    () => computeJournalStats(smartEntries),
    [smartEntries]
  );

  const patterns = useMemo<JournalPatternResult>(
    () => detectJournalPatterns(smartEntries, 30),
    [smartEntries]
  );

  const weeklyReport = useMemo<JournalWeeklyReport | null>(
    () => generateWeeklyJournalReport(smartEntries),
    [smartEntries]
  );

  return useMemo(() => ({
    smartEntries,
    addEntry,
    updateEntry,
    deleteEntry,
    toggleImportant,
    toggleTherapyNote,
    analyzeEntry: analyzeEntryMutation.mutateAsync,
    isAnalyzing: analyzeEntryMutation.isPending,
    stats,
    patterns,
    weeklyReport,
    isLoading: entriesQuery.isLoading,
  }), [
    smartEntries,
    addEntry,
    updateEntry,
    deleteEntry,
    toggleImportant,
    toggleTherapyNote,
    analyzeEntryMutation.mutateAsync,
    analyzeEntryMutation.isPending,
    stats,
    patterns,
    weeklyReport,
    entriesQuery.isLoading,
  ]);
});
