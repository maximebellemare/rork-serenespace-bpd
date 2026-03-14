import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SimulationOutcomeRecord,
  ResponsePath,
} from '@/types/messageSimulation';

const SIMULATION_OUTCOMES_KEY = 'message_simulation_outcomes';

export async function saveSimulationOutcome(record: SimulationOutcomeRecord): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(SIMULATION_OUTCOMES_KEY);
    const outcomes: SimulationOutcomeRecord[] = stored ? JSON.parse(stored) : [];
    outcomes.unshift(record);
    const trimmed = outcomes.slice(0, 200);
    await AsyncStorage.setItem(SIMULATION_OUTCOMES_KEY, JSON.stringify(trimmed));
    console.log('[SimulationOutcome] Saved:', record.id, 'Path:', record.selectedPath);
  } catch (err) {
    console.error('[SimulationOutcome] Error saving:', err);
  }
}

export async function getSimulationOutcomes(): Promise<SimulationOutcomeRecord[]> {
  try {
    const stored = await AsyncStorage.getItem(SIMULATION_OUTCOMES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (err) {
    console.error('[SimulationOutcome] Error loading:', err);
    return [];
  }
}

export interface SimulationLearningInsight {
  id: string;
  text: string;
  category: 'pattern' | 'strength' | 'warning' | 'suggestion';
  emoji: string;
}

export function generateSimulationInsights(outcomes: SimulationOutcomeRecord[]): SimulationLearningInsight[] {
  console.log('[SimulationLearning] Generating insights from', outcomes.length, 'outcomes');
  const insights: SimulationLearningInsight[] = [];
  const now = Date.now();
  const recent = outcomes.filter(o => now - o.timestamp < 30 * 24 * 60 * 60 * 1000);

  if (recent.length < 3) {
    return [{
      id: 'sim_getting_started',
      text: 'Use response path simulation a few more times to unlock personalized communication insights.',
      category: 'suggestion',
      emoji: '🌱',
    }];
  }

  const pathCounts: Partial<Record<ResponsePath, number>> = {};
  recent.forEach(o => {
    pathCounts[o.selectedPath] = (pathCounts[o.selectedPath] || 0) + 1;
  });

  const mostUsedPath = Object.entries(pathCounts).sort((a, b) => b[1] - a[1])[0];
  if (mostUsedPath && mostUsedPath[1] >= 2) {
    const pathLabels: Record<string, string> = {
      secure: 'secure',
      boundary: 'boundary',
      do_not_send: 'do not send',
      soft: 'soft',
      avoidant: 'avoidant',
      urgent: 'urgent',
    };
    insights.push({
      id: 'sim_most_used',
      text: `You tend to choose the ${pathLabels[mostUsedPath[0]] ?? mostUsedPath[0]} path most often (${mostUsedPath[1]} times recently).`,
      category: 'pattern',
      emoji: '📊',
    });
  }

  const doNotSendOutcomes = recent.filter(o => o.selectedPath === 'do_not_send');
  if (doNotSendOutcomes.length >= 2) {
    insights.push({
      id: 'sim_dns_strength',
      text: `You've chosen not to send ${doNotSendOutcomes.length} times recently. That takes real self-awareness.`,
      category: 'strength',
      emoji: '💪',
    });
  }

  const urgentSentRegretted = recent.filter(o =>
    o.selectedPath === 'urgent' && o.didSend && o.didRegret
  );
  if (urgentSentRegretted.length >= 1) {
    insights.push({
      id: 'sim_urgent_regret',
      text: 'Urgent-style messages have led to regret. The secure or boundary path may feel slower but works better for you.',
      category: 'warning',
      emoji: '⚠️',
    });
  }

  const waitingHelped = recent.filter(o => o.waitingHelped);
  if (waitingHelped.length >= 2) {
    insights.push({
      id: 'sim_waiting_works',
      text: `Waiting before sending has helped you ${waitingHelped.length} times. Pausing is one of your strongest tools.`,
      category: 'strength',
      emoji: '⏳',
    });
  }

  const secureOutcomes = recent.filter(o => o.selectedPath === 'secure' && o.didSend && !o.didRegret);
  if (secureOutcomes.length >= 2) {
    insights.push({
      id: 'sim_secure_effective',
      text: `Secure rewrites have worked well for you ${secureOutcomes.length} times without regret.`,
      category: 'pattern',
      emoji: '🌿',
    });
  }

  const escalatedAfterSending = recent.filter(o => o.conflictEscalated && o.didSend);
  if (escalatedAfterSending.length >= 2) {
    insights.push({
      id: 'sim_escalation_pattern',
      text: 'Sending during high emotion has led to escalation multiple times. The pause path may be worth trying.',
      category: 'warning',
      emoji: '📈',
    });
  }

  return insights;
}
