import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import {
  RewardState,
  DEFAULT_REWARD_STATE,
  ConsistencyMetrics,
  MilestoneDefinition,
} from '@/types/reward';
import { rewardRepository } from '@/services/repositories';
import { useApp } from '@/providers/AppProvider';
import { useMedications } from '@/providers/MedicationProvider';
import { useAppointments } from '@/providers/AppointmentProvider';
import { computeConsistencyMetrics } from '@/services/rewards/consistencyService';
import {
  evaluateMilestones,
  getUnseenMilestones,
  getRecentMilestone,
  getUnlockedDefinitions,
  getNextMilestones,
} from '@/services/rewards/rewardService';
import { conversationRepository } from '@/services/repositories';
import { trackEvent } from '@/services/analytics/analyticsService';

export const [RewardsProvider, useRewards] = createContextHook(() => {
  const queryClient = useQueryClient();
  const { journalEntries, messageDrafts } = useApp();
  const { medications, logs: medicationLogs } = useMedications();
  const { appointments } = useAppointments();

  const [rewardState, setRewardState] = useState<RewardState>(DEFAULT_REWARD_STATE);

  const stateQuery = useQuery({
    queryKey: ['rewards'],
    queryFn: () => rewardRepository.getState(),
  });

  const conversationsQuery = useQuery({
    queryKey: ['conversations_for_rewards'],
    queryFn: () => conversationRepository.getAll(),
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    if (stateQuery.data) {
      setRewardState(stateQuery.data);
    }
  }, [stateQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (state: RewardState) => rewardRepository.saveState(state),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['rewards'] });
    },
  });

  const conversations = useMemo(() => conversationsQuery.data ?? [], [conversationsQuery.data]);

  const metrics = useMemo<ConsistencyMetrics>(() => {
    return computeConsistencyMetrics(
      journalEntries,
      messageDrafts,
      medications,
      medicationLogs,
      appointments,
      conversations,
    );
  }, [journalEntries, messageDrafts, medications, medicationLogs, appointments, conversations]);

  useEffect(() => {
    const updated = evaluateMilestones(metrics, rewardState.unlockedMilestones);
    if (updated.length !== rewardState.unlockedMilestones.length) {
      const newState: RewardState = {
        unlockedMilestones: updated,
        metrics,
        lastComputedAt: Date.now(),
      };
      setRewardState(newState);
      saveMutation.mutate(newState);
      console.log('[RewardsProvider] New milestones unlocked:', updated.length - rewardState.unlockedMilestones.length);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metrics, rewardState.unlockedMilestones.length]);

  const unseenMilestones = useMemo<MilestoneDefinition[]>(
    () => getUnseenMilestones(rewardState),
    [rewardState],
  );

  const recentMilestone = useMemo<MilestoneDefinition | null>(
    () => getRecentMilestone(rewardState),
    [rewardState],
  );

  const unlockedMilestones = useMemo<MilestoneDefinition[]>(
    () => getUnlockedDefinitions(rewardState),
    [rewardState],
  );

  const nextMilestones = useMemo(
    () => getNextMilestones(metrics, rewardState),
    [metrics, rewardState],
  );

  const markMilestoneSeen = useCallback((milestoneId: string) => {
    const updated: RewardState = {
      ...rewardState,
      unlockedMilestones: rewardState.unlockedMilestones.map(u =>
        u.milestoneId === milestoneId ? { ...u, seen: true } : u,
      ),
    };
    setRewardState(updated);
    saveMutation.mutate(updated);
    void trackEvent('reward_viewed', { milestone_id: milestoneId });
    console.log('[RewardsProvider] Milestone marked seen:', milestoneId);
  }, [rewardState, saveMutation]);

  const markAllSeen = useCallback(() => {
    const updated: RewardState = {
      ...rewardState,
      unlockedMilestones: rewardState.unlockedMilestones.map(u => ({ ...u, seen: true })),
    };
    setRewardState(updated);
    saveMutation.mutate(updated);
    console.log('[RewardsProvider] All milestones marked seen');
  }, [rewardState, saveMutation]);

  return useMemo(() => ({
    metrics,
    rewardState,
    unseenMilestones,
    recentMilestone,
    unlockedMilestones,
    nextMilestones,
    markMilestoneSeen,
    markAllSeen,
    isLoading: stateQuery.isLoading,
    totalUnlocked: rewardState.unlockedMilestones.length,
    hasUnseen: unseenMilestones.length > 0,
  }), [
    metrics, rewardState, unseenMilestones, recentMilestone,
    unlockedMilestones, nextMilestones, markMilestoneSeen,
    markAllSeen, stateQuery.isLoading,
  ]);
});
