import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CopilotSessionIntake,
  CopilotSession,
} from '@/types/relationshipCopilot';
import {
  generateCopilotResult,
  saveCopilotSession,
  getCopilotSessions,
  getCopilotInsightSummary,
} from '@/services/relationships/relationshipCopilotService';
import { useRelationships } from '@/hooks/useRelationships';
import { useApp } from '@/providers/AppProvider';

export function useRelationshipCopilot() {
  const queryClient = useQueryClient();
  const { journalEntries, messageDrafts } = useApp();
  const { profiles } = useRelationships();

  const sessionsQuery = useQuery({
    queryKey: ['copilot_sessions'],
    queryFn: getCopilotSessions,
  });

  const sessions = useMemo(() => sessionsQuery.data ?? [], [sessionsQuery.data]);

  const startSessionMutation = useMutation({
    mutationFn: async (intake: CopilotSessionIntake) => {
      const result = generateCopilotResult(intake);
      const session: CopilotSession = {
        id: `cop_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        timestamp: Date.now(),
        intake,
        result,
        relationshipProfileId: intake.relationshipProfileId,
      };
      await saveCopilotSession(session);
      return session;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['copilot_sessions'] });
    },
  });

  const insightSummary = useMemo(
    () => getCopilotInsightSummary(sessions),
    [sessions],
  );

  const recentRelationshipDistress = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentEntries = journalEntries.filter(e => e.timestamp > weekAgo);
    const relationshipTriggerCount = recentEntries.reduce((count, entry) => {
      const relTriggers = entry.checkIn.triggers.filter(t => t.category === 'relationship');
      return count + relTriggers.length;
    }, 0);
    const recentDrafts = messageDrafts.filter(d => d.timestamp > weekAgo);
    const highDistressEntries = recentEntries.filter(e => e.checkIn.intensityLevel >= 6);

    const shouldShowCopilot = relationshipTriggerCount >= 1 || recentDrafts.length >= 2 || highDistressEntries.length >= 2;

    return {
      relationshipTriggerCount,
      recentDraftCount: recentDrafts.length,
      highDistressCount: highDistressEntries.length,
      shouldShowCopilot,
    };
  }, [journalEntries, messageDrafts]);

  return {
    sessions,
    isLoading: sessionsQuery.isLoading,
    startSession: startSessionMutation.mutateAsync,
    isStarting: startSessionMutation.isPending,
    lastSession: sessions[0] ?? null,
    insightSummary,
    recentRelationshipDistress,
    profiles,
  };
}
