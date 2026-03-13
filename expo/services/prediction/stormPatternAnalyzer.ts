import { JournalEntry, MessageDraft } from '@/types';

export type EarlyWarningSignalType =
  | 'distress_escalation'
  | 'abandonment_cluster'
  | 'reassurance_loop'
  | 'rewrite_frequency'
  | 'emotional_volatility'
  | 'relationship_tension'
  | 'coping_decline';

export type StormPhase = 'clear' | 'early_signs' | 'building' | 'escalating';

export interface EarlyWarningSignal {
  id: string;
  type: EarlyWarningSignalType;
  label: string;
  narrative: string;
  weight: number;
  dataPoints: number;
  timeWindowHours: number;
}

export interface StormSupportOption {
  id: string;
  type: 'grounding' | 'breathing' | 'ai_reflection' | 'pause_messaging' | 'relationship_copilot' | 'journaling';
  title: string;
  description: string;
  route: string;
  icon: string;
  priority: number;
}

export interface StormEarlyWarningResult {
  phase: StormPhase;
  signals: EarlyWarningSignal[];
  supportOptions: StormSupportOption[];
  narrative: string | null;
  confidenceScore: number;
  shouldShow: boolean;
}

function withinHours(timestamp: number, hours: number): boolean {
  return Date.now() - timestamp < hours * 60 * 60 * 1000;
}

function analyzeDistressEscalation(entries: JournalEntry[]): EarlyWarningSignal | null {
  const recent = entries
    .filter(e => withinHours(e.timestamp, 48))
    .sort((a, b) => a.timestamp - b.timestamp);

  if (recent.length < 2) return null;

  let risingCount = 0;
  let peakIntensity = 0;
  const intensities: number[] = [];

  for (let i = 0; i < recent.length; i++) {
    const level = recent[i].checkIn.intensityLevel;
    intensities.push(level);
    if (level > peakIntensity) peakIntensity = level;
    if (i > 0 && level > recent[i - 1].checkIn.intensityLevel) {
      risingCount++;
    }
  }

  const avgRecent = intensities.slice(-3).reduce((s, v) => s + v, 0) / Math.min(intensities.length, 3);

  if (risingCount >= 2 || (avgRecent >= 6 && peakIntensity >= 7)) {
    const weight = Math.min((risingCount * 1.5) + (avgRecent > 7 ? 2 : 0), 5);
    return {
      id: 'ew_distress_escalation',
      type: 'distress_escalation',
      label: 'Rising distress levels',
      narrative: 'Your recent check-ins suggest stress levels may be climbing. This might be a good time to slow things down.',
      weight,
      dataPoints: recent.length,
      timeWindowHours: 48,
    };
  }

  return null;
}

function analyzeAbandonmentCluster(entries: JournalEntry[]): EarlyWarningSignal | null {
  const recent = entries.filter(e => withinHours(e.timestamp, 72));
  let clusterHits = 0;

  const abandonmentKeywords = [
    'abandon', 'reject', 'ignored', 'ghosted', 'left out',
    'no reply', 'silence', 'not responding', 'distant', 'pulling away',
    'cold', 'unavailable',
  ];

  recent.forEach(entry => {
    const hasTrigger = entry.checkIn.triggers.some(t => {
      const l = t.label.toLowerCase();
      return abandonmentKeywords.some(kw => l.includes(kw)) || t.category === 'relationship';
    });

    const hasAbandonmentEmotion = entry.checkIn.emotions.some(e => {
      const l = e.label.toLowerCase();
      return l.includes('fear') || l.includes('panic') || l.includes('anxious') ||
             l.includes('desperate') || l.includes('empty') || l.includes('abandoned');
    });

    if (hasTrigger && hasAbandonmentEmotion) {
      clusterHits += 2;
    } else if (hasTrigger || hasAbandonmentEmotion) {
      clusterHits += 1;
    }
  });

  if (clusterHits >= 3) {
    return {
      id: 'ew_abandonment_cluster',
      type: 'abandonment_cluster',
      label: 'Communication uncertainty',
      narrative: 'Communication uncertainty appears to be triggering anxiety. This is a familiar pattern — being aware of it is a strength.',
      weight: Math.min(clusterHits * 0.8, 5),
      dataPoints: clusterHits,
      timeWindowHours: 72,
    };
  }

  return null;
}

function analyzeReassuranceLoop(entries: JournalEntry[]): EarlyWarningSignal | null {
  const recent = entries.filter(e => withinHours(e.timestamp, 48));
  let reassuranceHits = 0;

  const reassuranceKeywords = [
    'reassur', 'text', 'call', 'reach out', 'contact',
    'check phone', 'ask if ok', 'need to know',
  ];

  recent.forEach(entry => {
    const hasUrge = entry.checkIn.urges.some(u => {
      const l = u.label.toLowerCase();
      return reassuranceKeywords.some(kw => l.includes(kw));
    });

    if (hasUrge && entry.checkIn.intensityLevel >= 5) {
      reassuranceHits++;
    }
  });

  if (reassuranceHits >= 2) {
    return {
      id: 'ew_reassurance_loop',
      type: 'reassurance_loop',
      label: 'Reassurance-seeking urges',
      narrative: 'The urge to seek reassurance has been showing up. Grounding before reaching out may help bring more clarity.',
      weight: Math.min(reassuranceHits * 1.2, 5),
      dataPoints: reassuranceHits,
      timeWindowHours: 48,
    };
  }

  return null;
}

function analyzeRewriteFrequency(drafts: MessageDraft[]): EarlyWarningSignal | null {
  const recent24h = drafts.filter(d => withinHours(d.timestamp, 24));
  const recent48h = drafts.filter(d => withinHours(d.timestamp, 48));

  const rewriteCount24 = recent24h.filter(d => d.rewrittenText).length;
  const totalCount48 = recent48h.length;

  if (rewriteCount24 >= 3 || totalCount48 >= 5) {
    const count = Math.max(rewriteCount24, totalCount48);
    return {
      id: 'ew_rewrite_frequency',
      type: 'rewrite_frequency',
      label: 'Increased message activity',
      narrative: 'You\'ve been working through several messages recently. This might be a good time to pause before sending.',
      weight: Math.min(count * 0.9, 5),
      dataPoints: count,
      timeWindowHours: 48,
    };
  }

  return null;
}

function analyzeEmotionalVolatility(entries: JournalEntry[]): EarlyWarningSignal | null {
  const recent = entries
    .filter(e => withinHours(e.timestamp, 48))
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
      id: 'ew_emotional_volatility',
      type: 'emotional_volatility',
      label: 'Emotional shifts',
      narrative: 'Your emotions have been shifting more than usual. Extra gentleness with yourself may help you feel more grounded.',
      weight: Math.min(swingCount + (maxSwing >= 5 ? 1.5 : 0), 5),
      dataPoints: swingCount,
      timeWindowHours: 48,
    };
  }

  return null;
}

function analyzeRelationshipTension(entries: JournalEntry[], drafts: MessageDraft[]): EarlyWarningSignal | null {
  const recentEntries = entries.filter(e => withinHours(e.timestamp, 72));
  const recentDrafts = drafts.filter(d => withinHours(d.timestamp, 72));

  let tensionPoints = 0;

  recentEntries.forEach(entry => {
    const isRelationship = entry.checkIn.triggers.some(t => t.category === 'relationship');
    if (isRelationship && entry.checkIn.intensityLevel >= 6) {
      tensionPoints += 2;
    } else if (isRelationship) {
      tensionPoints += 1;
    }
  });

  const emotionalDrafts = recentDrafts.filter(d => d.rewrittenText || d.paused);
  tensionPoints += emotionalDrafts.length;

  if (tensionPoints >= 4) {
    return {
      id: 'ew_relationship_tension',
      type: 'relationship_tension',
      label: 'Relationship stress building',
      narrative: 'Relationship-related stress seems to be building. The Relationship Copilot can help you navigate this moment.',
      weight: Math.min(tensionPoints * 0.7, 5),
      dataPoints: tensionPoints,
      timeWindowHours: 72,
    };
  }

  return null;
}

function analyzeCopingDecline(entries: JournalEntry[]): EarlyWarningSignal | null {
  const recent = entries.filter(e => withinHours(e.timestamp, 72));
  const older = entries.filter(e => !withinHours(e.timestamp, 72) && withinHours(e.timestamp, 168));

  if (recent.length < 2 || older.length < 2) return null;

  const recentCoping = recent.filter(e => e.checkIn.copingUsed && e.checkIn.copingUsed.length > 0).length;
  const olderCoping = older.filter(e => e.checkIn.copingUsed && e.checkIn.copingUsed.length > 0).length;

  const recentRate = recentCoping / recent.length;
  const olderRate = olderCoping / older.length;

  if (olderRate > 0.3 && recentRate < olderRate * 0.5) {
    return {
      id: 'ew_coping_decline',
      type: 'coping_decline',
      label: 'Coping tool use has dropped',
      narrative: 'You\'ve been using coping tools less lately. Even a small grounding exercise can help when things feel heavy.',
      weight: 2.5,
      dataPoints: recent.length,
      timeWindowHours: 72,
    };
  }

  return null;
}

function calculateConfidence(signals: EarlyWarningSignal[]): number {
  if (signals.length === 0) return 0;
  const totalWeight = signals.reduce((sum, s) => sum + s.weight, 0);
  const totalDataPoints = signals.reduce((sum, s) => sum + s.dataPoints, 0);
  const base = Math.min(totalWeight / 10, 1);
  const dataBonus = Math.min(totalDataPoints / 20, 0.3);
  return Math.min(base + dataBonus, 1);
}

function determinePhase(signals: EarlyWarningSignal[], confidence: number): StormPhase {
  if (signals.length === 0) return 'clear';
  const totalWeight = signals.reduce((sum, s) => sum + s.weight, 0);
  if (totalWeight >= 12 || confidence >= 0.8) return 'escalating';
  if (totalWeight >= 7 || signals.length >= 3) return 'building';
  if (totalWeight >= 3 || signals.length >= 1) return 'early_signs';
  return 'clear';
}

function generateSupportOptions(signals: EarlyWarningSignal[]): StormSupportOption[] {
  const options: StormSupportOption[] = [];
  const types = new Set(signals.map(s => s.type));

  const hasDistress = types.has('distress_escalation') || types.has('emotional_volatility');
  const hasRelationship = types.has('abandonment_cluster') || types.has('relationship_tension') || types.has('reassurance_loop');
  const hasMessaging = types.has('rewrite_frequency');

  if (hasDistress) {
    options.push({
      id: 'ew_support_grounding',
      type: 'grounding',
      title: 'Grounding exercise',
      description: 'Reconnect with the present moment through your senses.',
      route: '/exercise?id=c2',
      icon: 'Anchor',
      priority: 1,
    });
  }

  if (hasDistress || hasRelationship) {
    options.push({
      id: 'ew_support_breathing',
      type: 'breathing',
      title: 'Breathing pause',
      description: 'A few slow breaths can calm your nervous system.',
      route: '/exercise?id=c1',
      icon: 'Wind',
      priority: 2,
    });
  }

  if (hasRelationship) {
    options.push({
      id: 'ew_support_copilot',
      type: 'relationship_copilot',
      title: 'Relationship Copilot',
      description: 'Get support for what\'s happening relationally.',
      route: '/relationship-copilot',
      icon: 'HeartHandshake',
      priority: 3,
    });
  }

  if (hasMessaging || hasRelationship) {
    options.push({
      id: 'ew_support_pause',
      type: 'pause_messaging',
      title: 'Pause before messaging',
      description: 'Give yourself space before pressing send.',
      route: '/message-guard',
      icon: 'Clock',
      priority: 4,
    });
  }

  if (signals.length >= 2) {
    options.push({
      id: 'ew_support_ai',
      type: 'ai_reflection',
      title: 'AI Companion reflection',
      description: 'Process what you\'re feeling in a calm space.',
      route: '/(tabs)/companion',
      icon: 'Sparkles',
      priority: 5,
    });
  }

  if (options.length === 0 && signals.length > 0) {
    options.push({
      id: 'ew_support_breathing_default',
      type: 'breathing',
      title: 'Take a breathing pause',
      description: 'A few slow breaths can help you feel more centered.',
      route: '/exercise?id=c1',
      icon: 'Wind',
      priority: 1,
    });
  }

  return options.sort((a, b) => a.priority - b.priority);
}

function generateNarrative(phase: StormPhase, signals: EarlyWarningSignal[]): string | null {
  if (signals.length === 0) return null;

  const hasAbandonment = signals.some(s => s.type === 'abandonment_cluster');
  const hasReassurance = signals.some(s => s.type === 'reassurance_loop');
  const hasDistress = signals.some(s => s.type === 'distress_escalation');
  const hasVolatility = signals.some(s => s.type === 'emotional_volatility');
  const hasRelationship = signals.some(s => s.type === 'relationship_tension');
  const hasRewrite = signals.some(s => s.type === 'rewrite_frequency');

  if (phase === 'escalating') {
    if (hasAbandonment || hasReassurance) {
      return 'Things seem intense right now, especially around communication and connection. This might be a good moment to slow down before responding.';
    }
    return 'You may be experiencing increased emotional stress today. A small pause could make a real difference.';
  }

  if (phase === 'building') {
    if (hasRelationship && hasRewrite) {
      return 'Relationship stress and messaging activity are both elevated. Slowing down may help protect your peace.';
    }
    if (hasDistress && hasVolatility) {
      return 'Your emotions have been shifting and stress levels are climbing. Extra gentleness with yourself matters right now.';
    }
    return 'Some patterns suggest things may be building up. This might be a good time to slow things down.';
  }

  if (hasAbandonment) {
    return 'Communication uncertainty appears to be triggering anxiety. Being aware of this pattern is itself a form of strength.';
  }
  if (hasReassurance) {
    return 'Reassurance-seeking urges have been showing up. A moment of grounding may bring more clarity.';
  }
  if (hasDistress) {
    return 'Your stress levels seem to be climbing lately. A small act of self-care can make a meaningful difference.';
  }
  if (hasRewrite) {
    return 'You\'ve been working through several messages. Pausing before sending may help you communicate from a calmer place.';
  }

  return 'Some patterns in your recent data suggest this could be a good time to be gentle with yourself.';
}

export function analyzeStormPatterns(
  journalEntries: JournalEntry[],
  messageDrafts: MessageDraft[],
): StormEarlyWarningResult {
  const signals: EarlyWarningSignal[] = [];

  const distress = analyzeDistressEscalation(journalEntries);
  if (distress) signals.push(distress);

  const abandonment = analyzeAbandonmentCluster(journalEntries);
  if (abandonment) signals.push(abandonment);

  const reassurance = analyzeReassuranceLoop(journalEntries);
  if (reassurance) signals.push(reassurance);

  const rewrite = analyzeRewriteFrequency(messageDrafts);
  if (rewrite) signals.push(rewrite);

  const volatility = analyzeEmotionalVolatility(journalEntries);
  if (volatility) signals.push(volatility);

  const relationship = analyzeRelationshipTension(journalEntries, messageDrafts);
  if (relationship) signals.push(relationship);

  const coping = analyzeCopingDecline(journalEntries);
  if (coping) signals.push(coping);

  const confidenceScore = calculateConfidence(signals);
  const phase = determinePhase(signals, confidenceScore);
  const supportOptions = generateSupportOptions(signals);
  const narrative = generateNarrative(phase, signals);
  const shouldShow = signals.length > 0 && phase !== 'clear';

  console.log('[StormPatternAnalyzer] Phase:', phase, 'Signals:', signals.length, 'Confidence:', confidenceScore.toFixed(2));

  return {
    phase,
    signals,
    supportOptions,
    narrative,
    confidenceScore,
    shouldShow,
  };
}
