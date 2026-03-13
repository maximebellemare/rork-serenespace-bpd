import { getFlowById, GUIDED_FLOWS } from '@/data/companionSkillFlows';
import { storageService } from '@/services/storage/storageService';
import { trackEvent } from '@/services/analytics/analyticsService';

const FLOW_HISTORY_KEY = 'bpd_companion_flow_history';

export interface GuidedFlowSession {
  id: string;
  flowId: string;
  startedAt: number;
  completedAt?: number;
  currentStepIndex: number;
  reflections: FlowReflection[];
  distressBefore?: number;
  distressAfter?: number;
  status: 'in_progress' | 'completed' | 'abandoned';
}

export interface FlowReflection {
  stepIndex: number;
  question: string;
  response: string;
  timestamp: number;
}

export interface GuidedFlowHistory {
  sessions: GuidedFlowSession[];
  completedFlowIds: string[];
  lastUpdated: number;
}

export async function loadFlowHistory(): Promise<GuidedFlowHistory> {
  try {
    const stored = await storageService.get<GuidedFlowHistory>(FLOW_HISTORY_KEY);
    return stored ?? { sessions: [], completedFlowIds: [], lastUpdated: Date.now() };
  } catch (error) {
    console.log('[GuidedFlow] Error loading history:', error);
    return { sessions: [], completedFlowIds: [], lastUpdated: Date.now() };
  }
}

export async function saveFlowHistory(history: GuidedFlowHistory): Promise<void> {
  try {
    history.lastUpdated = Date.now();
    await storageService.set(FLOW_HISTORY_KEY, history);
    console.log('[GuidedFlow] Saved flow history');
  } catch (error) {
    console.log('[GuidedFlow] Error saving history:', error);
  }
}

export function startFlowSession(flowId: string, distressBefore?: number): GuidedFlowSession {
  const session: GuidedFlowSession = {
    id: `fsess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    flowId,
    startedAt: Date.now(),
    currentStepIndex: 0,
    reflections: [],
    distressBefore,
    status: 'in_progress',
  };

  void trackEvent('companion_skill_flow_started', {
    flow_id: flowId,
    distress_before: distressBefore ?? 0,
  });

  console.log('[GuidedFlow] Session started:', session.id, 'flow:', flowId);
  return session;
}

export function advanceFlowStep(session: GuidedFlowSession): GuidedFlowSession {
  const flow = getFlowById(session.flowId);
  if (!flow) return session;

  const nextIndex = session.currentStepIndex + 1;
  if (nextIndex >= flow.steps.length) {
    return {
      ...session,
      currentStepIndex: nextIndex,
      status: 'completed',
      completedAt: Date.now(),
    };
  }
  return { ...session, currentStepIndex: nextIndex };
}

export function addFlowReflection(
  session: GuidedFlowSession,
  stepIndex: number,
  question: string,
  response: string,
): GuidedFlowSession {
  return {
    ...session,
    reflections: [
      ...session.reflections,
      { stepIndex, question, response, timestamp: Date.now() },
    ],
  };
}

export async function completeFlowSession(
  session: GuidedFlowSession,
  distressAfter?: number,
): Promise<GuidedFlowSession> {
  const completed: GuidedFlowSession = {
    ...session,
    status: 'completed',
    completedAt: Date.now(),
    distressAfter,
  };

  const history = await loadFlowHistory();
  history.sessions = [completed, ...history.sessions].slice(0, 100);
  if (!history.completedFlowIds.includes(session.flowId)) {
    history.completedFlowIds.push(session.flowId);
  }
  await saveFlowHistory(history);

  const flow = getFlowById(session.flowId);
  void trackEvent('companion_skill_flow_completed', {
    flow_id: session.flowId,
    distress_before: session.distressBefore ?? 0,
    distress_after: distressAfter ?? 0,
    reflections_count: session.reflections.length,
    flow_category: flow?.category ?? 'unknown',
  });

  console.log('[GuidedFlow] Session completed:', session.id);
  return completed;
}

export function generateFlowCompletionInsight(session: GuidedFlowSession): string {
  const flow = getFlowById(session.flowId);
  if (!flow) return 'You completed a guided practice.';

  const hasDistressData = session.distressBefore !== undefined && session.distressAfter !== undefined;
  const reduction = hasDistressData ? (session.distressBefore! - session.distressAfter!) : 0;

  let insight = flow.completionInsight;

  if (reduction >= 3) {
    insight += ' Your distress dropped significantly — this approach seems to work well for you.';
  } else if (reduction > 0) {
    insight += ' Your distress eased a little. Even small shifts build resilience over time.';
  }

  if (session.reflections.length >= 3) {
    insight += ' Your willingness to reflect deeply shows real emotional courage.';
  }

  return insight;
}

export async function getFlowStats(): Promise<{
  totalCompleted: number;
  uniqueFlows: number;
  totalFlows: number;
  averageDistressReduction: number;
  mostPracticedCategory: string | null;
}> {
  const history = await loadFlowHistory();
  const completed = history.sessions.filter(s => s.status === 'completed');

  const withDistress = completed.filter(
    s => s.distressBefore !== undefined && s.distressAfter !== undefined,
  );
  const avgReduction = withDistress.length > 0
    ? withDistress.reduce((sum, s) => sum + (s.distressBefore! - s.distressAfter!), 0) / withDistress.length
    : 0;

  const categoryCounts = new Map<string, number>();
  for (const s of completed) {
    const flow = getFlowById(s.flowId);
    if (flow) {
      categoryCounts.set(flow.category, (categoryCounts.get(flow.category) ?? 0) + 1);
    }
  }
  const topCategory = Array.from(categoryCounts.entries())
    .sort(([, a], [, b]) => b - a)[0];

  return {
    totalCompleted: completed.length,
    uniqueFlows: history.completedFlowIds.length,
    totalFlows: GUIDED_FLOWS.length,
    averageDistressReduction: Math.round(avgReduction * 10) / 10,
    mostPracticedCategory: topCategory ? topCategory[0] : null,
  };
}
