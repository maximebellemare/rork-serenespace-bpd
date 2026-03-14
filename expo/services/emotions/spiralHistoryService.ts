import AsyncStorage from '@react-native-async-storage/async-storage';
import { SpiralHistoryEntry, SpiralRiskLevel, SpiralSignalType } from '@/types/spiral';

const STORAGE_KEY = 'bpd_spiral_history';
const MAX_ENTRIES = 200;

export async function getSpiralHistory(): Promise<SpiralHistoryEntry[]> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) as SpiralHistoryEntry[] : [];
  } catch (err) {
    console.log('[SpiralHistory] Error loading history:', err);
    return [];
  }
}

export async function saveSpiralHistory(entries: SpiralHistoryEntry[]): Promise<void> {
  try {
    const trimmed = entries.slice(0, MAX_ENTRIES);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    console.log('[SpiralHistory] Saved', trimmed.length, 'entries');
  } catch (err) {
    console.log('[SpiralHistory] Error saving history:', err);
  }
}

export async function addSpiralHistoryEntry(entry: SpiralHistoryEntry): Promise<SpiralHistoryEntry[]> {
  const history = await getSpiralHistory();
  const updated = [entry, ...history].slice(0, MAX_ENTRIES);
  await saveSpiralHistory(updated);
  return updated;
}

export interface SpiralTrend {
  period: 'week' | 'month';
  totalDetections: number;
  highRiskCount: number;
  moderateRiskCount: number;
  interventionsUsed: number;
  interventionsSkipped: number;
  averageDistressReduction: number | null;
  mostCommonSignals: { type: SpiralSignalType; count: number }[];
  riskTrend: 'improving' | 'stable' | 'worsening';
  detectionsByDay: { date: string; count: number; peakRisk: SpiralRiskLevel }[];
}

export function computeSpiralTrend(
  history: SpiralHistoryEntry[],
  period: 'week' | 'month',
): SpiralTrend {
  const now = Date.now();
  const periodMs = period === 'week' ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
  const entries = history.filter(e => now - e.timestamp < periodMs);

  const highRiskCount = entries.filter(e => e.riskLevel === 'high').length;
  const moderateRiskCount = entries.filter(e => e.riskLevel === 'moderate').length;
  const interventionsUsed = entries.filter(e => e.interventionUsed !== null).length;
  const interventionsSkipped = entries.filter(e => e.interventionSkipped).length;

  const withDistress = entries.filter(
    e => e.distressBefore !== null && e.distressAfter !== null
  );
  const averageDistressReduction = withDistress.length > 0
    ? withDistress.reduce((sum, e) => sum + ((e.distressBefore ?? 0) - (e.distressAfter ?? 0)), 0) / withDistress.length
    : null;

  const signalCounts: Record<string, number> = {};
  entries.forEach(e => {
    e.signals.forEach(s => {
      signalCounts[s] = (signalCounts[s] || 0) + 1;
    });
  });
  const mostCommonSignals = Object.entries(signalCounts)
    .map(([type, count]) => ({ type: type as SpiralSignalType, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const halfMs = periodMs / 2;
  const recentEntries = entries.filter(e => now - e.timestamp < halfMs);
  const olderEntries = entries.filter(e => now - e.timestamp >= halfMs);

  const recentHighRate = recentEntries.length > 0
    ? recentEntries.filter(e => e.riskLevel === 'high' || e.riskLevel === 'moderate').length / recentEntries.length
    : 0;
  const olderHighRate = olderEntries.length > 0
    ? olderEntries.filter(e => e.riskLevel === 'high' || e.riskLevel === 'moderate').length / olderEntries.length
    : 0;

  let riskTrend: 'improving' | 'stable' | 'worsening' = 'stable';
  if (recentHighRate < olderHighRate - 0.15) riskTrend = 'improving';
  else if (recentHighRate > olderHighRate + 0.15) riskTrend = 'worsening';

  const dayMap: Record<string, { count: number; peakRisk: SpiralRiskLevel }> = {};
  entries.forEach(e => {
    const date = new Date(e.timestamp).toISOString().split('T')[0];
    if (!dayMap[date]) {
      dayMap[date] = { count: 0, peakRisk: 'low' };
    }
    dayMap[date].count++;
    if (e.riskLevel === 'high') dayMap[date].peakRisk = 'high';
    else if (e.riskLevel === 'moderate' && dayMap[date].peakRisk !== 'high') {
      dayMap[date].peakRisk = 'moderate';
    }
  });
  const detectionsByDay = Object.entries(dayMap)
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    period,
    totalDetections: entries.length,
    highRiskCount,
    moderateRiskCount,
    interventionsUsed,
    interventionsSkipped,
    averageDistressReduction,
    mostCommonSignals,
    riskTrend,
    detectionsByDay,
  };
}
