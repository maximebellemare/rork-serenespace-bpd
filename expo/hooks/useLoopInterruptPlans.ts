import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { InterruptPlan } from '@/types/emotionalLoop';
import {
  loadInterruptPlans,
  saveInterruptPlan,
  toggleFavorite,
  markHelpful,
  deletePlan,
} from '@/services/patterns/loopInterruptService';

export function useLoopInterruptPlans() {
  const queryClient = useQueryClient();

  const plansQuery = useQuery({
    queryKey: ['interruptPlans'],
    queryFn: loadInterruptPlans,
  });

  const saveMutation = useMutation({
    mutationFn: (plan: InterruptPlan) => saveInterruptPlan(plan),
    onSuccess: (plans) => {
      queryClient.setQueryData(['interruptPlans'], plans);
    },
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: (planId: string) => toggleFavorite(planId),
    onSuccess: (plans) => {
      queryClient.setQueryData(['interruptPlans'], plans);
    },
  });

  const markHelpfulMutation = useMutation({
    mutationFn: ({ planId, helpful }: { planId: string; helpful: boolean }) =>
      markHelpful(planId, helpful),
    onSuccess: (plans) => {
      queryClient.setQueryData(['interruptPlans'], plans);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (planId: string) => deletePlan(planId),
    onSuccess: (plans) => {
      queryClient.setQueryData(['interruptPlans'], plans);
    },
  });

  return {
    plans: plansQuery.data ?? [],
    isLoading: plansQuery.isLoading,
    savePlan: saveMutation.mutate,
    toggleFavorite: toggleFavoriteMutation.mutate,
    markHelpful: markHelpfulMutation.mutate,
    deletePlan: deleteMutation.mutate,
    isSaving: saveMutation.isPending,
  };
}
