import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getGrowthState,
  saveDailyResponse,
  addGrowthSignal,
  addPersonalStrength,
  removeGrowthSignal,
  removePersonalStrength,
  computeGrowthSnapshot,
  getTodaysPrompt,
  hasTodaysPromptBeenAnswered,
} from '@/services/identity/growthService';
import type { GrowthSignal, PersonalStrength } from '@/types/identity';

export function useGrowth() {
  const queryClient = useQueryClient();

  const growthQuery = useQuery({
    queryKey: ['growth_state'],
    queryFn: getGrowthState,
  });

  const snapshotQuery = useQuery({
    queryKey: ['growth_snapshot'],
    queryFn: computeGrowthSnapshot,
  });

  const saveDailyMutation = useMutation({
    mutationFn: ({ promptId, promptText, response }: { promptId: string; promptText: string; response: string }) =>
      saveDailyResponse(promptId, promptText, response),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['growth_state'] });
      void queryClient.invalidateQueries({ queryKey: ['growth_snapshot'] });
    },
  });

  const addSignalMutation = useMutation({
    mutationFn: (signal: Omit<GrowthSignal, 'id' | 'detectedAt'>) =>
      addGrowthSignal(signal),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['growth_state'] });
      void queryClient.invalidateQueries({ queryKey: ['growth_snapshot'] });
    },
  });

  const addStrengthMutation = useMutation({
    mutationFn: (strength: Omit<PersonalStrength, 'id' | 'discoveredAt'>) =>
      addPersonalStrength(strength),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['growth_state'] });
      void queryClient.invalidateQueries({ queryKey: ['growth_snapshot'] });
    },
  });

  const removeSignalMutation = useMutation({
    mutationFn: (id: string) => removeGrowthSignal(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['growth_state'] });
      void queryClient.invalidateQueries({ queryKey: ['growth_snapshot'] });
    },
  });

  const removeStrengthMutation = useMutation({
    mutationFn: (id: string) => removePersonalStrength(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['growth_state'] });
      void queryClient.invalidateQueries({ queryKey: ['growth_snapshot'] });
    },
  });

  const state = growthQuery.data;
  const todaysPrompt = getTodaysPrompt();
  const hasAnsweredToday = hasTodaysPromptBeenAnswered(state?.dailyResponses ?? []);

  return {
    state,
    snapshot: snapshotQuery.data,
    isLoading: growthQuery.isLoading || snapshotQuery.isLoading,
    todaysPrompt,
    hasAnsweredToday,
    dailyResponses: state?.dailyResponses ?? [],
    growthSignals: state?.growthSignals ?? [],
    personalStrengths: state?.personalStrengths ?? [],
    saveDailyResponse: saveDailyMutation.mutate,
    isSavingDaily: saveDailyMutation.isPending,
    addGrowthSignal: addSignalMutation.mutate,
    addPersonalStrength: addStrengthMutation.mutate,
    removeGrowthSignal: removeSignalMutation.mutate,
    removePersonalStrength: removeStrengthMutation.mutate,
  };
}
