import AsyncStorage from '@react-native-async-storage/async-storage';
import { RiskLevel } from '@/types/messageRisk';

const SAFETY_OUTCOMES_KEY = 'message_safety_outcomes';

export interface SafetyOutcomeRecord {
  id: string;
  timestamp: number;
  riskLevel: RiskLevel;
  action: 'sent_anyway' | 'not_sent' | 'rewrote' | 'paused' | 'saved_vault' | 'journaled' | 'grounded';
  didRegret: boolean;
  conflictEscalated: boolean;
  boundaryHelped: boolean;
  waitingHelped: boolean;
  emotionalState: string | null;
  rewriteTypeUsed: string | null;
}

export interface SafetyLearningInsight {
  id: string;
  text: string;
  category: 'pattern' | 'strength' | 'warning' | 'suggestion';
  emoji: string;
  timestamp: number;
}

export async function saveSafetyOutcome(record: SafetyOutcomeRecord): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(SAFETY_OUTCOMES_KEY);
    const outcomes: SafetyOutcomeRecord[] = stored ? JSON.parse(stored) : [];
    outcomes.unshift(record);
    const trimmed = outcomes.slice(0, 200);
    await AsyncStorage.setItem(SAFETY_OUTCOMES_KEY, JSON.stringify(trimmed));
    console.log('[SafetyOutcome] Saved outcome:', record.id, 'Action:', record.action);
  } catch (err) {
    console.error('[SafetyOutcome] Error saving outcome:', err);
  }
}

export async function getSafetyOutcomes(): Promise<SafetyOutcomeRecord[]> {
  try {
    const stored = await AsyncStorage.getItem(SAFETY_OUTCOMES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (err) {
    console.error('[SafetyOutcome] Error loading outcomes:', err);
    return [];
  }
}

export function generateSafetyInsights(outcomes: SafetyOutcomeRecord[]): SafetyLearningInsight[] {
  console.log('[SafetyLearning] Generating insights from', outcomes.length, 'outcomes');
  const insights: SafetyLearningInsight[] = [];
  const now = Date.now();

  const recentOutcomes = outcomes.filter(o => now - o.timestamp < 30 * 24 * 60 * 60 * 1000);

  if (recentOutcomes.length < 3) {
    return [{
      id: 'getting_started',
      text: 'Use the message safety tool a few more times to unlock personalized insights about your communication patterns.',
      category: 'suggestion',
      emoji: '🌱',
      timestamp: now,
    }];
  }

  const highRiskSentAnyway = recentOutcomes.filter(o =>
    (o.riskLevel === 'severe' || o.riskLevel === 'high') && o.action === 'sent_anyway'
  );
  const highRiskRegrets = highRiskSentAnyway.filter(o => o.didRegret);

  if (highRiskSentAnyway.length >= 2 && highRiskRegrets.length >= 1) {
    insights.push({
      id: 'high_risk_regret',
      text: 'When you send high-risk messages anyway, it often leads to regret. The safety system is trying to protect you.',
      category: 'warning',
      emoji: '⚠️',
      timestamp: now,
    });
  }

  const notSentOutcomes = recentOutcomes.filter(o => o.action === 'not_sent');
  if (notSentOutcomes.length >= 2) {
    insights.push({
      id: 'not_sending_pattern',
      text: `You chose not to send ${notSentOutcomes.length} times recently. That shows real emotional awareness and self-control.`,
      category: 'strength',
      emoji: '💪',
      timestamp: now,
    });
  }

  const pauseHelped = recentOutcomes.filter(o => o.waitingHelped);
  if (pauseHelped.length >= 2) {
    insights.push({
      id: 'pause_works',
      text: `Pausing before sending has helped you ${pauseHelped.length} times. This is one of your most effective regulation tools.`,
      category: 'pattern',
      emoji: '⏳',
      timestamp: now,
    });
  }

  const boundaryHelped = recentOutcomes.filter(o => o.boundaryHelped);
  if (boundaryHelped.length >= 2) {
    insights.push({
      id: 'boundary_effective',
      text: 'Boundary-style rewrites tend to work well for you. They protect your dignity while keeping communication clear.',
      category: 'pattern',
      emoji: '🛡️',
      timestamp: now,
    });
  }

  const escalatedAfterSending = recentOutcomes.filter(o => o.conflictEscalated && o.action === 'sent_anyway');
  if (escalatedAfterSending.length >= 2) {
    insights.push({
      id: 'escalation_pattern',
      text: 'Sending high-intensity messages has led to escalation multiple times. The do-not-send recommendation is calibrated to help you avoid this.',
      category: 'warning',
      emoji: '📈',
      timestamp: now,
    });
  }

  const rewriteTypes: Record<string, number> = {};
  recentOutcomes.forEach(o => {
    if (o.rewriteTypeUsed && !o.didRegret) {
      rewriteTypes[o.rewriteTypeUsed] = (rewriteTypes[o.rewriteTypeUsed] || 0) + 1;
    }
  });

  const bestRewrite = Object.entries(rewriteTypes).sort((a, b) => b[1] - a[1])[0];
  if (bestRewrite && bestRewrite[1] >= 2) {
    insights.push({
      id: 'best_rewrite_style',
      text: `The "${bestRewrite[0]}" rewrite style has worked well for you ${bestRewrite[1]} times without regret.`,
      category: 'pattern',
      emoji: '✨',
      timestamp: now,
    });
  }

  return insights;
}
