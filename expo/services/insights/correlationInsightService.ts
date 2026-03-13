import { JournalEntry, MessageDraft } from '@/types';
import { MedicationLog } from '@/types/medication';
import { Appointment } from '@/types/appointment';
import {
  CorrelationInsight,
  CorrelationSummary,
  WhatHelpsItem,
  CorrelationStrength,
} from '@/types/correlationInsight';
import {
  analyzeMedicationMoodCorrelation,
  analyzeAppointmentIntensityCorrelation,
  analyzeCheckinRoutineCorrelation,
  analyzePauseRegretCorrelation,
  analyzeCopingDistressCorrelation,
  analyzeMedicationMoodAfter,
  analyzeTimeOfDayCorrelation,
  analyzeManagedOutcomes,
} from './patternCorrelationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CORRELATION_INSIGHTS_KEY = 'correlation_insights';

function strengthFromDifference(diff: number): CorrelationStrength {
  const abs = Math.abs(diff);
  if (abs >= 2) return 'strong';
  if (abs >= 1) return 'moderate';
  return 'weak';
}

function strengthFromRate(rate: number): CorrelationStrength {
  if (rate >= 30) return 'strong';
  if (rate >= 15) return 'moderate';
  return 'weak';
}

export function generateCorrelationInsights(
  entries: JournalEntry[],
  messageDrafts: MessageDraft[],
  medicationLogs: MedicationLog[],
  appointments: Appointment[],
): CorrelationInsight[] {
  console.log('[CorrelationInsight] Generating from', entries.length, 'entries,', medicationLogs.length, 'med logs,', appointments.length, 'appointments');

  const now = Date.now();
  const insights: CorrelationInsight[] = [];

  const medMood = analyzeMedicationMoodCorrelation(entries, medicationLogs);
  if (medMood && medMood.difference > 0.5) {
    const strength = strengthFromDifference(medMood.difference);
    insights.push({
      id: `corr_med_mood_${now}`,
      category: 'medication_mood',
      title: 'Medication and calmer days',
      narrative: `Days when you took your medication seem to average ${medMood.avgWithMed}/10 distress, compared to ${medMood.avgWithoutMed}/10 on missed days. That's a difference of about ${medMood.difference} points.`,
      supportiveNote: 'Consistency with medication often builds gradually. Even small differences matter over time.',
      strength,
      direction: 'positive',
      confidence: Math.min(0.5 + (medMood.hasMedDays + medMood.noMedDays) * 0.03, 0.9),
      dataPoints: medMood.hasMedDays + medMood.noMedDays,
      sourceA: 'Medication logs',
      sourceB: 'Check-in distress',
      generatedAt: now,
      viewed: false,
    });
  }

  const medMoodAfter = analyzeMedicationMoodAfter(medicationLogs);
  if (medMoodAfter && medMoodAfter.betterRate >= 40) {
    insights.push({
      id: `corr_med_mood_after_${now}`,
      category: 'medication_mood',
      title: 'Medication seems to be helping',
      narrative: `You reported feeling better after taking medication ${medMoodAfter.betterRate}% of the time (${medMoodAfter.betterCount} out of ${medMoodAfter.totalLogs} logs).`,
      supportiveNote: 'Tracking how you feel after medication helps you and your provider make better decisions together.',
      strength: strengthFromRate(medMoodAfter.betterRate),
      direction: 'positive',
      confidence: Math.min(0.5 + medMoodAfter.totalLogs * 0.04, 0.9),
      dataPoints: medMoodAfter.totalLogs,
      sourceA: 'Medication mood logs',
      sourceB: 'Self-reported wellbeing',
      generatedAt: now,
      viewed: false,
    });
  }

  const apptIntensity = analyzeAppointmentIntensityCorrelation(entries, appointments);
  if (apptIntensity && apptIntensity.appointmentCount >= 1) {
    const beforeHigher = apptIntensity.difference > 0.3;
    const afterHigher = apptIntensity.difference < -0.3;

    if (beforeHigher) {
      insights.push({
        id: `corr_appt_before_${now}`,
        category: 'appointment_intensity',
        title: 'More activated before appointments',
        narrative: `You often seem more activated before appointments (avg ${apptIntensity.avgBeforeAppointment}/10) compared to after (avg ${apptIntensity.avgAfterAppointment}/10).`,
        supportiveNote: 'Pre-appointment activation is very common. Your nervous system may be preparing for emotional work.',
        strength: strengthFromDifference(apptIntensity.difference),
        direction: 'neutral',
        confidence: Math.min(0.4 + apptIntensity.appointmentCount * 0.1, 0.85),
        dataPoints: apptIntensity.appointmentCount * 2,
        sourceA: 'Appointments',
        sourceB: 'Check-in distress',
        generatedAt: now,
        viewed: false,
      });
    } else if (afterHigher) {
      insights.push({
        id: `corr_appt_after_${now}`,
        category: 'appointment_intensity',
        title: 'Sessions may stir things up',
        narrative: `Distress tends to be slightly higher after appointments (avg ${apptIntensity.avgAfterAppointment}/10) compared to before (avg ${apptIntensity.avgBeforeAppointment}/10).`,
        supportiveNote: 'This is actually normal. Therapy can surface difficult feelings. The discomfort often means important work is happening.',
        strength: strengthFromDifference(Math.abs(apptIntensity.difference)),
        direction: 'neutral',
        confidence: Math.min(0.4 + apptIntensity.appointmentCount * 0.1, 0.8),
        dataPoints: apptIntensity.appointmentCount * 2,
        sourceA: 'Appointments',
        sourceB: 'Check-in distress',
        generatedAt: now,
        viewed: false,
      });
    }
  }

  const checkinRoutine = analyzeCheckinRoutineCorrelation(entries);
  if (checkinRoutine && checkinRoutine.difference > 0.3) {
    insights.push({
      id: `corr_routine_${now}`,
      category: 'checkin_routine',
      title: 'Consistency and lower distress',
      narrative: `When you check in consistently, distress averages ${checkinRoutine.avgConsistent}/10, compared to ${checkinRoutine.avgInconsistent}/10 on sporadic days.`,
      supportiveNote: 'Regular self-awareness seems to create a calming effect. The act of noticing may be part of what helps.',
      strength: strengthFromDifference(checkinRoutine.difference),
      direction: 'positive',
      confidence: Math.min(0.5 + (checkinRoutine.consistentDays) * 0.03, 0.85),
      dataPoints: checkinRoutine.consistentDays + checkinRoutine.inconsistentDays,
      sourceA: 'Check-in consistency',
      sourceB: 'Distress levels',
      generatedAt: now,
      viewed: false,
    });
  }

  const pauseRegret = analyzePauseRegretCorrelation(messageDrafts);
  if (pauseRegret && pauseRegret.difference > 5) {
    insights.push({
      id: `corr_pause_${now}`,
      category: 'pause_regret',
      title: 'Pausing before sending seems to help',
      narrative: `Messages sent after pausing or rewriting had a ${pauseRegret.pausedRegretRate}% regret rate, compared to ${pauseRegret.notPausedRegretRate}% when sent immediately.`,
      supportiveNote: 'That small pause creates space for your wisest self to show up. It is a powerful practice.',
      strength: strengthFromRate(pauseRegret.difference),
      direction: 'positive',
      confidence: Math.min(0.5 + (pauseRegret.pausedCount + pauseRegret.notPausedCount) * 0.03, 0.9),
      dataPoints: pauseRegret.pausedCount + pauseRegret.notPausedCount,
      sourceA: 'Message Guard usage',
      sourceB: 'Message outcomes',
      generatedAt: now,
      viewed: false,
    });
  }

  const copingCorrelations = analyzeCopingDistressCorrelation(entries);
  if (copingCorrelations.length > 0) {
    const best = copingCorrelations[0];
    if (best.avgReduction > 0.5) {
      insights.push({
        id: `corr_coping_${now}`,
        category: 'coping_distress',
        title: `"${best.tool}" tends to reduce distress`,
        narrative: `Using "${best.tool}" was followed by an average ${best.avgReduction}-point drop in distress across ${best.timesUsed} uses.`,
        supportiveNote: 'Finding tools that genuinely help is a sign of growing self-knowledge.',
        strength: strengthFromDifference(best.avgReduction),
        direction: 'positive',
        confidence: Math.min(0.5 + best.timesUsed * 0.06, 0.9),
        dataPoints: best.timesUsed,
        sourceA: 'Coping tool usage',
        sourceB: 'Distress change',
        generatedAt: now,
        viewed: false,
      });
    }
  }

  const timePeriods = analyzeTimeOfDayCorrelation(entries);
  if (timePeriods.length >= 2) {
    const highest = timePeriods[0];
    const lowest = timePeriods[timePeriods.length - 1];
    const diff = highest.avgIntensity - lowest.avgIntensity;
    if (diff >= 1.5) {
      insights.push({
        id: `corr_time_${now}`,
        category: 'time_pattern',
        title: `${highest.period}s tend to be harder`,
        narrative: `Distress averages ${highest.avgIntensity}/10 in the ${highest.period.toLowerCase()}, compared to ${lowest.avgIntensity}/10 in the ${lowest.period.toLowerCase()}.`,
        supportiveNote: 'Knowing your harder times of day helps you prepare and be extra gentle with yourself.',
        strength: strengthFromDifference(diff),
        direction: 'negative',
        confidence: Math.min(0.4 + highest.checkInCount * 0.05, 0.85),
        dataPoints: highest.checkInCount + lowest.checkInCount,
        sourceA: 'Time of day',
        sourceB: 'Distress levels',
        generatedAt: now,
        viewed: false,
      });
    }
  }

  const managed = analyzeManagedOutcomes(entries);
  if (managed && managed.managedWithCoping >= 2 && managed.managedRate >= 30) {
    insights.push({
      id: `corr_managed_${now}`,
      category: 'routine_stability',
      title: 'Coping tools and managing emotions',
      narrative: `You managed ${managed.managedRate}% of emotional situations recently. ${managed.managedWithCoping} of those involved using a coping tool.`,
      supportiveNote: 'Each managed moment builds confidence and resilience. You are developing real skills.',
      strength: managed.managedRate >= 60 ? 'strong' : managed.managedRate >= 40 ? 'moderate' : 'weak',
      direction: 'positive',
      confidence: Math.min(0.5 + managed.totalEntries * 0.03, 0.85),
      dataPoints: managed.totalEntries,
      sourceA: 'Coping tool usage',
      sourceB: 'Emotional outcomes',
      generatedAt: now,
      viewed: false,
    });
  }

  const sorted = insights.sort((a, b) => b.confidence - a.confidence);
  console.log('[CorrelationInsight] Generated', sorted.length, 'correlation insights');
  return sorted;
}

export function buildCorrelationSummary(insights: CorrelationInsight[]): CorrelationSummary {
  const strong = insights.filter(i => i.strength === 'strong');
  const helpful = insights.find(i => i.direction === 'positive');
  const concern = insights.find(i => i.direction === 'negative');

  return {
    totalCorrelations: insights.length,
    strongCorrelations: strong.length,
    topHelpful: helpful ?? null,
    topConcern: concern ?? null,
    lastGeneratedAt: insights.length > 0 ? insights[0].generatedAt : 0,
  };
}

export function buildWhatHelps(insights: CorrelationInsight[]): WhatHelpsItem[] {
  const items: WhatHelpsItem[] = [];
  const positive = insights.filter(i => i.direction === 'positive');

  const emojiMap: Record<string, string> = {
    medication_mood: '💊',
    coping_distress: '🛡️',
    checkin_routine: '📝',
    pause_regret: '⏸️',
    routine_stability: '🌱',
    appointment_intensity: '🗓️',
    movement_mood: '🚶',
    relationship_outcome: '💬',
    time_pattern: '🕐',
  };

  positive.forEach(insight => {
    items.push({
      id: insight.id,
      label: insight.title,
      description: insight.narrative,
      strength: insight.strength,
      emoji: emojiMap[insight.category] ?? '✨',
      category: insight.category,
    });
  });

  return items.sort((a, b) => {
    const order: Record<string, number> = { strong: 0, moderate: 1, weak: 2 };
    return (order[a.strength] ?? 2) - (order[b.strength] ?? 2);
  });
}

export async function saveCorrelationInsights(insights: CorrelationInsight[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CORRELATION_INSIGHTS_KEY, JSON.stringify(insights));
    console.log('[CorrelationInsight] Saved', insights.length, 'insights');
  } catch (error) {
    console.error('[CorrelationInsight] Failed to save:', error);
  }
}

export async function getStoredCorrelationInsights(): Promise<CorrelationInsight[]> {
  try {
    const stored = await AsyncStorage.getItem(CORRELATION_INSIGHTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('[CorrelationInsight] Failed to load:', error);
    return [];
  }
}

export async function markCorrelationViewed(insightId: string): Promise<void> {
  try {
    const insights = await getStoredCorrelationInsights();
    const updated = insights.map(i => i.id === insightId ? { ...i, viewed: true } : i);
    await saveCorrelationInsights(updated);
  } catch (error) {
    console.error('[CorrelationInsight] Failed to mark viewed:', error);
  }
}
