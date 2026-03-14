import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  PersonalToolRecord,
  ToolUsageLog,
  PlaybookInsight,
  PlaybookStats,
  PlaybookMilestone,
  EmotionalSituation,
} from '@/types/personalPlaybook';
import { trackEvent } from '@/services/analytics/analyticsService';

const TOOL_RECORDS_KEY = 'playbook_tool_records';
const USAGE_LOGS_KEY = 'playbook_usage_logs';
const INSIGHTS_KEY = 'playbook_insights';

export async function getToolRecords(): Promise<PersonalToolRecord[]> {
  try {
    const data = await AsyncStorage.getItem(TOOL_RECORDS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.log('[PlaybookService] Error loading tool records:', e);
    return [];
  }
}

export async function saveToolRecords(records: PersonalToolRecord[]): Promise<void> {
  try {
    await AsyncStorage.setItem(TOOL_RECORDS_KEY, JSON.stringify(records));
  } catch (e) {
    console.log('[PlaybookService] Error saving tool records:', e);
  }
}

export async function getUsageLogs(): Promise<ToolUsageLog[]> {
  try {
    const data = await AsyncStorage.getItem(USAGE_LOGS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.log('[PlaybookService] Error loading usage logs:', e);
    return [];
  }
}

export async function getPlaybookInsights(): Promise<PlaybookInsight[]> {
  try {
    const data = await AsyncStorage.getItem(INSIGHTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.log('[PlaybookService] Error loading insights:', e);
    return [];
  }
}

export async function savePlaybookInsights(insights: PlaybookInsight[]): Promise<void> {
  try {
    await AsyncStorage.setItem(INSIGHTS_KEY, JSON.stringify(insights.slice(0, 50)));
  } catch (e) {
    console.log('[PlaybookService] Error saving insights:', e);
  }
}

export async function logToolUsage(log: ToolUsageLog): Promise<void> {
  try {
    const logs = await getUsageLogs();
    const updated = [log, ...logs].slice(0, 500);
    await AsyncStorage.setItem(USAGE_LOGS_KEY, JSON.stringify(updated));

    await updateToolRecord(log);

    void trackEvent('playbook_tool_used', {
      toolId: log.toolId,
      toolType: log.toolType,
      emotion: log.emotion,
      situation: log.situation,
      distressBefore: log.distressBefore,
      distressAfter: log.distressAfter,
      helpful: log.helpful === true,
    });

    console.log('[PlaybookService] Logged tool usage:', log.toolId);
  } catch (e) {
    console.log('[PlaybookService] Error logging usage:', e);
  }
}

async function updateToolRecord(log: ToolUsageLog): Promise<void> {
  const records = await getToolRecords();
  const idx = records.findIndex(r => r.toolId === log.toolId);

  const situationTag = inferSituation(log.emotion, log.situation);

  if (idx >= 0) {
    const record = records[idx];
    record.totalUses++;
    if (log.helpful === true) record.helpfulCount++;

    const totalReduction = record.avgDistressReduction * (record.totalUses - 1);
    const newReduction = Math.max(0, log.distressBefore - log.distressAfter);
    record.avgDistressReduction = Math.round(((totalReduction + newReduction) / record.totalUses) * 10) / 10;

    if (situationTag && !record.situations.includes(situationTag)) {
      record.situations.push(situationTag);
    }
    if (log.emotion && !record.emotions.includes(log.emotion)) {
      record.emotions = [...record.emotions, log.emotion].slice(0, 10);
    }
    record.lastUsed = log.timestamp;
    record.effectivenessScore = computeEffectiveness(record);
  } else {
    const newRecord: PersonalToolRecord = {
      toolId: log.toolId,
      toolTitle: log.toolTitle,
      toolType: log.toolType,
      route: '',
      totalUses: 1,
      helpfulCount: log.helpful === true ? 1 : 0,
      avgDistressReduction: Math.max(0, log.distressBefore - log.distressAfter),
      situations: situationTag ? [situationTag] : [],
      emotions: log.emotion ? [log.emotion] : [],
      lastUsed: log.timestamp,
      pinned: false,
      effectivenessScore: 0,
    };
    newRecord.effectivenessScore = computeEffectiveness(newRecord);
    records.push(newRecord);
  }

  await saveToolRecords(records);
}

function computeEffectiveness(record: PersonalToolRecord): number {
  if (record.totalUses === 0) return 0;
  const helpRate = record.helpfulCount / record.totalUses;
  const distressWeight = Math.min(record.avgDistressReduction / 5, 1);
  const usageWeight = Math.min(record.totalUses / 10, 1);
  return Math.round((helpRate * 50 + distressWeight * 30 + usageWeight * 20));
}

function inferSituation(emotion: string, situationStr: string): EmotionalSituation | null {
  const lower = `${emotion} ${situationStr}`.toLowerCase();
  if (lower.includes('reject') || lower.includes('abandon')) return 'rejected';
  if (lower.includes('overwhelm') || lower.includes('flood')) return 'overwhelmed';
  if (lower.includes('shame') || lower.includes('guilt')) return 'ashamed';
  if (lower.includes('anger') || lower.includes('angry') || lower.includes('rage')) return 'angry';
  if (lower.includes('anxious') || lower.includes('anxiety') || lower.includes('worry')) return 'anxious';
  if (lower.includes('lonely') || lower.includes('alone') || lower.includes('isolat')) return 'lonely';
  if (lower.includes('text') || lower.includes('messag') || lower.includes('reply')) return 'before-messaging';
  if (lower.includes('conflict') || lower.includes('fight') || lower.includes('argument')) return 'after-conflict';
  if (lower.includes('numb') || lower.includes('empty') || lower.includes('disconnect')) return 'numb';
  return null;
}

export async function toggleToolPin(toolId: string): Promise<void> {
  const records = await getToolRecords();
  const record = records.find(r => r.toolId === toolId);
  if (record) {
    record.pinned = !record.pinned;
    await saveToolRecords(records);
    void trackEvent('playbook_tool_pinned', { toolId, pinned: record.pinned });
  }
}

export async function removeToolFromPlaybook(toolId: string): Promise<void> {
  const records = await getToolRecords();
  const updated = records.filter(r => r.toolId !== toolId);
  await saveToolRecords(updated);
}

export function getPlaybookStats(
  records: PersonalToolRecord[],
  logs: ToolUsageLog[],
): PlaybookStats {
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const logsThisWeek = logs.filter(l => l.timestamp > weekAgo);

  const totalToolUses = logs.length;
  const toolsThisWeek = logsThisWeek.length;

  const withReduction = logs.filter(l => l.distressBefore > 0);
  const avgDistressReduction = withReduction.length > 0
    ? Math.round(
        (withReduction.reduce((s, l) => s + Math.max(0, l.distressBefore - l.distressAfter), 0) / withReduction.length) * 10
      ) / 10
    : 0;

  const sortedByEffectiveness = [...records].sort((a, b) => b.effectivenessScore - a.effectivenessScore);
  const mostEffectiveTool = sortedByEffectiveness[0] ?? null;

  const situationCounts = new Map<EmotionalSituation, number>();
  for (const record of records) {
    for (const sit of record.situations) {
      situationCounts.set(sit, (situationCounts.get(sit) ?? 0) + record.totalUses);
    }
  }
  const topSituation = situationCounts.size > 0
    ? [...situationCounts.entries()].sort((a, b) => b[1] - a[1])[0][0]
    : null;

  const daySet = new Set<string>();
  for (const log of logs) {
    daySet.add(new Date(log.timestamp).toISOString().slice(0, 10));
  }
  const sortedDays = [...daySet].sort().reverse();
  let streakDays = 0;
  const today = new Date().toISOString().slice(0, 10);
  for (let i = 0; i < sortedDays.length; i++) {
    const expected = new Date(now - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    if (sortedDays[i] === expected || (i === 0 && sortedDays[0] === today)) {
      streakDays++;
    } else {
      break;
    }
  }

  return {
    totalToolUses,
    toolsThisWeek,
    avgDistressReduction,
    streakDays,
    mostEffectiveTool,
    topSituation,
  };
}

export function getPlaybookMilestones(stats: PlaybookStats): PlaybookMilestone[] {
  return [
    {
      id: 'first-tool',
      label: 'First Step',
      description: 'Used your first tool',
      achieved: stats.totalToolUses >= 1,
      achievedAt: stats.totalToolUses >= 1 ? Date.now() : undefined,
      target: 1,
      current: Math.min(stats.totalToolUses, 1),
    },
    {
      id: 'weekly-practice',
      label: 'Weekly Practice',
      description: 'Used 3 tools this week',
      achieved: stats.toolsThisWeek >= 3,
      achievedAt: stats.toolsThisWeek >= 3 ? Date.now() : undefined,
      target: 3,
      current: Math.min(stats.toolsThisWeek, 3),
    },
    {
      id: 'building-habits',
      label: 'Building Habits',
      description: 'Used tools 10 times total',
      achieved: stats.totalToolUses >= 10,
      achievedAt: stats.totalToolUses >= 10 ? Date.now() : undefined,
      target: 10,
      current: Math.min(stats.totalToolUses, 10),
    },
    {
      id: 'regulation-pro',
      label: 'Regulation Pro',
      description: 'Averaged 2+ distress reduction',
      achieved: stats.avgDistressReduction >= 2,
      achievedAt: stats.avgDistressReduction >= 2 ? Date.now() : undefined,
      target: 2,
      current: Math.min(stats.avgDistressReduction, 2),
    },
    {
      id: 'streak-3',
      label: 'Steady Practice',
      description: '3-day tool use streak',
      achieved: stats.streakDays >= 3,
      achievedAt: stats.streakDays >= 3 ? Date.now() : undefined,
      target: 3,
      current: Math.min(stats.streakDays, 3),
    },
  ];
}
