import { useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getToolRecords,
  getUsageLogs,
  getPlaybookInsights,
  getPlaybookStats,
  getPlaybookMilestones,
  logToolUsage,
  toggleToolPin,
} from '@/services/playbook/playbookService';
import {
  getAllSituationRecommendations,
  generatePlaybookInsights,
  getWhatHelpedLastTime,
  getBestToolsForEmotion,
} from '@/services/playbook/playbookLearningService';
import type {
  PersonalToolRecord,
  ToolUsageLog,
  PlaybookInsight,
  PlaybookStats,
  PlaybookMilestone,
  SituationRecommendation,
  EmotionalSituation,
} from '@/types/personalPlaybook';


interface PersonalPlaybookState {
  records: PersonalToolRecord[];
  logs: ToolUsageLog[];
  insights: PlaybookInsight[];
  stats: PlaybookStats | null;
  milestones: PlaybookMilestone[];
  recommendations: SituationRecommendation[];
  pinnedTools: PersonalToolRecord[];
  topTools: PersonalToolRecord[];
  isLoading: boolean;
  hasData: boolean;
  reload: () => void;
  pinTool: (toolId: string) => Promise<void>;
  logUsage: (log: ToolUsageLog) => Promise<void>;
  getWhatHelped: (emotion: string) => { tools: PersonalToolRecord[]; situation: EmotionalSituation | null } | null;
  getBestForEmotion: (emotion: string) => PersonalToolRecord[];
}

export function usePersonalPlaybook(): PersonalPlaybookState {
  const queryClient = useQueryClient();

  const recordsQuery = useQuery({
    queryKey: ['playbook', 'records'],
    queryFn: getToolRecords,
    staleTime: 30_000,
  });

  const logsQuery = useQuery({
    queryKey: ['playbook', 'logs'],
    queryFn: getUsageLogs,
    staleTime: 30_000,
  });

  const insightsQuery = useQuery({
    queryKey: ['playbook', 'insights'],
    queryFn: getPlaybookInsights,
    staleTime: 60_000,
  });

  const records = useMemo(() => recordsQuery.data ?? [], [recordsQuery.data]);
  const logs = useMemo(() => logsQuery.data ?? [], [logsQuery.data]);
  const savedInsights = useMemo(() => insightsQuery.data ?? [], [insightsQuery.data]);

  const stats = useMemo<PlaybookStats | null>(() => {
    if (records.length === 0 && logs.length === 0) return null;
    return getPlaybookStats(records, logs);
  }, [records, logs]);

  const milestones = useMemo<PlaybookMilestone[]>(() => {
    if (!stats) return [];
    return getPlaybookMilestones(stats);
  }, [stats]);

  const insights = useMemo<PlaybookInsight[]>(() => {
    if (savedInsights.length > 0) return savedInsights;
    if (records.length === 0 && logs.length === 0) return [];
    return generatePlaybookInsights(records, logs);
  }, [savedInsights, records, logs]);

  const recommendations = useMemo<SituationRecommendation[]>(() => {
    return getAllSituationRecommendations(records, logs);
  }, [records, logs]);

  const pinnedTools = useMemo(() => records.filter(r => r.pinned), [records]);

  const topTools = useMemo(
    () => [...records].sort((a, b) => b.effectivenessScore - a.effectivenessScore).slice(0, 5),
    [records],
  );

  const isLoading = recordsQuery.isLoading || logsQuery.isLoading;
  const hasData = records.length > 0 || logs.length > 0;

  const reload = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['playbook'] });
  }, [queryClient]);

  const pinMutation = useMutation({
    mutationFn: async (toolId: string) => {
      await toggleToolPin(toolId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['playbook', 'records'] });
    },
  });

  const logMutation = useMutation({
    mutationFn: async (log: ToolUsageLog) => {
      await logToolUsage(log);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['playbook'] });
    },
  });

  const getWhatHelped = useCallback(
    (emotion: string) => getWhatHelpedLastTime(emotion, logs, records),
    [logs, records],
  );

  const getBestForEmotion = useCallback(
    (emotion: string) => getBestToolsForEmotion(emotion, records),
    [records],
  );

  return {
    records,
    logs,
    insights,
    stats,
    milestones,
    recommendations,
    pinnedTools,
    topTools,
    isLoading,
    hasData,
    reload,
    pinTool: pinMutation.mutateAsync,
    logUsage: logMutation.mutateAsync,
    getWhatHelped,
    getBestForEmotion,
  };
}

export function usePlaybookForSituation(situation: EmotionalSituation | null) {
  const { recommendations } = usePersonalPlaybook();

  return useMemo(() => {
    if (!situation) return { tools: [], insight: undefined };
    const rec = recommendations.find(r => r.situation === situation);
    return {
      tools: rec?.tools ?? [],
      insight: rec?.insight,
    };
  }, [situation, recommendations]);
}

export function usePlaybookQuickRecommendations(
  currentEmotion: string | null,
  currentIntensity: number,
) {
  const { records, logs, pinnedTools, topTools } = usePersonalPlaybook();

  return useMemo(() => {
    const result: {
      whatHelpedLastTime: { tools: PersonalToolRecord[]; situation: EmotionalSituation | null } | null;
      bestForCurrentEmotion: PersonalToolRecord[];
      quickAccess: PersonalToolRecord[];
      suggestedSituation: EmotionalSituation | null;
    } = {
      whatHelpedLastTime: null,
      bestForCurrentEmotion: [],
      quickAccess: pinnedTools.length > 0 ? pinnedTools.slice(0, 3) : topTools.slice(0, 3),
      suggestedSituation: null,
    };

    if (currentEmotion) {
      result.whatHelpedLastTime = getWhatHelpedLastTime(currentEmotion, logs, records);
      result.bestForCurrentEmotion = getBestToolsForEmotion(currentEmotion, records);

      if (result.whatHelpedLastTime?.situation) {
        result.suggestedSituation = result.whatHelpedLastTime.situation;
      }
    }

    if (currentIntensity >= 7) {
      const crisisTools = records
        .filter(r => r.situations.includes('distress-spike') || r.situations.includes('overwhelmed'))
        .sort((a, b) => b.effectivenessScore - a.effectivenessScore)
        .slice(0, 3);
      if (crisisTools.length > 0) {
        result.quickAccess = crisisTools;
      }
    }

    return result;
  }, [currentEmotion, currentIntensity, records, logs, pinnedTools, topTools]);
}
