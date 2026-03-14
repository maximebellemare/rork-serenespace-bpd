import { JournalEntry, MessageDraft } from '@/types';
import { SmartJournalEntry } from '@/types/journalEntry';
import {
  SpiralRiskLevel,
  SpiralSignal,
  SpiralSignalType,
  SpiralIntervention,
  SpiralDetectionResult,
  SpiralWeeklyInsight,
  SpiralPausePromptConfig,
} from '@/types/spiral';

function withinHours(timestamp: number, hours: number): boolean {
  return Date.now() - timestamp < hours * 60 * 60 * 1000;
}

function withinDays(timestamp: number, days: number): boolean {
  return Date.now() - timestamp < days * 24 * 60 * 60 * 1000;
}

function getHour(timestamp: number): number {
  return new Date(timestamp).getHours();
}

function detectRapidDistressEscalation(entries: JournalEntry[]): SpiralSignal | null {
  const recent = entries
    .filter(e => withinHours(e.timestamp, 24))
    .sort((a, b) => a.timestamp - b.timestamp);

  if (recent.length < 2) return null;

  let consecutiveRises = 0;
  let maxJump = 0;

  for (let i = 1; i < recent.length; i++) {
    const diff = recent[i].checkIn.intensityLevel - recent[i - 1].checkIn.intensityLevel;
    if (diff > 0) {
      consecutiveRises++;
      if (diff > maxJump) maxJump = diff;
    } else {
      consecutiveRises = 0;
    }
  }

  const latestIntensity = recent[recent.length - 1].checkIn.intensityLevel;
  const firstIntensity = recent[0].checkIn.intensityLevel;
  const totalClimb = latestIntensity - firstIntensity;

  if (consecutiveRises >= 2 || totalClimb >= 3 || maxJump >= 4) {
    const weight = Math.min((consecutiveRises * 1.5) + (totalClimb > 4 ? 2 : 0) + (maxJump >= 4 ? 1.5 : 0), 6);
    return {
      id: 'sp_rapid_escalation',
      type: 'rapid_distress_escalation',
      label: 'Distress climbing quickly',
      narrative: 'Your distress has been rising across recent entries. Slowing down now may help prevent a spiral.',
      weight,
      dataPoints: recent.length,
      detectedAt: Date.now(),
    };
  }

  return null;
}

function detectRepeatedRejectionLanguage(entries: JournalEntry[]): SpiralSignal | null {
  const recent = entries.filter(e => withinHours(e.timestamp, 48));
  let hits = 0;

  const rejectionKeywords = [
    'reject', 'abandon', 'ignored', 'ghosted', 'left out', 'unwanted',
    'not enough', 'unlovable', 'don\'t care', 'doesn\'t care', 'pulled away',
    'replaced', 'forgotten', 'worthless', 'disposable',
  ];

  recent.forEach(entry => {
    const triggerMatch = entry.checkIn.triggers.some(t => {
      const l = t.label.toLowerCase();
      return rejectionKeywords.some(kw => l.includes(kw)) || t.category === 'relationship';
    });

    const emotionMatch = entry.checkIn.emotions.some(e => {
      const l = e.label.toLowerCase();
      return l.includes('reject') || l.includes('abandon') || l.includes('fear') || l.includes('panic');
    });

    if (triggerMatch && emotionMatch) hits += 2;
    else if (triggerMatch || emotionMatch) hits += 1;
  });

  if (hits >= 3) {
    return {
      id: 'sp_rejection_language',
      type: 'repeated_rejection_language',
      label: 'Rejection themes recurring',
      narrative: 'Rejection or abandonment themes have appeared repeatedly. This pattern often intensifies — being aware of it now is powerful.',
      weight: Math.min(hits * 0.9, 5),
      dataPoints: hits,
      detectedAt: Date.now(),
    };
  }

  return null;
}

function detectRelationshipConflictLoop(entries: JournalEntry[], drafts: MessageDraft[]): SpiralSignal | null {
  const recentEntries = entries.filter(e => withinHours(e.timestamp, 48));
  const recentDrafts = drafts.filter(d => withinHours(d.timestamp, 48));

  let conflictPoints = 0;

  recentEntries.forEach(entry => {
    const isRelationship = entry.checkIn.triggers.some(t => t.category === 'relationship');
    if (isRelationship && entry.checkIn.intensityLevel >= 6) conflictPoints += 2;
    else if (isRelationship) conflictPoints += 1;
  });

  const emotionalDrafts = recentDrafts.filter(d => d.rewrittenText || d.paused);
  conflictPoints += emotionalDrafts.length * 1.5;

  const sentUnrewritten = recentDrafts.filter(d => d.sent && !d.rewrittenText && !d.paused);
  conflictPoints += sentUnrewritten.length * 0.5;

  if (conflictPoints >= 5) {
    return {
      id: 'sp_conflict_loop',
      type: 'relationship_conflict_loop',
      label: 'Conflict cycle active',
      narrative: 'A relationship conflict cycle seems to be active. Pausing before responding may help break the pattern.',
      weight: Math.min(conflictPoints * 0.7, 6),
      dataPoints: Math.round(conflictPoints),
      detectedAt: Date.now(),
    };
  }

  return null;
}

function detectLateNightSpike(entries: JournalEntry[]): SpiralSignal | null {
  const recent = entries.filter(e => withinHours(e.timestamp, 48));
  let lateNightIntense = 0;

  recent.forEach(entry => {
    const hour = getHour(entry.timestamp);
    if ((hour >= 22 || hour <= 4) && entry.checkIn.intensityLevel >= 6) {
      lateNightIntense++;
    }
  });

  if (lateNightIntense >= 2) {
    return {
      id: 'sp_late_night_spike',
      type: 'late_night_spike',
      label: 'Late-night emotional intensity',
      narrative: 'Strong emotions tend to feel more overwhelming at night. Tomorrow may bring a calmer perspective.',
      weight: Math.min(lateNightIntense * 1.3, 4),
      dataPoints: lateNightIntense,
      detectedAt: Date.now(),
    };
  }

  return null;
}

function detectEmotionalVolatility(entries: JournalEntry[]): SpiralSignal | null {
  const recent = entries
    .filter(e => withinHours(e.timestamp, 36))
    .sort((a, b) => a.timestamp - b.timestamp);

  if (recent.length < 3) return null;

  let swingCount = 0;
  let maxSwing = 0;

  for (let i = 1; i < recent.length; i++) {
    const diff = Math.abs(recent[i].checkIn.intensityLevel - recent[i - 1].checkIn.intensityLevel);
    if (diff >= 3) {
      swingCount++;
      if (diff > maxSwing) maxSwing = diff;
    }
  }

  if (swingCount >= 2 || maxSwing >= 5) {
    return {
      id: 'sp_emotional_volatility',
      type: 'emotional_volatility',
      label: 'Emotional shifts intensifying',
      narrative: 'Your emotions have been shifting rapidly. This kind of volatility often precedes a spiral — grounding can help.',
      weight: Math.min(swingCount * 1.2 + (maxSwing >= 5 ? 1.5 : 0), 5),
      dataPoints: swingCount,
      detectedAt: Date.now(),
    };
  }

  return null;
}

function detectShameCascade(entries: JournalEntry[]): SpiralSignal | null {
  const recent = entries.filter(e => withinHours(e.timestamp, 48));
  let shameHits = 0;

  const shameKeywords = ['shame', 'guilt', 'worthless', 'bad person', 'hate myself', 'disgusting', 'failure'];

  recent.forEach(entry => {
    const hasShame = entry.checkIn.emotions.some(e => {
      const l = e.label.toLowerCase();
      return shameKeywords.some(kw => l.includes(kw));
    });
    const hasTrigger = entry.checkIn.triggers.some(t => {
      const l = t.label.toLowerCase();
      return shameKeywords.some(kw => l.includes(kw));
    });

    if (hasShame && entry.checkIn.intensityLevel >= 6) shameHits += 2;
    else if (hasShame || hasTrigger) shameHits += 1;
  });

  if (shameHits >= 3) {
    return {
      id: 'sp_shame_cascade',
      type: 'shame_cascade',
      label: 'Shame pattern building',
      narrative: 'Shame seems to be building up. Remember — shame is an emotion, not a truth about who you are.',
      weight: Math.min(shameHits * 1.1, 5),
      dataPoints: shameHits,
      detectedAt: Date.now(),
    };
  }

  return null;
}

function detectUrgeIntensification(entries: JournalEntry[]): SpiralSignal | null {
  const recent = entries
    .filter(e => withinHours(e.timestamp, 36))
    .sort((a, b) => a.timestamp - b.timestamp);

  if (recent.length < 2) return null;

  let highRiskUrgeCount = 0;
  let urgeLabels: string[] = [];

  recent.forEach(entry => {
    entry.checkIn.urges.forEach(u => {
      if (u.risk === 'high') {
        highRiskUrgeCount++;
        urgeLabels.push(u.label);
      }
    });
  });

  if (highRiskUrgeCount >= 3) {
    return {
      id: 'sp_urge_intensification',
      type: 'urge_intensification',
      label: 'Strong urges recurring',
      narrative: 'Strong urges have been showing up repeatedly. You\'re doing well to notice them — that awareness is protective.',
      weight: Math.min(highRiskUrgeCount * 1.0, 5),
      dataPoints: highRiskUrgeCount,
      detectedAt: Date.now(),
    };
  }

  return null;
}

function detectCopingAbandonment(entries: JournalEntry[]): SpiralSignal | null {
  const recent = entries.filter(e => withinHours(e.timestamp, 72));
  const older = entries.filter(e => !withinHours(e.timestamp, 72) && withinDays(e.timestamp, 14));

  if (recent.length < 2 || older.length < 3) return null;

  const recentCopingRate = recent.filter(e => e.checkIn.copingUsed && e.checkIn.copingUsed.length > 0).length / recent.length;
  const olderCopingRate = older.filter(e => e.checkIn.copingUsed && e.checkIn.copingUsed.length > 0).length / older.length;

  const recentAvgDistress = recent.reduce((s, e) => s + e.checkIn.intensityLevel, 0) / recent.length;

  if (olderCopingRate > 0.3 && recentCopingRate < olderCopingRate * 0.4 && recentAvgDistress >= 5) {
    return {
      id: 'sp_coping_abandonment',
      type: 'coping_abandonment',
      label: 'Coping tools dropped off',
      narrative: 'You\'ve been using coping tools less while distress is rising. Even a small step — a breath, a grounding moment — can help.',
      weight: 3,
      dataPoints: recent.length,
      detectedAt: Date.now(),
    };
  }

  return null;
}

function detectIsolationPattern(entries: JournalEntry[]): SpiralSignal | null {
  const recent = entries.filter(e => withinDays(e.timestamp, 5));
  let isolationHits = 0;

  const isolationKeywords = ['alone', 'isolat', 'withdraw', 'hiding', 'no one', 'nobody', 'lonely', 'disconnect'];

  recent.forEach(entry => {
    const hasIsolation = entry.checkIn.emotions.some(e =>
      isolationKeywords.some(kw => e.label.toLowerCase().includes(kw))
    ) || entry.checkIn.triggers.some(t =>
      isolationKeywords.some(kw => t.label.toLowerCase().includes(kw))
    );

    if (hasIsolation) isolationHits++;
  });

  if (isolationHits >= 2) {
    return {
      id: 'sp_isolation_pattern',
      type: 'isolation_pattern',
      label: 'Withdrawal pattern emerging',
      narrative: 'Withdrawal has been showing up in your entries. Connection — even small moments — can help break this pattern.',
      weight: Math.min(isolationHits * 1.2, 4),
      dataPoints: isolationHits,
      detectedAt: Date.now(),
    };
  }

  return null;
}

function calculateRiskLevel(signals: SpiralSignal[]): SpiralRiskLevel {
  if (signals.length === 0) return 'low';

  const totalWeight = signals.reduce((sum, s) => sum + s.weight, 0);

  if (totalWeight >= 10 || signals.length >= 4) return 'high';
  if (totalWeight >= 5 || signals.length >= 2) return 'moderate';
  return 'low';
}

function calculateConfidence(signals: SpiralSignal[]): number {
  if (signals.length === 0) return 0;
  const totalWeight = signals.reduce((sum, s) => sum + s.weight, 0);
  const totalData = signals.reduce((sum, s) => sum + s.dataPoints, 0);
  const base = Math.min(totalWeight / 12, 0.8);
  const dataBonus = Math.min(totalData / 25, 0.2);
  return Math.min(base + dataBonus, 1);
}

function generateInterventions(signals: SpiralSignal[], riskLevel: SpiralRiskLevel): SpiralIntervention[] {
  const interventions: SpiralIntervention[] = [];
  const types = new Set(signals.map(s => s.type));

  if (riskLevel === 'high') {
    interventions.push({
      id: 'sp_int_grounding_mode',
      type: 'grounding',
      title: 'Open Grounding Mode',
      description: 'A calm, simplified space to help you settle.',
      route: '/grounding-mode',
      icon: 'Anchor',
      priority: 1,
    });
  }

  if (types.has('rapid_distress_escalation') || types.has('emotional_volatility')) {
    interventions.push({
      id: 'sp_int_breathing',
      type: 'breathing',
      title: 'Breathing exercise',
      description: 'A few slow breaths to calm your nervous system.',
      route: '/exercise?id=c1',
      icon: 'Wind',
      priority: 2,
    });
  }

  if (types.has('relationship_conflict_loop') || types.has('repeated_rejection_language')) {
    interventions.push({
      id: 'sp_int_pause',
      type: 'pause',
      title: 'Pause before messaging',
      description: '2 minutes can change everything.',
      route: '/message-guard',
      icon: 'Timer',
      priority: 3,
    });
  }

  if (types.has('shame_cascade')) {
    interventions.push({
      id: 'sp_int_dbt',
      type: 'dbt_tool',
      title: 'Shame recovery tool',
      description: 'Work through shame step by step.',
      route: '/journal-guided',
      icon: 'Shield',
      priority: 4,
    });
  }

  if (types.has('relationship_conflict_loop') || types.has('repeated_rejection_language')) {
    interventions.push({
      id: 'sp_int_copilot',
      type: 'relationship_copilot',
      title: 'Relationship Copilot',
      description: 'Navigate what\'s happening with support.',
      route: '/relationship-copilot',
      icon: 'HeartHandshake',
      priority: 5,
    });
  }

  interventions.push({
    id: 'sp_int_journal',
    type: 'journal',
    title: 'Quick journal reflection',
    description: 'Write it out to process what you\'re feeling.',
    route: '/journal-write',
    icon: 'BookOpen',
    priority: 6,
  });

  interventions.push({
    id: 'sp_int_companion',
    type: 'ai_companion',
    title: 'Talk to AI Companion',
    description: 'Process what\'s happening in a safe space.',
    route: '/(tabs)/companion',
    icon: 'Sparkles',
    priority: 7,
  });

  return interventions.sort((a, b) => a.priority - b.priority);
}

function generateNarrative(riskLevel: SpiralRiskLevel, signals: SpiralSignal[]): string | null {
  if (signals.length === 0) return null;

  const types = new Set(signals.map(s => s.type));

  if (riskLevel === 'high') {
    if (types.has('relationship_conflict_loop') && types.has('rapid_distress_escalation')) {
      return 'Things seem emotionally intense right now, especially around a relationship. This is a moment to slow down and take care of yourself first.';
    }
    if (types.has('shame_cascade')) {
      return 'Shame seems to be building up strongly. This feeling will pass — right now, being gentle with yourself is the most important thing.';
    }
    return 'Multiple signs suggest your emotions may be escalating. A brief pause can help prevent things from spiraling further.';
  }

  if (riskLevel === 'moderate') {
    if (types.has('late_night_spike')) {
      return 'Emotions tend to feel more overwhelming at night. Would a quick grounding reset help before bed?';
    }
    if (types.has('repeated_rejection_language')) {
      return 'Rejection themes have been showing up in your recent entries. Being aware of this pattern is a strength.';
    }
    if (types.has('emotional_volatility')) {
      return 'Your emotions have been shifting more than usual. A moment of stillness may help you find your center.';
    }
    return 'It seems like today has been emotionally intense. Would a quick grounding reset help?';
  }

  return null;
}

export function detectSpiral(
  journalEntries: JournalEntry[],
  messageDrafts: MessageDraft[],
): SpiralDetectionResult {
  const signals: SpiralSignal[] = [];

  const rapid = detectRapidDistressEscalation(journalEntries);
  if (rapid) signals.push(rapid);

  const rejection = detectRepeatedRejectionLanguage(journalEntries);
  if (rejection) signals.push(rejection);

  const conflict = detectRelationshipConflictLoop(journalEntries, messageDrafts);
  if (conflict) signals.push(conflict);

  const lateNight = detectLateNightSpike(journalEntries);
  if (lateNight) signals.push(lateNight);

  const volatility = detectEmotionalVolatility(journalEntries);
  if (volatility) signals.push(volatility);

  const shame = detectShameCascade(journalEntries);
  if (shame) signals.push(shame);

  const urge = detectUrgeIntensification(journalEntries);
  if (urge) signals.push(urge);

  const coping = detectCopingAbandonment(journalEntries);
  if (coping) signals.push(coping);

  const isolation = detectIsolationPattern(journalEntries);
  if (isolation) signals.push(isolation);

  const riskLevel = calculateRiskLevel(signals);
  const confidenceScore = calculateConfidence(signals);
  const interventions = generateInterventions(signals, riskLevel);
  const narrative = generateNarrative(riskLevel, signals);
  const shouldIntervene = riskLevel !== 'low' && signals.length > 0;

  console.log('[SpiralDetection] Risk:', riskLevel, 'Signals:', signals.length, 'Confidence:', confidenceScore.toFixed(2));

  return {
    riskLevel,
    signals,
    interventions,
    narrative,
    confidenceScore,
    shouldIntervene,
    suggestedAction: interventions[0] ?? null,
    detectedAt: Date.now(),
  };
}

export function detectSpiralFromSmartEntries(
  smartEntries: SmartJournalEntry[],
  journalEntries: JournalEntry[],
  messageDrafts: MessageDraft[],
): SpiralDetectionResult {
  const baseResult = detectSpiral(journalEntries, messageDrafts);

  const recentSmart = smartEntries.filter(e => withinHours(e.timestamp, 48));
  let extraWeight = 0;

  recentSmart.forEach(entry => {
    if (entry.distressLevel >= 7) extraWeight += 1;
    if (entry.format === 'relationship_conflict') extraWeight += 0.5;
    if (entry.emotions.some(e => e.label.toLowerCase().includes('shame'))) extraWeight += 0.5;
  });

  if (extraWeight > 0 && baseResult.riskLevel === 'low' && extraWeight >= 2) {
    return {
      ...baseResult,
      riskLevel: 'moderate',
      shouldIntervene: true,
      narrative: baseResult.narrative ?? 'Recent journal entries suggest emotional intensity may be building.',
    };
  }

  if (extraWeight >= 3 && baseResult.riskLevel === 'moderate') {
    return {
      ...baseResult,
      riskLevel: 'high',
      interventions: generateInterventions(baseResult.signals, 'high'),
      narrative: baseResult.narrative ?? 'Multiple signals from your journal suggest this is a moment to pause and ground.',
    };
  }

  return baseResult;
}

export function generateWeeklySpiralInsight(
  journalEntries: JournalEntry[],
  messageDrafts: MessageDraft[],
): SpiralWeeklyInsight | null {
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const weekEntries = journalEntries.filter(e => now - e.timestamp < weekMs);

  if (weekEntries.length < 3) return null;

  const signalCounts: Record<string, number> = {};
  const hourCounts: Record<number, number> = {};
  const triggerLabels: string[] = [];

  weekEntries.forEach(entry => {
    const hour = getHour(entry.timestamp);
    if (entry.checkIn.intensityLevel >= 6) {
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    }
    entry.checkIn.triggers.forEach(t => triggerLabels.push(t.label));
  });

  const dailyResults: SpiralDetectionResult[] = [];
  for (let d = 0; d < 7; d++) {
    const dayStart = now - (d + 1) * 24 * 60 * 60 * 1000;
    const dayEnd = now - d * 24 * 60 * 60 * 1000;
    const dayEntries = journalEntries.filter(e => e.timestamp >= dayStart && e.timestamp < dayEnd);
    const dayDrafts = messageDrafts.filter(d => d.timestamp >= dayStart && d.timestamp < dayEnd);
    if (dayEntries.length > 0) {
      const result = detectSpiral(dayEntries, dayDrafts);
      dailyResults.push(result);
      result.signals.forEach(s => {
        signalCounts[s.type] = (signalCounts[s.type] || 0) + 1;
      });
    }
  }

  const peakRisk = dailyResults.reduce<SpiralRiskLevel>((peak, r) => {
    if (r.riskLevel === 'high') return 'high';
    if (r.riskLevel === 'moderate' && peak !== 'high') return 'moderate';
    return peak;
  }, 'low');

  const mostCommonSignals = Object.entries(signalCounts)
    .map(([type, count]) => ({ type: type as SpiralSignalType, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  const peakHour = Object.entries(hourCounts).sort(([, a], [, b]) => b - a)[0];
  let spikeTimeOfDay: string | null = null;
  if (peakHour) {
    const h = parseInt(peakHour[0]);
    if (h >= 22 || h <= 5) spikeTimeOfDay = 'late night';
    else if (h >= 6 && h <= 11) spikeTimeOfDay = 'morning';
    else if (h >= 12 && h <= 17) spikeTimeOfDay = 'afternoon';
    else spikeTimeOfDay = 'evening';
  }

  const triggerCounts: Record<string, number> = {};
  triggerLabels.forEach(t => { triggerCounts[t] = (triggerCounts[t] || 0) + 1; });
  const commonTriggers = Object.entries(triggerCounts).sort(([, a], [, b]) => b - a).slice(0, 3).map(([l]) => l);

  const relCount = weekEntries.filter(e =>
    e.checkIn.triggers.some(t => t.category === 'relationship')
  ).length;

  const copingLabels: string[] = [];
  weekEntries.forEach(e => {
    e.checkIn.copingUsed?.forEach(c => copingLabels.push(c));
  });
  const copingCounts: Record<string, number> = {};
  copingLabels.forEach(c => { copingCounts[c] = (copingCounts[c] || 0) + 1; });
  const toolsThatHelped = Object.entries(copingCounts).sort(([, a], [, b]) => b - a).slice(0, 3).map(([l]) => l);

  let narrative = '';
  if (peakRisk === 'high') {
    narrative = 'This week had some intense moments. ';
  } else if (peakRisk === 'moderate') {
    narrative = 'This week had some emotionally challenging moments. ';
  } else {
    narrative = 'This week was relatively steady emotionally. ';
  }

  if (spikeTimeOfDay) {
    narrative += `Emotional spikes tended to happen in the ${spikeTimeOfDay}. `;
  }
  if (commonTriggers.length > 0) {
    narrative += `Common triggers included ${commonTriggers.slice(0, 2).join(' and ')}. `;
  }
  if (toolsThatHelped.length > 0) {
    narrative += `Tools that helped most: ${toolsThatHelped.join(', ')}.`;
  }

  return {
    id: `swi_${now}`,
    weekStart: now - weekMs,
    weekEnd: now,
    peakRiskLevel: peakRisk,
    mostCommonSignals,
    spikeTimeOfDay,
    commonTriggers,
    relationshipTriggerCount: relCount,
    toolsThatHelped,
    narrative: narrative.trim(),
  };
}

export function getSpiralPausePrompt(signals: SpiralSignal[]): SpiralPausePromptConfig {
  const types = new Set(signals.map(s => s.type));

  if (types.has('relationship_conflict_loop') || types.has('repeated_rejection_language')) {
    return {
      title: 'Before you respond...',
      message: 'Strong emotions can make responses feel urgent. Would you like to pause for a moment before replying?',
      options: [
        { id: 'pause_timer', label: '2-minute pause', route: null, icon: 'Timer' },
        { id: 'grounding', label: 'Quick grounding', route: '/exercise?id=c2', icon: 'Anchor' },
        { id: 'rewrite', label: 'Rewrite with care', route: '/message-guard', icon: 'PenLine' },
        { id: 'continue', label: 'Continue anyway', route: null, icon: 'ArrowRight' },
      ],
    };
  }

  if (types.has('shame_cascade')) {
    return {
      title: 'A gentle pause',
      message: 'Shame can feel overwhelming. You don\'t need to act on it right now.',
      options: [
        { id: 'breathe', label: 'Breathe first', route: '/exercise?id=c1', icon: 'Wind' },
        { id: 'journal', label: 'Write it out', route: '/journal-write', icon: 'BookOpen' },
        { id: 'companion', label: 'Talk to companion', route: '/(tabs)/companion', icon: 'Sparkles' },
        { id: 'continue', label: 'I\'m okay', route: null, icon: 'ArrowRight' },
      ],
    };
  }

  return {
    title: 'Take a moment',
    message: 'It seems like things are emotionally intense right now. A small pause can make a big difference.',
    options: [
      { id: 'grounding', label: 'Grounding Mode', route: '/grounding-mode', icon: 'Anchor' },
      { id: 'breathe', label: 'Breathing exercise', route: '/exercise?id=c1', icon: 'Wind' },
      { id: 'companion', label: 'AI Companion', route: '/(tabs)/companion', icon: 'Sparkles' },
      { id: 'continue', label: 'Continue', route: null, icon: 'ArrowRight' },
    ],
  };
}
