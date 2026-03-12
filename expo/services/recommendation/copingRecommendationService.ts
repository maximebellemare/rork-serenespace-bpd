import { JournalEntry, MessageDraft } from '@/types';
import {
  CopingRecommendation,
  RecommendationResult,
  RecommendationPriority,
} from '@/types/recommendation';

function isWithinDays(timestamp: number, days: number): boolean {
  return Date.now() - timestamp < days * 24 * 60 * 60 * 1000;
}

function getRecentEmotions(entries: JournalEntry[]): Record<string, number> {
  const counts: Record<string, number> = {};
  entries.filter(e => isWithinDays(e.timestamp, 7)).forEach(entry => {
    entry.checkIn.emotions.forEach(em => {
      counts[em.label] = (counts[em.label] || 0) + 1;
    });
  });
  return counts;
}

function getRecentTriggers(entries: JournalEntry[]): Record<string, number> {
  const counts: Record<string, number> = {};
  entries.filter(e => isWithinDays(e.timestamp, 7)).forEach(entry => {
    entry.checkIn.triggers.forEach(t => {
      counts[t.label] = (counts[t.label] || 0) + 1;
    });
  });
  return counts;
}

function getRecentTriggerCategories(entries: JournalEntry[]): Record<string, number> {
  const counts: Record<string, number> = {};
  entries.filter(e => isWithinDays(e.timestamp, 7)).forEach(entry => {
    entry.checkIn.triggers.forEach(t => {
      counts[t.category] = (counts[t.category] || 0) + 1;
    });
  });
  return counts;
}

function getRecentCopingUsed(entries: JournalEntry[]): Record<string, number> {
  const counts: Record<string, number> = {};
  entries.filter(e => isWithinDays(e.timestamp, 7)).forEach(entry => {
    (entry.checkIn.copingUsed ?? []).forEach(c => {
      counts[c] = (counts[c] || 0) + 1;
    });
  });
  return counts;
}

function getAverageDistress(entries: JournalEntry[]): number {
  const recent = entries.filter(e => isWithinDays(e.timestamp, 7));
  if (recent.length === 0) return 0;
  return recent.reduce((sum, e) => sum + e.checkIn.intensityLevel, 0) / recent.length;
}

function getLatestDistress(entries: JournalEntry[]): number {
  const recent = entries
    .filter(e => isWithinDays(e.timestamp, 3))
    .sort((a, b) => b.timestamp - a.timestamp);
  return recent[0]?.checkIn.intensityLevel ?? 0;
}

function hasHighUrges(entries: JournalEntry[]): boolean {
  const recent = entries.filter(e => isWithinDays(e.timestamp, 3));
  return recent.some(entry =>
    entry.checkIn.urges.some(u => u.risk === 'high')
  );
}

function hasFrequentMessaging(drafts: MessageDraft[]): boolean {
  const recent = drafts.filter(d => isWithinDays(d.timestamp, 3));
  return recent.length >= 2;
}

function priorityScore(p: RecommendationPriority): number {
  if (p === 'high') return 3;
  if (p === 'medium') return 2;
  return 1;
}

export function generateRecommendations(
  journalEntries: JournalEntry[],
  messageDrafts: MessageDraft[],
): RecommendationResult {
  const recommendations: CopingRecommendation[] = [];
  const addedCategories = new Set<string>();

  const recent = journalEntries.filter(e => isWithinDays(e.timestamp, 7));

  if (recent.length === 0) {
    console.log('[CopingRecommendation] No recent data, returning empty');
    return { recommendations: [], topRecommendation: null, hasData: false };
  }

  const avgDistress = getAverageDistress(journalEntries);
  const latestDistress = getLatestDistress(journalEntries);
  const emotionCounts = getRecentEmotions(journalEntries);
  const triggerCounts = getRecentTriggers(journalEntries);
  const triggerCategories = getRecentTriggerCategories(journalEntries);
  const _copingUsed = getRecentCopingUsed(journalEntries);
  const highUrges = hasHighUrges(journalEntries);
  const frequentMessaging = hasFrequentMessaging(messageDrafts);

  const topEmotion = Object.entries(emotionCounts).sort(([, a], [, b]) => b - a)[0]?.[0];
  const _topTrigger = Object.entries(triggerCounts).sort(([, a], [, b]) => b - a)[0]?.[0];

  if (latestDistress >= 7 || avgDistress >= 6) {
    if (!addedCategories.has('breathing')) {
      recommendations.push({
        id: 'rec_breathing_high',
        category: 'breathing',
        title: 'Breathing Exercise',
        message: 'Breathing exercises may help right now. A few deep breaths can lower your distress.',
        route: '/exercise?id=c1',
        icon: 'Wind',
        priority: 'high',
        reason: `Your distress has been elevated (${latestDistress >= 7 ? 'latest: ' + latestDistress : 'avg: ' + avgDistress.toFixed(1)}/10)`,
      });
      addedCategories.add('breathing');
    }
  }

  if (latestDistress >= 8 || highUrges) {
    if (!addedCategories.has('grounding')) {
      recommendations.push({
        id: 'rec_grounding_crisis',
        category: 'grounding',
        title: '5-4-3-2-1 Grounding',
        message: 'A grounding exercise can help bring you back to the present moment.',
        route: '/exercise?id=c1',
        icon: 'Anchor',
        priority: 'high',
        reason: highUrges ? 'Strong urges detected recently' : 'Very high distress detected',
      });
      addedCategories.add('grounding');
    }
  }

  const anxiousEmotions = ['Anxious', 'Afraid', 'Overwhelmed'];
  const hasAnxiety = anxiousEmotions.some(e => (emotionCounts[e] ?? 0) >= 2);
  if (hasAnxiety && !addedCategories.has('breathing')) {
    recommendations.push({
      id: 'rec_breathing_anxiety',
      category: 'breathing',
      title: 'Calming Breath',
      message: 'You\'ve been feeling anxious lately. A breathing exercise could help settle your nervous system.',
      route: '/exercise?id=c1',
      icon: 'Wind',
      priority: 'medium',
      reason: 'Frequent anxiety-related emotions this week',
    });
    addedCategories.add('breathing');
  }

  const relationshipTriggers = triggerCategories['relationship'] ?? 0;
  if (relationshipTriggers >= 2) {
    if (!addedCategories.has('journaling')) {
      recommendations.push({
        id: 'rec_journal_relationship',
        category: 'journaling',
        title: 'Write a Reflection',
        message: 'Writing a short reflection could help process this trigger and find clarity.',
        route: '/check-in',
        icon: 'BookOpen',
        priority: 'medium',
        reason: `${relationshipTriggers} relationship triggers this week`,
      });
      addedCategories.add('journaling');
    }
  }

  if (frequentMessaging) {
    if (!addedCategories.has('message_pause')) {
      recommendations.push({
        id: 'rec_pause_messaging',
        category: 'message_pause',
        title: 'Pause Before Messaging',
        message: 'Try a grounding exercise before messaging someone. A brief pause can protect your peace.',
        route: '/exercise?id=c1',
        icon: 'Timer',
        priority: 'medium',
        reason: 'Multiple emotional messages drafted recently',
      });
      addedCategories.add('message_pause');
    }
  }

  const sadEmotions = ['Sad', 'Abandoned', 'Empty', 'Desperate'];
  const hasSadness = sadEmotions.some(e => (emotionCounts[e] ?? 0) >= 2);
  if (hasSadness && !addedCategories.has('self_soothing')) {
    recommendations.push({
      id: 'rec_self_soothe',
      category: 'self_soothing',
      title: 'Self-Soothe Kit',
      message: 'You\'ve been carrying a lot of heavy feelings. A self-soothing exercise could bring some comfort.',
      route: '/exercise?id=c3',
      icon: 'Heart',
      priority: 'medium',
      reason: 'Frequent sadness-related emotions this week',
    });
    addedCategories.add('self_soothing');
  }

  const angryEmotions = ['Angry', 'Jealous'];
  const hasAnger = angryEmotions.some(e => (emotionCounts[e] ?? 0) >= 2);
  if (hasAnger && !addedCategories.has('opposite_action')) {
    recommendations.push({
      id: 'rec_opposite_action',
      category: 'opposite_action',
      title: 'Opposite Action',
      message: 'When anger is strong, doing the opposite of what it urges can break the cycle.',
      route: '/exercise?id=c7',
      icon: 'RefreshCw',
      priority: 'medium',
      reason: 'Frequent anger-related emotions this week',
    });
    addedCategories.add('opposite_action');
  }

  const hasMisunderstanding = (emotionCounts['Misunderstood'] ?? 0) >= 1;
  if (hasMisunderstanding && !addedCategories.has('reality_check')) {
    recommendations.push({
      id: 'rec_reality_check',
      category: 'reality_check',
      title: 'Check the Facts',
      message: 'When you feel misunderstood, checking the facts can reveal a different perspective.',
      route: '/exercise?id=c5',
      icon: 'Search',
      priority: 'low',
      reason: 'Feeling misunderstood recently',
    });
    addedCategories.add('reality_check');
  }

  if (topEmotion && !addedCategories.has('ai_companion') && recent.length >= 3) {
    recommendations.push({
      id: 'rec_ai_companion',
      category: 'ai_companion',
      title: 'Talk It Through',
      message: `You've been feeling ${topEmotion.toLowerCase()} often. Your AI Companion can help explore what's behind it.`,
      route: '/(tabs)/companion',
      icon: 'MessageCircle',
      priority: 'low',
      reason: `"${topEmotion}" is your most frequent emotion this week`,
    });
    addedCategories.add('ai_companion');
  }

  if (!addedCategories.has('breathing') && !addedCategories.has('grounding') && avgDistress >= 4) {
    recommendations.push({
      id: 'rec_breathing_default',
      category: 'breathing',
      title: 'Quick Breathing',
      message: 'A short breathing exercise can help you reset and feel more centered.',
      route: '/exercise?id=c1',
      icon: 'Wind',
      priority: 'low',
      reason: 'General wellness recommendation',
    });
  }

  recommendations.sort((a, b) => priorityScore(b.priority) - priorityScore(a.priority));

  const topRecommendation = recommendations[0] ?? null;

  console.log('[CopingRecommendation] Generated', recommendations.length, 'recommendations. Top:', topRecommendation?.title);

  return {
    recommendations: recommendations.slice(0, 5),
    topRecommendation,
    hasData: true,
  };
}

export function generateCheckInRecommendations(
  intensityLevel: number,
  emotions: string[],
  triggers: string[],
  triggerCategories: string[],
  urges: { label: string; risk: string }[],
): CopingRecommendation[] {
  const recs: CopingRecommendation[] = [];

  if (intensityLevel >= 7) {
    recs.push({
      id: 'ci_rec_grounding',
      category: 'grounding',
      title: '5-4-3-2-1 Grounding',
      message: 'Your distress is high. A grounding exercise can help bring you back to the present.',
      route: '/exercise?id=c1',
      icon: 'Anchor',
      priority: 'high',
      reason: `Distress level: ${intensityLevel}/10`,
    });
  }

  if (intensityLevel >= 5) {
    recs.push({
      id: 'ci_rec_breathing',
      category: 'breathing',
      title: 'Breathing Exercise',
      message: 'A few minutes of focused breathing can help lower your intensity.',
      route: '/exercise?id=c1',
      icon: 'Wind',
      priority: intensityLevel >= 7 ? 'high' : 'medium',
      reason: 'Elevated distress',
    });
  }

  const hasRelationshipTrigger = triggerCategories.includes('relationship');
  if (hasRelationshipTrigger) {
    recs.push({
      id: 'ci_rec_reality_check',
      category: 'reality_check',
      title: 'Check the Facts',
      message: 'Before reacting, checking the facts can help you see the situation more clearly.',
      route: '/exercise?id=c5',
      icon: 'Search',
      priority: 'medium',
      reason: 'Relationship trigger detected',
    });
  }

  const hasHighUrge = urges.some(u => u.risk === 'high');
  if (hasHighUrge) {
    recs.push({
      id: 'ci_rec_opposite',
      category: 'opposite_action',
      title: 'Opposite Action',
      message: 'You\'re experiencing strong urges. Doing the opposite can help break the cycle.',
      route: '/exercise?id=c7',
      icon: 'RefreshCw',
      priority: 'high',
      reason: 'High-risk urge detected',
    });
  }

  const sadEmotions = ['Sad', 'Abandoned', 'Empty', 'Desperate'];
  if (emotions.some(e => sadEmotions.includes(e))) {
    recs.push({
      id: 'ci_rec_soothe',
      category: 'self_soothing',
      title: 'Self-Soothe',
      message: 'Being gentle with yourself right now can make a real difference.',
      route: '/exercise?id=c3',
      icon: 'Heart',
      priority: 'medium',
      reason: 'Sadness-related emotions',
    });
  }

  recs.sort((a, b) => priorityScore(b.priority) - priorityScore(a.priority));

  console.log('[CopingRecommendation] Check-in recs:', recs.length);

  return recs.slice(0, 3);
}
