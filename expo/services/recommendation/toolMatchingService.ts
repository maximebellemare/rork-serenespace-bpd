import {
  SmartRecommendation,
  RecommendationToolId,
  RecommendationSignal,
  RecommendationUrgency,
  UserContextSnapshot,
} from '@/types/smartRecommendation';

interface ToolCandidate {
  toolId: RecommendationToolId;
  title: string;
  route: string;
  icon: string;
  signals: RecommendationSignal[];
  urgency: RecommendationUrgency;
  message: string;
  reason: string;
  baseScore: number;
  contextTags: string[];
}

function generateId(toolId: string, signal: string): string {
  return `sr_${toolId}_${signal}_${Date.now()}`;
}

function matchRelationshipDistress(ctx: UserContextSnapshot): ToolCandidate[] {
  const candidates: ToolCandidate[] = [];

  if (!ctx.isRelationshipActivated && ctx.latestTriggerCategory !== 'relationship') {
    return candidates;
  }

  if (ctx.recentRewriteCount > 0 || ctx.recentDraftCount >= 2) {
    candidates.push({
      toolId: 'message_guard',
      title: 'Message Guard',
      route: '/message-guard',
      icon: 'Shield',
      signals: ['relationship_distress', 'frequent_messaging'],
      urgency: ctx.distressLevel >= 7 ? 'immediate' : 'suggested',
      message: 'Pausing before sending may protect your peace right now.',
      reason: 'Relationship stress and messaging activity detected',
      baseScore: 85,
      contextTags: ['relationship', 'messaging'],
    });
  }

  candidates.push({
    toolId: 'relationship_copilot',
    title: 'Relationship Copilot',
    route: '/relationship-copilot',
    icon: 'Heart',
    signals: ['relationship_distress'],
    urgency: ctx.distressLevel >= 7 ? 'immediate' : 'suggested',
    message: 'This may help you work through what\'s happening.',
    reason: 'Relationship distress seems active',
    baseScore: 80,
    contextTags: ['relationship'],
  });

  return candidates;
}

function matchHighActivation(ctx: UserContextSnapshot): ToolCandidate[] {
  const candidates: ToolCandidate[] = [];

  if (ctx.distressLevel < 7 && !ctx.hasHighUrges) return candidates;

  if (ctx.distressLevel >= 8 || ctx.hasHighUrges) {
    candidates.push({
      toolId: 'crisis_regulation',
      title: 'Crisis Regulation',
      route: '/crisis-regulation',
      icon: 'Shield',
      signals: ['high_distress'],
      urgency: 'immediate',
      message: 'Your distress is very high. This can help you regulate step by step.',
      reason: 'Very high distress detected',
      baseScore: 95,
      contextTags: ['crisis', 'regulation'],
    });
  }

  candidates.push({
    toolId: 'guided_regulation',
    title: 'Guided Regulation',
    route: '/guided-regulation',
    icon: 'Wind',
    signals: ['high_activation'],
    urgency: ctx.distressLevel >= 8 ? 'immediate' : 'suggested',
    message: 'A guided regulation can help bring the intensity down.',
    reason: 'Elevated activation detected',
    baseScore: 78,
    contextTags: ['regulation'],
  });

  candidates.push({
    toolId: 'breathing_exercise',
    title: 'Breathing Exercise',
    route: '/exercise?id=c1',
    icon: 'Wind',
    signals: ['high_activation'],
    urgency: 'suggested',
    message: 'A few deep breaths may help settle your nervous system.',
    reason: 'Distress is elevated',
    baseScore: 70,
    contextTags: ['grounding', 'quick'],
  });

  return candidates;
}

function matchShameAfterConflict(ctx: UserContextSnapshot): ToolCandidate[] {
  const shameEmotions = ['Ashamed', 'Guilty', 'Regretful', 'Embarrassed'];
  const conflictTriggers = ['conflict', 'argument', 'fight'];

  const hasShame = ctx.topEmotionsThisWeek.some(e =>
    shameEmotions.some(s => e.toLowerCase().includes(s.toLowerCase()))
  );
  const hasConflict = ctx.topTriggersThisWeek.some(t =>
    conflictTriggers.some(c => t.toLowerCase().includes(c.toLowerCase()))
  ) || ctx.latestTriggerCategory === 'relationship';

  if (!hasShame || !hasConflict) return [];

  return [{
    toolId: 'conflict_reflection',
    title: 'After-Conflict Reflection',
    route: '/conflict-replay',
    icon: 'BookOpen',
    signals: ['shame_after_conflict'],
    urgency: 'suggested',
    message: 'Processing what happened can ease the weight you\'re carrying.',
    reason: 'Shame after a recent conflict',
    baseScore: 72,
    contextTags: ['conflict', 'reflection'],
  }];
}

function matchTherapyContext(ctx: UserContextSnapshot): ToolCandidate[] {
  const candidates: ToolCandidate[] = [];

  if (!ctx.hasUpcomingAppointment) return candidates;

  if (ctx.appointmentWithinHours !== null && ctx.appointmentWithinHours <= 24) {
    candidates.push({
      toolId: 'therapy_prep',
      title: 'Therapy Prep',
      route: '/appointments',
      icon: 'FileText',
      signals: ['pre_therapy'],
      urgency: ctx.appointmentWithinHours <= 4 ? 'immediate' : 'suggested',
      message: 'Your appointment is coming up. Preparing can make it more productive.',
      reason: `Appointment within ${ctx.appointmentWithinHours <= 4 ? 'a few hours' : '24 hours'}`,
      baseScore: ctx.appointmentWithinHours <= 4 ? 88 : 68,
      contextTags: ['therapy', 'preparation'],
    });
  }

  return candidates;
}

function matchMedicationContext(ctx: UserContextSnapshot): ToolCandidate[] {
  const candidates: ToolCandidate[] = [];

  if (ctx.hasMissedMedication && ctx.distressLevel >= 5) {
    candidates.push({
      toolId: 'medication_log',
      title: 'Log Medication',
      route: '/medications',
      icon: 'Pill',
      signals: ['missed_medication'],
      urgency: 'suggested',
      message: 'A missed medication was noted. Logging it may help track the connection.',
      reason: 'Missed medication with elevated distress',
      baseScore: 65,
      contextTags: ['medication', 'tracking'],
    });
  } else if (ctx.hasMedicationDue) {
    candidates.push({
      toolId: 'medication_log',
      title: 'Medication Due',
      route: '/medications',
      icon: 'Pill',
      signals: ['medication_due'],
      urgency: 'gentle',
      message: 'You have a medication due. A quick log keeps things on track.',
      reason: 'Medication is due',
      baseScore: 45,
      contextTags: ['medication'],
    });
  }

  return candidates;
}

function matchDailyRoutine(ctx: UserContextSnapshot): ToolCandidate[] {
  const candidates: ToolCandidate[] = [];

  if (ctx.recentCheckInCount === 0) {
    candidates.push({
      toolId: 'check_in',
      title: 'Daily Check-In',
      route: '/check-in',
      icon: 'Heart',
      signals: ['no_check_in_today'],
      urgency: 'gentle',
      message: 'Start your day with a quick emotional check-in.',
      reason: 'No check-in recorded recently',
      baseScore: 55,
      contextTags: ['routine', 'check-in'],
    });
  }

  if (ctx.recentMovementCount === 0 && ctx.distressLevel >= 4) {
    candidates.push({
      toolId: 'movement_log',
      title: 'Calming Movement',
      route: '/movement-log',
      icon: 'Activity',
      signals: ['no_movement_recent'],
      urgency: 'gentle',
      message: 'Movement tends to help on harder days. Even a short walk counts.',
      reason: 'No recent movement and elevated distress',
      baseScore: 40,
      contextTags: ['movement', 'regulation'],
    });
  }

  return candidates;
}

function matchEmotionalOverwhelm(ctx: UserContextSnapshot): ToolCandidate[] {
  const overwhelmEmotions = ['Overwhelmed', 'Desperate', 'Panicked', 'Afraid'];
  const hasOverwhelm = ctx.topEmotionsThisWeek.some(e =>
    overwhelmEmotions.some(o => e.toLowerCase().includes(o.toLowerCase()))
  ) || ctx.latestEmotion?.toLowerCase().includes('overwhelm');

  if (!hasOverwhelm && ctx.distressLevel < 6) return [];

  const candidates: ToolCandidate[] = [];

  if (hasOverwhelm || ctx.distressLevel >= 6) {
    candidates.push({
      toolId: 'companion',
      title: 'Talk It Through',
      route: '/(tabs)/companion',
      icon: 'MessageCircle',
      signals: ['emotional_overwhelm'],
      urgency: 'suggested',
      message: 'Sometimes talking through what\'s happening can bring clarity.',
      reason: 'Emotional overwhelm detected',
      baseScore: 62,
      contextTags: ['companion', 'support'],
    });
  }

  if (ctx.distressLevel >= 5) {
    candidates.push({
      toolId: 'grounding_exercise',
      title: '5-4-3-2-1 Grounding',
      route: '/exercise?id=c1',
      icon: 'Anchor',
      signals: ['emotional_overwhelm'],
      urgency: 'suggested',
      message: 'Grounding can help bring you back to the present moment.',
      reason: 'Elevated emotional intensity',
      baseScore: 68,
      contextTags: ['grounding', 'quick'],
    });
  }

  return candidates;
}

function matchRepeatedTrigger(ctx: UserContextSnapshot): ToolCandidate[] {
  if (ctx.topTriggersThisWeek.length === 0) return [];

  const topTrigger = ctx.topTriggersThisWeek[0];

  return [{
    toolId: 'learn_article',
    title: 'Understand This Pattern',
    route: '/(tabs)/learn',
    icon: 'BookOpen',
    signals: ['repeated_trigger'],
    urgency: 'gentle',
    message: `"${topTrigger}" keeps coming up. Learning about it may help.`,
    reason: `Recurring trigger: ${topTrigger}`,
    baseScore: 42,
    contextTags: ['learning', 'patterns'],
  }];
}

function matchCalmGrowth(ctx: UserContextSnapshot): ToolCandidate[] {
  if (ctx.emotionalZone !== 'calm' && ctx.emotionalZone !== 'recovering') return [];

  const candidates: ToolCandidate[] = [];

  if (ctx.journalStreakDays >= 2) {
    candidates.push({
      toolId: 'weekly_reflection',
      title: 'Weekly Reflection',
      route: '/weekly-reflection',
      icon: 'BookOpen',
      signals: ['growth_opportunity'],
      urgency: 'gentle',
      message: 'A good moment to reflect on how the week has been.',
      reason: 'Consistent check-ins this week',
      baseScore: 48,
      contextTags: ['reflection', 'growth'],
    });
  }

  candidates.push({
    toolId: 'daily_ritual',
    title: 'Daily Ritual',
    route: '/daily-ritual',
    icon: 'Sparkles',
    signals: ['calm_state'],
    urgency: 'gentle',
    message: 'A calm moment for your daily practice.',
    reason: 'A peaceful time for consistency',
    baseScore: 38,
    contextTags: ['routine', 'stability'],
  });

  return candidates;
}

function matchAbandonmentFear(ctx: UserContextSnapshot): ToolCandidate[] {
  const abandonmentEmotions = ['Abandoned', 'Rejected', 'Alone', 'Unwanted'];
  const hasAbandonment = ctx.topEmotionsThisWeek.some(e =>
    abandonmentEmotions.some(a => e.toLowerCase().includes(a.toLowerCase()))
  ) || ctx.latestEmotion?.toLowerCase().includes('abandon');

  if (!hasAbandonment) return [];

  return [
    {
      toolId: 'reality_check',
      title: 'Check the Facts',
      route: '/exercise?id=c5',
      icon: 'Search',
      signals: ['abandonment_fear'],
      urgency: 'suggested',
      message: 'When fear of abandonment is strong, checking facts can offer perspective.',
      reason: 'Abandonment-related feelings detected',
      baseScore: 66,
      contextTags: ['abandonment', 'dbt'],
    },
    {
      toolId: 'companion',
      title: 'Talk About It',
      route: '/(tabs)/companion',
      icon: 'MessageCircle',
      signals: ['abandonment_fear'],
      urgency: 'suggested',
      message: 'Your Companion can help explore what\'s behind this feeling.',
      reason: 'Abandonment fear is active',
      baseScore: 58,
      contextTags: ['companion', 'abandonment'],
    },
  ];
}

function matchLateNight(ctx: UserContextSnapshot): ToolCandidate[] {
  if (!ctx.isLateNight) return [];

  const candidates: ToolCandidate[] = [];

  if (ctx.distressLevel >= 5) {
    candidates.push({
      toolId: 'self_soothe',
      title: 'Self-Soothe',
      route: '/exercise?id=c3',
      icon: 'Heart',
      signals: ['late_night'],
      urgency: 'suggested',
      message: 'Late-night distress is harder. Be gentle with yourself.',
      reason: 'Late night with elevated distress',
      baseScore: 64,
      contextTags: ['night', 'soothing'],
    });
  }

  if (ctx.recentDraftCount > 0) {
    candidates.push({
      toolId: 'pause_mode',
      title: 'Pause Mode',
      route: '/message-guard',
      icon: 'Timer',
      signals: ['late_night', 'frequent_messaging'],
      urgency: 'immediate',
      message: 'Late-night messages often feel different in the morning. Pause first.',
      reason: 'Late night messaging activity',
      baseScore: 82,
      contextTags: ['night', 'messaging', 'pause'],
    });
  }

  return candidates;
}

export function matchToolsToContext(ctx: UserContextSnapshot): ToolCandidate[] {
  console.log('[ToolMatching] Matching tools for zone:', ctx.emotionalZone, 'distress:', ctx.distressLevel);

  const allCandidates: ToolCandidate[] = [
    ...matchHighActivation(ctx),
    ...matchRelationshipDistress(ctx),
    ...matchLateNight(ctx),
    ...matchShameAfterConflict(ctx),
    ...matchAbandonmentFear(ctx),
    ...matchEmotionalOverwhelm(ctx),
    ...matchTherapyContext(ctx),
    ...matchMedicationContext(ctx),
    ...matchDailyRoutine(ctx),
    ...matchRepeatedTrigger(ctx),
    ...matchCalmGrowth(ctx),
  ];

  console.log('[ToolMatching] Found', allCandidates.length, 'raw candidates');
  return allCandidates;
}

export function candidatesToRecommendations(candidates: ToolCandidate[]): SmartRecommendation[] {
  return candidates.map(c => ({
    id: generateId(c.toolId, c.signals[0]),
    toolId: c.toolId,
    title: c.title,
    message: c.message,
    route: c.route,
    icon: c.icon,
    urgency: c.urgency,
    signal: c.signals[0],
    reason: c.reason,
    score: c.baseScore,
    contextTags: c.contextTags,
  }));
}
