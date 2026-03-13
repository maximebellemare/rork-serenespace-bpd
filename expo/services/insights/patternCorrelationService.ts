import { JournalEntry, MessageDraft } from '@/types';
import { MedicationLog } from '@/types/medication';
import { Appointment } from '@/types/appointment';
import { MovementEntry } from '@/types/movement';

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

function getDateKey(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getDayEntries(entries: JournalEntry[]): Map<string, JournalEntry[]> {
  const map = new Map<string, JournalEntry[]>();
  entries.forEach(e => {
    const key = getDateKey(e.timestamp);
    const existing = map.get(key) ?? [];
    existing.push(e);
    map.set(key, existing);
  });
  return map;
}

function averageIntensity(entries: JournalEntry[]): number {
  if (entries.length === 0) return 0;
  return entries.reduce((s, e) => s + e.checkIn.intensityLevel, 0) / entries.length;
}

export interface MedicationMoodCorrelation {
  hasMedDays: number;
  noMedDays: number;
  avgWithMed: number;
  avgWithoutMed: number;
  difference: number;
  takenCount: number;
  missedCount: number;
}

export function analyzeMedicationMoodCorrelation(
  entries: JournalEntry[],
  logs: MedicationLog[],
  days: number = 30,
): MedicationMoodCorrelation | null {
  console.log('[PatternCorrelation] Analyzing medication-mood correlation');
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const recentEntries = entries.filter(e => e.timestamp >= cutoff);
  const recentLogs = logs.filter(l => l.timestamp >= cutoff);

  if (recentEntries.length < 3 || recentLogs.length < 2) return null;

  const dayEntries = getDayEntries(recentEntries);
  const medDays = new Set<string>();
  const missedDays = new Set<string>();

  recentLogs.forEach(log => {
    const key = getDateKey(log.timestamp);
    if (log.status === 'taken') medDays.add(key);
    if (log.status === 'missed') missedDays.add(key);
  });

  let totalWithMed = 0;
  let countWithMed = 0;
  let totalWithoutMed = 0;
  let countWithoutMed = 0;

  dayEntries.forEach((dayE, key) => {
    const avg = averageIntensity(dayE);
    if (medDays.has(key)) {
      totalWithMed += avg;
      countWithMed++;
    } else if (missedDays.has(key)) {
      totalWithoutMed += avg;
      countWithoutMed++;
    }
  });

  if (countWithMed < 2 || countWithoutMed < 1) return null;

  const avgWith = Math.round((totalWithMed / countWithMed) * 10) / 10;
  const avgWithout = Math.round((totalWithoutMed / countWithoutMed) * 10) / 10;

  return {
    hasMedDays: countWithMed,
    noMedDays: countWithoutMed,
    avgWithMed: avgWith,
    avgWithoutMed: avgWithout,
    difference: Math.round((avgWithout - avgWith) * 10) / 10,
    takenCount: recentLogs.filter(l => l.status === 'taken').length,
    missedCount: recentLogs.filter(l => l.status === 'missed').length,
  };
}

export interface AppointmentIntensityCorrelation {
  avgBeforeAppointment: number;
  avgAfterAppointment: number;
  difference: number;
  appointmentCount: number;
}

export function analyzeAppointmentIntensityCorrelation(
  entries: JournalEntry[],
  appointments: Appointment[],
): AppointmentIntensityCorrelation | null {
  console.log('[PatternCorrelation] Analyzing appointment-intensity correlation');
  const completedAppts = appointments.filter(a => a.completed || a.dateTime < Date.now());
  if (completedAppts.length < 1 || entries.length < 3) return null;

  let totalBefore = 0;
  let countBefore = 0;
  let totalAfter = 0;
  let countAfter = 0;

  completedAppts.forEach(appt => {
    const twoDaysBefore = appt.dateTime - 2 * 24 * 60 * 60 * 1000;
    const twoDaysAfter = appt.dateTime + 2 * 24 * 60 * 60 * 1000;

    const beforeEntries = entries.filter(e =>
      e.timestamp >= twoDaysBefore && e.timestamp < appt.dateTime
    );
    const afterEntries = entries.filter(e =>
      e.timestamp > appt.dateTime && e.timestamp <= twoDaysAfter
    );

    if (beforeEntries.length > 0) {
      totalBefore += averageIntensity(beforeEntries);
      countBefore++;
    }
    if (afterEntries.length > 0) {
      totalAfter += averageIntensity(afterEntries);
      countAfter++;
    }
  });

  if (countBefore < 1 && countAfter < 1) return null;

  const avgBefore = countBefore > 0 ? Math.round((totalBefore / countBefore) * 10) / 10 : 0;
  const avgAfter = countAfter > 0 ? Math.round((totalAfter / countAfter) * 10) / 10 : 0;

  return {
    avgBeforeAppointment: avgBefore,
    avgAfterAppointment: avgAfter,
    difference: Math.round((avgBefore - avgAfter) * 10) / 10,
    appointmentCount: completedAppts.length,
  };
}

export interface CheckinRoutineCorrelation {
  consistentDays: number;
  inconsistentDays: number;
  avgConsistent: number;
  avgInconsistent: number;
  difference: number;
}

export function analyzeCheckinRoutineCorrelation(
  entries: JournalEntry[],
  days: number = 30,
): CheckinRoutineCorrelation | null {
  console.log('[PatternCorrelation] Analyzing checkin-routine correlation');
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const recentEntries = entries.filter(e => e.timestamp >= cutoff);
  if (recentEntries.length < 5) return null;

  const dayEntries = getDayEntries(recentEntries);
  const sortedDays = Array.from(dayEntries.keys()).sort();

  let consecutiveGroups: { days: string[]; avgIntensity: number }[] = [];
  let currentGroup: string[] = [];

  for (let i = 0; i < sortedDays.length; i++) {
    if (i === 0) {
      currentGroup = [sortedDays[i]];
      continue;
    }
    const prev = new Date(sortedDays[i - 1]);
    const curr = new Date(sortedDays[i]);
    const diffMs = curr.getTime() - prev.getTime();
    if (diffMs <= 2 * 24 * 60 * 60 * 1000) {
      currentGroup.push(sortedDays[i]);
    } else {
      if (currentGroup.length >= 2) {
        const groupEntries = currentGroup.flatMap(d => dayEntries.get(d) ?? []);
        consecutiveGroups.push({
          days: currentGroup,
          avgIntensity: averageIntensity(groupEntries),
        });
      }
      currentGroup = [sortedDays[i]];
    }
  }
  if (currentGroup.length >= 2) {
    const groupEntries = currentGroup.flatMap(d => dayEntries.get(d) ?? []);
    consecutiveGroups.push({
      days: currentGroup,
      avgIntensity: averageIntensity(groupEntries),
    });
  }

  const consistentEntries = consecutiveGroups.flatMap(g =>
    g.days.flatMap(d => dayEntries.get(d) ?? [])
  );
  const consistentDaySet = new Set(consecutiveGroups.flatMap(g => g.days));
  const inconsistentEntries = recentEntries.filter(
    e => !consistentDaySet.has(getDateKey(e.timestamp))
  );

  if (consistentEntries.length < 2 || inconsistentEntries.length < 2) return null;

  const avgConsistent = Math.round(averageIntensity(consistentEntries) * 10) / 10;
  const avgInconsistent = Math.round(averageIntensity(inconsistentEntries) * 10) / 10;

  return {
    consistentDays: consistentDaySet.size,
    inconsistentDays: sortedDays.length - consistentDaySet.size,
    avgConsistent,
    avgInconsistent,
    difference: Math.round((avgInconsistent - avgConsistent) * 10) / 10,
  };
}

export interface PauseRegretCorrelation {
  pausedCount: number;
  notPausedCount: number;
  pausedRegretRate: number;
  notPausedRegretRate: number;
  difference: number;
}

export function analyzePauseRegretCorrelation(
  messageDrafts: MessageDraft[],
): PauseRegretCorrelation | null {
  console.log('[PatternCorrelation] Analyzing pause-regret correlation');
  const cutoff = Date.now() - THIRTY_DAYS;
  const recent = messageDrafts.filter(m => m.timestamp >= cutoff);
  if (recent.length < 3) return null;

  const paused = recent.filter(m => m.paused || m.rewrittenText);
  const notPaused = recent.filter(m => !m.paused && !m.rewrittenText && m.sent);

  if (paused.length < 1 || notPaused.length < 1) return null;

  const pausedRegret = paused.filter(m => m.outcome === 'made_worse').length;
  const notPausedRegret = notPaused.filter(m => m.outcome === 'made_worse').length;

  const pausedRate = Math.round((pausedRegret / paused.length) * 100);
  const notPausedRate = Math.round((notPausedRegret / notPaused.length) * 100);

  return {
    pausedCount: paused.length,
    notPausedCount: notPaused.length,
    pausedRegretRate: pausedRate,
    notPausedRegretRate: notPausedRate,
    difference: notPausedRate - pausedRate,
  };
}

export interface CopingDistressCorrelation {
  tool: string;
  timesUsed: number;
  avgReduction: number;
}

export function analyzeCopingDistressCorrelation(
  entries: JournalEntry[],
  days: number = 30,
): CopingDistressCorrelation[] {
  console.log('[PatternCorrelation] Analyzing coping-distress correlation');
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const sorted = entries
    .filter(e => e.timestamp >= cutoff)
    .sort((a, b) => a.timestamp - b.timestamp);

  const toolEffects: Record<string, { reductions: number[]; count: number }> = {};

  for (let i = 0; i < sorted.length; i++) {
    const entry = sorted[i];
    if (!entry.checkIn.copingUsed || entry.checkIn.copingUsed.length === 0) continue;
    const next = sorted[i + 1];
    if (!next) continue;
    const reduction = entry.checkIn.intensityLevel - next.checkIn.intensityLevel;
    entry.checkIn.copingUsed.forEach(tool => {
      if (!toolEffects[tool]) toolEffects[tool] = { reductions: [], count: 0 };
      toolEffects[tool].reductions.push(reduction);
      toolEffects[tool].count++;
    });
  }

  return Object.entries(toolEffects)
    .map(([tool, data]) => ({
      tool,
      timesUsed: data.count,
      avgReduction: Math.round((data.reductions.reduce((s, r) => s + r, 0) / data.count) * 10) / 10,
    }))
    .filter(t => t.timesUsed >= 2)
    .sort((a, b) => b.avgReduction - a.avgReduction);
}

export interface MedicationMoodAfterCorrelation {
  betterCount: number;
  sameCount: number;
  worseCount: number;
  totalLogs: number;
  betterRate: number;
}

export function analyzeMedicationMoodAfter(
  logs: MedicationLog[],
): MedicationMoodAfterCorrelation | null {
  console.log('[PatternCorrelation] Analyzing medication mood-after logs');
  const cutoff = Date.now() - THIRTY_DAYS;
  const recentWithMood = logs.filter(
    l => l.timestamp >= cutoff && l.status === 'taken' && l.moodAfter !== null
  );

  if (recentWithMood.length < 3) return null;

  const better = recentWithMood.filter(l => l.moodAfter === 'much_better' || l.moodAfter === 'better').length;
  const same = recentWithMood.filter(l => l.moodAfter === 'same').length;
  const worse = recentWithMood.filter(l => l.moodAfter === 'worse' || l.moodAfter === 'much_worse').length;

  return {
    betterCount: better,
    sameCount: same,
    worseCount: worse,
    totalLogs: recentWithMood.length,
    betterRate: Math.round((better / recentWithMood.length) * 100),
  };
}

export interface TimeOfDayCorrelation {
  period: string;
  avgIntensity: number;
  checkInCount: number;
}

export function analyzeTimeOfDayCorrelation(
  entries: JournalEntry[],
  days: number = 30,
): TimeOfDayCorrelation[] {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const recent = entries.filter(e => e.timestamp >= cutoff);
  if (recent.length < 4) return [];

  const buckets: Record<string, { total: number; count: number }> = {
    'Morning': { total: 0, count: 0 },
    'Afternoon': { total: 0, count: 0 },
    'Evening': { total: 0, count: 0 },
    'Late night': { total: 0, count: 0 },
  };

  recent.forEach(e => {
    const hour = new Date(e.timestamp).getHours();
    let period: string;
    if (hour < 6) period = 'Late night';
    else if (hour < 12) period = 'Morning';
    else if (hour < 18) period = 'Afternoon';
    else period = 'Evening';

    buckets[period].total += e.checkIn.intensityLevel;
    buckets[period].count++;
  });

  return Object.entries(buckets)
    .filter(([, v]) => v.count >= 2)
    .map(([period, v]) => ({
      period,
      avgIntensity: Math.round((v.total / v.count) * 10) / 10,
      checkInCount: v.count,
    }))
    .sort((a, b) => b.avgIntensity - a.avgIntensity);
}

export interface ManagedOutcomeCorrelation {
  managedRate: number;
  managedWithCoping: number;
  managedWithoutCoping: number;
  totalManaged: number;
  totalEntries: number;
}

export interface MovementMoodCorrelation {
  totalEntries: number;
  avgMoodShift: number;
  improvedCount: number;
  improvedRate: number;
  avgDistressOnMovementDays: number;
  avgDistressOnNonMovementDays: number;
  distressDifference: number;
}

export function analyzeMovementMoodCorrelation(
  entries: JournalEntry[],
  movementEntries: MovementEntry[],
  days: number = 30,
): MovementMoodCorrelation | null {
  console.log('[PatternCorrelation] Analyzing movement-mood correlation');
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const recentJournal = entries.filter(e => e.timestamp >= cutoff);
  const recentMovement = movementEntries.filter(e => e.timestamp >= cutoff);

  if (recentMovement.length < 2 || recentJournal.length < 3) return null;

  const improved = recentMovement.filter(m => m.moodAfter > m.moodBefore);
  const totalShift = recentMovement.reduce((s, m) => s + (m.moodAfter - m.moodBefore), 0);
  const avgShift = Math.round((totalShift / recentMovement.length) * 10) / 10;

  const movementDays = new Set<string>();
  recentMovement.forEach(m => movementDays.add(getDateKey(m.timestamp)));

  const dayEntries = getDayEntries(recentJournal);
  let totalMovDay = 0;
  let countMovDay = 0;
  let totalNonMovDay = 0;
  let countNonMovDay = 0;

  dayEntries.forEach((dayE, key) => {
    const avg = averageIntensity(dayE);
    if (movementDays.has(key)) {
      totalMovDay += avg;
      countMovDay++;
    } else {
      totalNonMovDay += avg;
      countNonMovDay++;
    }
  });

  const avgMovDay = countMovDay > 0 ? Math.round((totalMovDay / countMovDay) * 10) / 10 : 0;
  const avgNonMovDay = countNonMovDay > 0 ? Math.round((totalNonMovDay / countNonMovDay) * 10) / 10 : 0;

  return {
    totalEntries: recentMovement.length,
    avgMoodShift: avgShift,
    improvedCount: improved.length,
    improvedRate: Math.round((improved.length / recentMovement.length) * 100),
    avgDistressOnMovementDays: avgMovDay,
    avgDistressOnNonMovementDays: avgNonMovDay,
    distressDifference: Math.round((avgNonMovDay - avgMovDay) * 10) / 10,
  };
}

export function analyzeManagedOutcomes(
  entries: JournalEntry[],
  days: number = 30,
): ManagedOutcomeCorrelation | null {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const recent = entries.filter(e => e.timestamp >= cutoff);
  if (recent.length < 3) return null;

  const managed = recent.filter(e => e.outcome === 'managed');
  const withCoping = managed.filter(e => e.checkIn.copingUsed && e.checkIn.copingUsed.length > 0);
  const withoutCoping = managed.filter(e => !e.checkIn.copingUsed || e.checkIn.copingUsed.length === 0);

  return {
    managedRate: Math.round((managed.length / recent.length) * 100),
    managedWithCoping: withCoping.length,
    managedWithoutCoping: withoutCoping.length,
    totalManaged: managed.length,
    totalEntries: recent.length,
  };
}
