import { JournalEntry, MessageDraft } from '@/types';

export type CrisisRiskLevel = 'low' | 'moderate' | 'high';

export type SupportActionType = 'breathing' | 'grounding' | 'ai_companion' | 'delay_message';

export interface CrisisIndicator {
  id: string;
  type: 'rapid_distress' | 'abandonment_cluster' | 'emotional_messaging_surge' | 'conflict_journaling';
  label: string;
  description: string;
  weight: number;
  occurrences: number;
}

export interface SupportAction {
  id: string;
  type: SupportActionType;
  title: string;
  description: string;
  route: string;
  icon: string;
  priority: number;
}

export interface CrisisPredictionResult {
  riskLevel: CrisisRiskLevel;
  indicators: CrisisIndicator[];
  actions: SupportAction[];
  message: string | null;
  score: number;
}

function hoursAgo(timestamp: number): number {
  return (Date.now() - timestamp) / (1000 * 60 * 60);
}

function detectRapidDistressEscalation(entries: JournalEntry[]): CrisisIndicator | null {
  const last48h = entries.filter(e => hoursAgo(e.timestamp) <= 48).sort((a, b) => a.timestamp - b.timestamp);

  if (last48h.length < 2) return null;

  let escalationCount = 0;
  const highDistressEntries = last48h.filter(e => e.checkIn.intensityLevel >= 7);

  for (let i = 1; i < last48h.length; i++) {
    if (last48h[i].checkIn.intensityLevel > last48h[i - 1].checkIn.intensityLevel + 1) {
      escalationCount++;
    }
  }

  if (highDistressEntries.length >= 2 || escalationCount >= 2) {
    const count = Math.max(highDistressEntries.length, escalationCount);
    return {
      id: 'rapid_distress_escalation',
      type: 'rapid_distress',
      label: 'Distress escalating quickly',
      description: `You've had ${count} high-intensity moments in the last 48 hours. Being aware of this pattern is already a strength.`,
      weight: count >= 3 ? 3 : 2,
      occurrences: count,
    };
  }

  return null;
}

function detectAbandonmentCluster(entries: JournalEntry[]): CrisisIndicator | null {
  const last72h = entries.filter(e => hoursAgo(e.timestamp) <= 72);
  let abandonmentHits = 0;

  last72h.forEach(entry => {
    const hasTrigger = entry.checkIn.triggers.some(t => {
      const label = t.label.toLowerCase();
      return (
        label.includes('abandon') ||
        label.includes('reject') ||
        label.includes('ignored') ||
        label.includes('left out') ||
        label.includes('ghosted') ||
        t.category === 'relationship'
      );
    });

    const hasEmotionalResponse = entry.checkIn.emotions.some(e => {
      const label = e.label.toLowerCase();
      return label.includes('fear') || label.includes('panic') || label.includes('desperate') || label.includes('empty');
    });

    if (hasTrigger && (hasEmotionalResponse || entry.checkIn.intensityLevel >= 6)) {
      abandonmentHits++;
    }
  });

  if (abandonmentHits >= 2) {
    return {
      id: 'abandonment_cluster',
      type: 'abandonment_cluster',
      label: 'Abandonment feelings clustering',
      description: `Abandonment-related experiences have appeared ${abandonmentHits} times recently. You deserve to feel secure.`,
      weight: abandonmentHits >= 3 ? 3 : 2,
      occurrences: abandonmentHits,
    };
  }

  return null;
}

function detectEmotionalMessagingSurge(drafts: MessageDraft[]): CrisisIndicator | null {
  const last24h = drafts.filter(d => hoursAgo(d.timestamp) <= 24);
  const emotionalDrafts = last24h.filter(d => !d.sent || d.paused);
  const totalRecent = last24h.length;

  if (emotionalDrafts.length >= 3 || totalRecent >= 5) {
    const count = Math.max(emotionalDrafts.length, totalRecent);
    return {
      id: 'emotional_messaging_surge',
      type: 'emotional_messaging_surge',
      label: 'Messaging impulses increasing',
      description: `You've drafted ${count} messages in the last day. Pausing before sending can protect your peace.`,
      weight: count >= 5 ? 3 : 2,
      occurrences: count,
    };
  }

  return null;
}

function detectConflictJournaling(entries: JournalEntry[]): CrisisIndicator | null {
  const last72h = entries.filter(e => hoursAgo(e.timestamp) <= 72);
  let conflictEntries = 0;

  last72h.forEach(entry => {
    const hasRelationshipTrigger = entry.checkIn.triggers.some(t => t.category === 'relationship');
    const hasHighUrge = entry.checkIn.urges.some(u => u.risk === 'high');
    const hasConflictEmotion = entry.checkIn.emotions.some(e => {
      const label = e.label.toLowerCase();
      return label.includes('anger') || label.includes('rage') || label.includes('betrayed') || label.includes('hurt');
    });

    if (hasRelationshipTrigger && (hasHighUrge || hasConflictEmotion || entry.checkIn.intensityLevel >= 7)) {
      conflictEntries++;
    }
  });

  if (conflictEntries >= 2) {
    return {
      id: 'conflict_journaling_pattern',
      type: 'conflict_journaling',
      label: 'Relationship stress building',
      description: `You've logged ${conflictEntries} relationship-related high-stress moments recently. Your AI Companion can help you process this.`,
      weight: conflictEntries >= 3 ? 3 : 2,
      occurrences: conflictEntries,
    };
  }

  return null;
}

function calculateRiskScore(indicators: CrisisIndicator[]): number {
  if (indicators.length === 0) return 0;
  const totalWeight = indicators.reduce((sum, ind) => sum + ind.weight, 0);
  return Math.min(totalWeight, 10);
}

function determineRiskLevel(score: number): CrisisRiskLevel {
  if (score >= 6) return 'high';
  if (score >= 3) return 'moderate';
  return 'low';
}

function generateSupportActions(indicators: CrisisIndicator[]): SupportAction[] {
  const actions: SupportAction[] = [];
  const addedTypes = new Set<SupportActionType>();

  const hasDistress = indicators.some(i => i.type === 'rapid_distress');
  const hasAbandonment = indicators.some(i => i.type === 'abandonment_cluster');
  const hasMessaging = indicators.some(i => i.type === 'emotional_messaging_surge');
  const hasConflict = indicators.some(i => i.type === 'conflict_journaling');

  if (hasDistress || hasAbandonment) {
    actions.push({
      id: 'action_breathing',
      type: 'breathing',
      title: 'Breathing Exercise',
      description: 'A few minutes of slow breathing can calm your nervous system.',
      route: '/exercise?id=c1',
      icon: 'Wind',
      priority: 1,
    });
    addedTypes.add('breathing');
  }

  if (hasAbandonment || hasConflict || hasDistress) {
    actions.push({
      id: 'action_grounding',
      type: 'grounding',
      title: 'Grounding Exercise',
      description: 'Reconnect with the present moment through your senses.',
      route: '/exercise?id=c2',
      icon: 'Anchor',
      priority: 2,
    });
    addedTypes.add('grounding');
  }

  if (hasConflict || hasAbandonment) {
    actions.push({
      id: 'action_companion',
      type: 'ai_companion',
      title: 'Talk to AI Companion',
      description: 'Share what you\'re feeling in a safe, judgment-free space.',
      route: '/(tabs)/companion',
      icon: 'MessageCircleHeart',
      priority: 3,
    });
    addedTypes.add('ai_companion');
  }

  if (hasMessaging) {
    if (!addedTypes.has('breathing')) {
      actions.push({
        id: 'action_breathing_msg',
        type: 'breathing',
        title: 'Breathe First',
        description: 'Take a few breaths before deciding what to send.',
        route: '/exercise?id=c1',
        icon: 'Wind',
        priority: 1,
      });
    }
    actions.push({
      id: 'action_delay',
      type: 'delay_message',
      title: 'Delay Sending',
      description: 'Give yourself space. You can always send it later.',
      route: '/(tabs)/messages',
      icon: 'Clock',
      priority: 4,
    });
    addedTypes.add('delay_message');
  }

  if (actions.length === 0 && indicators.length > 0) {
    actions.push({
      id: 'action_grounding_default',
      type: 'grounding',
      title: 'Grounding Exercise',
      description: 'A quick grounding exercise can help you feel more centered.',
      route: '/exercise?id=c2',
      icon: 'Anchor',
      priority: 1,
    });
  }

  return actions.sort((a, b) => a.priority - b.priority);
}

function generateMessage(riskLevel: CrisisRiskLevel, indicators: CrisisIndicator[]): string | null {
  if (indicators.length === 0) return null;

  if (riskLevel === 'high') {
    return "Your emotional intensity has increased recently. You're being brave by tracking this — a short grounding exercise might help right now.";
  }

  if (indicators.some(i => i.type === 'emotional_messaging_surge')) {
    return "You've been reaching out a lot today. It's okay to take a moment before pressing send.";
  }

  if (indicators.some(i => i.type === 'abandonment_cluster')) {
    return "Abandonment feelings have been coming up more often. You're not alone — let's work through this gently.";
  }

  if (indicators.some(i => i.type === 'conflict_journaling')) {
    return "Relationship stress has been building. A brief pause and some self-care could help you feel more grounded.";
  }

  return "Some patterns suggest your stress is building. A small act of self-care can go a long way.";
}

export function predictCrisis(
  journalEntries: JournalEntry[],
  messageDrafts: MessageDraft[],
): CrisisPredictionResult {
  const indicators: CrisisIndicator[] = [];

  const rapidDistress = detectRapidDistressEscalation(journalEntries);
  if (rapidDistress) indicators.push(rapidDistress);

  const abandonment = detectAbandonmentCluster(journalEntries);
  if (abandonment) indicators.push(abandonment);

  const messaging = detectEmotionalMessagingSurge(messageDrafts);
  if (messaging) indicators.push(messaging);

  const conflict = detectConflictJournaling(journalEntries);
  if (conflict) indicators.push(conflict);

  const score = calculateRiskScore(indicators);
  const riskLevel = determineRiskLevel(score);
  const actions = generateSupportActions(indicators);
  const message = generateMessage(riskLevel, indicators);

  console.log('[CrisisPrediction] Score:', score, 'Risk:', riskLevel, 'Indicators:', indicators.length);

  return {
    riskLevel,
    indicators,
    actions,
    message,
    score,
  };
}
