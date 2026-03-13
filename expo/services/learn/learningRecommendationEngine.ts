import { LESSONS } from '@/data/lessons';
import { Lesson } from '@/types/learn';
import { JournalEntry, MessageDraft } from '@/types';
import {
  EmotionalSignal,
  LearningRecommendation,
  LearningRecommendationResult,
  LearningTag,
  PostEventSuggestion,
} from '@/types/learningRecommendation';

const SIGNAL_TAG_MAP: Record<EmotionalSignal, LearningTag[]> = {
  high_distress: ['distress', 'emotional_regulation', 'grounding', 'crisis', 'coping_skills'],
  relationship_trigger: ['relationship_conflict', 'communication', 'attachment', 'abandonment'],
  abandonment_fear: ['abandonment', 'trigger_awareness', 'self_compassion', 'attachment'],
  emotional_overwhelm: ['emotional_regulation', 'grounding', 'coping_skills', 'mindfulness', 'crisis'],
  communication_anxiety: ['communication', 'relationship_conflict', 'impulse_control'],
  identity_confusion: ['identity', 'self_worth', 'self_compassion'],
  recent_conflict: ['relationship_conflict', 'communication', 'impulse_control', 'trigger_awareness'],
  post_conflict_reflection: ['communication', 'self_compassion', 'relationship_conflict', 'recovery'],
  crisis_recovery: ['recovery', 'grounding', 'self_compassion', 'daily_stability'],
  calm_growth: ['dbt_skills', 'recovery', 'daily_stability', 'mindfulness', 'identity'],
  self_worth_struggle: ['self_worth', 'self_compassion', 'identity'],
  trigger_awareness: ['trigger_awareness', 'emotional_regulation', 'grounding', 'mindfulness'],
};

const TAG_ALIAS_MAP: Record<string, LearningTag[]> = {
  'basics': ['emotional_regulation'],
  'diagnosis': ['self_compassion'],
  'emotions': ['emotional_regulation', 'distress'],
  'intensity': ['emotional_regulation', 'distress'],
  'sensitivity': ['emotional_regulation'],
  'theory': ['self_compassion'],
  'validation': ['self_compassion'],
  'biosocial': ['self_compassion'],
  'origins': ['self_compassion'],
  'childhood': ['self_compassion'],
  'understanding': ['self_compassion'],
  'stigma': ['self_compassion'],
  'myths': ['self_compassion'],
  'facts': ['self_compassion'],
  'abandonment': ['abandonment'],
  'fear': ['abandonment', 'trigger_awareness'],
  'dysregulation': ['emotional_regulation', 'distress'],
  'brain': ['emotional_regulation'],
  'neuroscience': ['emotional_regulation'],
  'feelings': ['emotional_regulation', 'mindfulness'],
  'actions': ['impulse_control'],
  'awareness': ['trigger_awareness', 'mindfulness'],
  'relationships': ['relationship_conflict'],
  'connection': ['attachment', 'relationship_conflict'],
  'attachment': ['attachment'],
  'memory': ['trigger_awareness'],
  'triggers': ['trigger_awareness'],
  'past': ['trigger_awareness'],
  'regulation': ['emotional_regulation'],
  'crisis': ['crisis', 'distress'],
  'TIPP': ['coping_skills', 'crisis'],
  '90-second': ['emotional_regulation'],
  'science': ['emotional_regulation'],
  'pause': ['impulse_control'],
  'impulse': ['impulse_control'],
  'grounding': ['grounding'],
  'mindfulness': ['mindfulness', 'grounding'],
  'practical': ['coping_skills'],
  'avoidance': ['emotional_regulation'],
  'overwhelm': ['distress', 'crisis'],
  'survival': ['crisis', 'coping_skills'],
  'coping': ['coping_skills'],
  'distress tolerance': ['distress', 'coping_skills'],
  'sitting with feelings': ['mindfulness'],
  'waves': ['emotional_regulation'],
  'impermanence': ['mindfulness'],
  'hope': ['recovery'],
  'push-pull': ['relationship_conflict', 'attachment'],
  'patterns': ['trigger_awareness'],
  'texting': ['communication', 'impulse_control'],
  'communication': ['communication'],
  'conflict': ['relationship_conflict'],
  'DEAR MAN': ['communication', 'dbt_skills'],
  'reassurance': ['abandonment', 'attachment'],
  'self-soothing': ['coping_skills', 'grounding'],
  'support': ['communication'],
  'vulnerability': ['communication', 'self_compassion'],
  'healing': ['recovery', 'self_compassion'],
  'repair': ['communication', 'relationship_conflict'],
  'fact-checking': ['trigger_awareness', 'mindfulness'],
  'self-awareness': ['trigger_awareness', 'mindfulness'],
  'flashbacks': ['trigger_awareness', 'grounding'],
  'trauma': ['trigger_awareness', 'grounding'],
  'silence': ['abandonment'],
  'ambiguity': ['abandonment', 'trigger_awareness'],
  'reframing': ['trigger_awareness'],
  'cognitive': ['trigger_awareness'],
  'slowing down': ['impulse_control', 'mindfulness'],
  'STOP skill': ['dbt_skills', 'impulse_control'],
  'identity': ['identity'],
  'self-image': ['identity', 'self_worth'],
  'values': ['identity'],
  'meaning': ['identity'],
  'self-building': ['identity', 'self_worth'],
  'growth': ['recovery'],
  'self-compassion': ['self_compassion'],
  'mistakes': ['self_compassion'],
  'self-worth': ['self_worth'],
  'rebuilding': ['self_worth', 'recovery'],
  'self-trust': ['self_worth', 'identity'],
  'confidence': ['self_worth'],
  'expression': ['communication'],
  'I-statements': ['communication', 'dbt_skills'],
  'needs': ['communication'],
  'assertiveness': ['communication'],
  'listening': ['communication'],
  'reactivity': ['impulse_control'],
  'apology': ['communication', 'relationship_conflict'],
  'storms': ['crisis', 'distress'],
  'endurance': ['coping_skills'],
  'release': ['coping_skills'],
  'healthy coping': ['coping_skills'],
  'routines': ['daily_stability'],
  'stability': ['daily_stability'],
  'habits': ['daily_stability'],
  'PLEASE skills': ['dbt_skills', 'daily_stability'],
  'self-care': ['daily_stability', 'self_compassion'],
  'morning': ['daily_stability'],
  'ritual': ['daily_stability'],
  'dbt': ['dbt_skills'],
  'therapy': ['dbt_skills', 'recovery'],
  'skills': ['dbt_skills', 'coping_skills'],
  'wise mind': ['dbt_skills', 'mindfulness'],
  'balance': ['mindfulness'],
  'opposite action': ['dbt_skills'],
  'recovery': ['recovery'],
  'research': ['recovery'],
};

function resolveLessonTags(lesson: Lesson): LearningTag[] {
  const resolved = new Set<LearningTag>();
  for (const tag of lesson.tags) {
    const aliases = TAG_ALIAS_MAP[tag];
    if (aliases) {
      aliases.forEach(a => resolved.add(a));
    }
  }
  return Array.from(resolved);
}

function detectSignals(
  journalEntries: JournalEntry[],
  messageDrafts: MessageDraft[],
): EmotionalSignal[] {
  const signals: EmotionalSignal[] = [];
  const dayMs = 24 * 60 * 60 * 1000;
  const threeDays = 3 * dayMs;
  const weekMs = 7 * dayMs;
  const now = Date.now();

  const recentEntries = journalEntries.filter(e => now - e.timestamp < threeDays);
  const weekEntries = journalEntries.filter(e => now - e.timestamp < weekMs);
  const recentDrafts = messageDrafts.filter(d => now - d.timestamp < threeDays);

  const maxIntensity = recentEntries.reduce(
    (max, e) => Math.max(max, e.checkIn?.intensityLevel ?? 0), 0
  );

  if (maxIntensity >= 8) {
    signals.push('high_distress');
  } else if (maxIntensity >= 6) {
    signals.push('emotional_overwhelm');
  }

  const hasRelTrigger = recentEntries.some(e =>
    e.checkIn?.triggers?.some(t => t.category === 'relationship')
  );
  if (hasRelTrigger) {
    signals.push('relationship_trigger');
  }

  const hasAbandonmentTrigger = recentEntries.some(e =>
    e.checkIn?.triggers?.some(t =>
      t.label?.toLowerCase().includes('abandon') ||
      t.label?.toLowerCase().includes('reject') ||
      t.label?.toLowerCase().includes('left out') ||
      t.label?.toLowerCase().includes('ignored')
    )
  );
  if (hasAbandonmentTrigger) {
    signals.push('abandonment_fear');
  }

  const rewriteCount = recentDrafts.filter(d => d.rewrittenText).length;
  if (rewriteCount > 0) {
    signals.push('communication_anxiety');
  }

  const hasConflict = recentEntries.some(e =>
    e.checkIn?.triggers?.some(t =>
      t.label?.toLowerCase().includes('conflict') ||
      t.label?.toLowerCase().includes('argument') ||
      t.label?.toLowerCase().includes('fight')
    )
  );
  if (hasConflict) {
    signals.push('recent_conflict');
  }

  const hasIdentityStuff = recentEntries.some(e =>
    e.checkIn?.emotions?.some(em =>
      em.label?.toLowerCase().includes('confused') ||
      em.label?.toLowerCase().includes('lost') ||
      em.label?.toLowerCase().includes('empty')
    )
  );
  if (hasIdentityStuff) {
    signals.push('identity_confusion');
  }

  const hasSelfWorthStuff = recentEntries.some(e =>
    e.checkIn?.emotions?.some(em =>
      em.label?.toLowerCase().includes('shame') ||
      em.label?.toLowerCase().includes('worthless') ||
      em.label?.toLowerCase().includes('guilt')
    )
  );
  if (hasSelfWorthStuff) {
    signals.push('self_worth_struggle');
  }

  const wasCrisis = weekEntries.some(e => (e.checkIn?.intensityLevel ?? 0) >= 8);
  const isCalmerNow = maxIntensity < 5;
  if (wasCrisis && isCalmerNow) {
    signals.push('crisis_recovery');
  }

  if (recentEntries.some(e => (e.checkIn?.intensityLevel ?? 0) >= 4)) {
    signals.push('trigger_awareness');
  }

  const weekMaxIntensity = weekEntries.reduce(
    (max, e) => Math.max(max, e.checkIn?.intensityLevel ?? 0), 0
  );
  if (weekMaxIntensity < 4 && recentEntries.length > 0) {
    signals.push('calm_growth');
  }

  if (hasConflict && isCalmerNow) {
    signals.push('post_conflict_reflection');
  }

  if (signals.length === 0) {
    signals.push('calm_growth');
  }

  return signals;
}

function scoreLessonForSignals(
  lesson: Lesson,
  signals: EmotionalSignal[],
  completedIds: Set<string>,
  recentIds: Set<string>,
): { score: number; bestSignal: EmotionalSignal; reason: string } {
  const lessonTags = resolveLessonTags(lesson);
  let totalScore = 0;
  let bestSignal: EmotionalSignal = signals[0] ?? 'calm_growth';
  let bestSignalScore = 0;

  for (const signal of signals) {
    const relevantTags = SIGNAL_TAG_MAP[signal] ?? [];
    let signalScore = 0;

    for (const tag of relevantTags) {
      if (lessonTags.includes(tag)) {
        signalScore += 10;
      }
    }

    if (signalScore > bestSignalScore) {
      bestSignalScore = signalScore;
      bestSignal = signal;
    }

    totalScore += signalScore;
  }

  if (completedIds.has(lesson.id)) {
    totalScore *= 0.3;
  }

  if (recentIds.has(lesson.id)) {
    totalScore *= 0.1;
  }

  const reason = getReasonForSignal(bestSignal);

  return { score: totalScore, bestSignal, reason };
}

function getReasonForSignal(signal: EmotionalSignal): string {
  switch (signal) {
    case 'high_distress':
      return 'This may help when emotions are running high';
    case 'relationship_trigger':
      return 'Based on recent relationship patterns';
    case 'abandonment_fear':
      return 'When fear of abandonment shows up';
    case 'emotional_overwhelm':
      return 'For when emotions feel too big';
    case 'communication_anxiety':
      return 'To support calmer communication';
    case 'identity_confusion':
      return 'When you feel uncertain about who you are';
    case 'recent_conflict':
      return 'To help process recent conflict';
    case 'post_conflict_reflection':
      return 'A gentle way to reflect after conflict';
    case 'crisis_recovery':
      return 'Supporting your recovery';
    case 'calm_growth':
      return 'Building on your stability';
    case 'self_worth_struggle':
      return 'Because your worth is not in question';
    case 'trigger_awareness':
      return 'Understanding your triggers better';
  }
}

function getContextMessage(signals: EmotionalSignal[]): string {
  if (signals.includes('high_distress')) {
    return 'Based on recent emotional patterns';
  }
  if (signals.includes('relationship_trigger') || signals.includes('recent_conflict')) {
    return 'Suggested for what you are experiencing';
  }
  if (signals.includes('abandonment_fear')) {
    return 'Gentle reading for difficult feelings';
  }
  if (signals.includes('emotional_overwhelm')) {
    return 'When emotions feel like a lot';
  }
  if (signals.includes('crisis_recovery')) {
    return 'Supporting your recovery journey';
  }
  if (signals.includes('calm_growth')) {
    return 'Continuing your growth';
  }
  return 'Recommended for you';
}

export function generateLearningRecommendations(
  journalEntries: JournalEntry[],
  messageDrafts: MessageDraft[],
  completedLessonIds: string[] = [],
  recentlyViewedIds: string[] = [],
  maxResults: number = 3,
): LearningRecommendationResult {
  console.log('[LearningRecommendation] Generating recommendations...');

  const signals = detectSignals(journalEntries, messageDrafts);
  console.log('[LearningRecommendation] Detected signals:', signals);

  const completedSet = new Set(completedLessonIds);
  const recentSet = new Set(recentlyViewedIds.slice(0, 5));

  const scored: LearningRecommendation[] = LESSONS.map(lesson => {
    const { score, bestSignal, reason } = scoreLessonForSignals(lesson, signals, completedSet, recentSet);
    return {
      lessonId: lesson.id,
      score,
      reason,
      signal: bestSignal,
      contextLabel: getContextMessage([bestSignal]),
    };
  });

  scored.sort((a, b) => b.score - a.score);

  const recommendations = scored.slice(0, maxResults);

  console.log('[LearningRecommendation] Top recommendations:', recommendations.map(r => r.lessonId));

  return {
    recommendations,
    topSignals: signals.slice(0, 3),
    contextMessage: getContextMessage(signals),
  };
}

export function getPostEventSuggestions(flowSource: string): PostEventSuggestion[] {
  const suggestions: PostEventSuggestion[] = [];

  const flowMapping: Record<string, { tags: string[]; reason: string }> = {
    'relationship_copilot': {
      tags: ['communication', 'conflict', 'relationships'],
      reason: 'Learn more about healthy communication patterns',
    },
    'crisis_regulation': {
      tags: ['crisis', 'storms', 'overwhelm', 'grounding'],
      reason: 'Understanding emotional storms can build resilience',
    },
    'relationship_spiral': {
      tags: ['triggers', 'relationships', 'patterns', 'push-pull'],
      reason: 'Explore how relationship patterns form',
    },
    'message_guard': {
      tags: ['texting', 'communication', 'impulse', 'pause'],
      reason: 'Deepen your communication skills',
    },
    'guided_regulation': {
      tags: ['regulation', 'grounding', 'mindfulness'],
      reason: 'Build on your regulation practice',
    },
    'check_in': {
      tags: ['awareness', 'feelings', 'self-awareness'],
      reason: 'Explore what you noticed in your check-in',
    },
    'weekly_reflection': {
      tags: ['recovery', 'growth', 'self-compassion'],
      reason: 'Continue your reflective practice',
    },
  };

  const mapping = flowMapping[flowSource];
  if (!mapping) return suggestions;

  const matchingLessons = LESSONS.filter(lesson =>
    lesson.tags.some(t => mapping.tags.includes(t))
  );

  const shuffled = [...matchingLessons].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 2);

  for (const lesson of selected) {
    suggestions.push({
      lessonId: lesson.id,
      reason: mapping.reason,
      flowSource,
    });
  }

  return suggestions;
}

export function getCompanionArticleSuggestion(
  userMessage: string,
): PostEventSuggestion | null {
  const lower = userMessage.toLowerCase();

  const keywordMap: { keywords: string[]; tags: string[]; reason: string }[] = [
    {
      keywords: ['abandon', 'left', 'alone', 'rejected', 'ignored'],
      tags: ['abandonment', 'fear'],
      reason: 'This article might help you understand this feeling more deeply',
    },
    {
      keywords: ['angry', 'rage', 'furious', 'mad'],
      tags: ['regulation', 'intensity', 'coping'],
      reason: 'Here is something that might help with intense emotions',
    },
    {
      keywords: ['relationship', 'partner', 'fight', 'argument', 'conflict'],
      tags: ['relationships', 'communication', 'conflict'],
      reason: 'This might offer some perspective on relationships',
    },
    {
      keywords: ['overwhelm', 'too much', 'can\'t handle', 'drowning'],
      tags: ['overwhelm', 'grounding', 'crisis'],
      reason: 'When everything feels like too much, this might help',
    },
    {
      keywords: ['who am i', 'identity', 'don\'t know', 'lost', 'empty'],
      tags: ['identity', 'self-image', 'values'],
      reason: 'Exploring identity can be part of healing',
    },
    {
      keywords: ['worthless', 'shame', 'hate myself', 'not good enough'],
      tags: ['self-compassion', 'self-worth', 'self-building'],
      reason: 'You deserve compassion, especially from yourself',
    },
    {
      keywords: ['trigger', 'triggered', 'set off'],
      tags: ['triggers', 'awareness', 'slowing down'],
      reason: 'Understanding triggers can help you respond differently',
    },
  ];

  for (const entry of keywordMap) {
    if (entry.keywords.some(kw => lower.includes(kw))) {
      const matching = LESSONS.filter(l => l.tags.some(t => entry.tags.includes(t)));
      if (matching.length > 0) {
        const lesson = matching[Math.floor(Math.random() * matching.length)];
        return {
          lessonId: lesson.id,
          reason: entry.reason,
          flowSource: 'ai_companion',
        };
      }
    }
  }

  return null;
}
