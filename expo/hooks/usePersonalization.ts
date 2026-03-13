import { useMemo } from 'react';
import { useProfile } from '@/providers/ProfileProvider';
import { useApp } from '@/providers/AppProvider';


export interface PersonalizedRecommendation {
  id: string;
  label: string;
  route: string;
  reason: string;
  priority: number;
}

export interface PersonalizationContext {
  preferredPauseSeconds: number;
  topCopingTools: string[];
  topTriggers: string[];
  topRelationshipTriggers: string[];
  recentDistressAvg: number;
  isRelationshipActivated: boolean;
  suggestedTools: PersonalizedRecommendation[];
  growthSignals: string[];
}

export function usePersonalization(): PersonalizationContext {
  const { profile, patternSummary } = useProfile();
  const { journalEntries, messageDrafts } = useApp();


  return useMemo(() => {
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const recentEntries = journalEntries.filter(e => e.timestamp >= sevenDaysAgo);

    const recentDistressSum = recentEntries.reduce((sum, e) => sum + e.checkIn.intensityLevel, 0);
    const recentDistressAvg = recentEntries.length > 0
      ? Math.round((recentDistressSum / recentEntries.length) * 10) / 10
      : 0;

    const recentRelTriggers = recentEntries.filter(e =>
      e.checkIn.triggers.some(t =>
        t.label.toLowerCase().includes('abandon') ||
        t.label.toLowerCase().includes('reject') ||
        t.label.toLowerCase().includes('ignored') ||
        t.label.toLowerCase().includes('replaced')
      )
    );
    const recentDrafts = messageDrafts.filter(d => d.timestamp >= sevenDaysAgo);
    const isRelationshipActivated = recentRelTriggers.length >= 2 || recentDrafts.length >= 3;

    const suggestions: PersonalizedRecommendation[] = [];

    if (recentDistressAvg >= 7) {
      suggestions.push({
        id: 'grounding',
        label: 'Grounding Exercise',
        route: '/exercise?id=c1',
        reason: 'Distress seems elevated lately — grounding may help.',
        priority: 10,
      });
    }

    if (isRelationshipActivated) {
      suggestions.push({
        id: 'copilot',
        label: 'Relationship Copilot',
        route: '/relationship-copilot',
        reason: 'Relationship stress seems active — slow support may help.',
        priority: 9,
      });
    }

    if (profile.preferredGroundingTools.length > 0 && recentDistressAvg >= 5) {
      suggestions.push({
        id: 'preferred-ground',
        label: profile.preferredGroundingTools[0],
        route: '/exercise?id=c1',
        reason: `This is one of your preferred grounding tools.`,
        priority: 8,
      });
    }

    if (patternSummary.journalStreak >= 3) {
      suggestions.push({
        id: 'reflection',
        label: 'Weekly Reflection',
        route: '/weekly-reflection',
        reason: "You've been consistent — a reflection may feel meaningful.",
        priority: 6,
      });
    }

    if (recentDrafts.length >= 2) {
      suggestions.push({
        id: 'message-guard',
        label: 'Message Guard',
        route: '/message-guard',
        reason: 'You seem to be processing communication — this may help.',
        priority: 7,
      });
    }

    suggestions.sort((a, b) => b.priority - a.priority);

    const growthSignals: string[] = [];
    if (patternSummary.journalStreak >= 3) {
      growthSignals.push(`${patternSummary.journalStreak}-day check-in streak — consistency matters.`);
    }

    const pauseCount = messageDrafts.filter(d =>
      d.timestamp >= sevenDaysAgo && d.paused
    ).length;
    if (pauseCount >= 2) {
      growthSignals.push('You paused before sending more often this week.');
    }

    if (recentDistressAvg > 0 && recentDistressAvg < 5) {
      growthSignals.push('Average distress this week seems more manageable.');
    }

    const copingUsed = recentEntries.flatMap(e => e.checkIn.copingUsed ?? []);
    if (copingUsed.length >= 3) {
      growthSignals.push('You reached for coping tools multiple times this week.');
    }

    return {
      preferredPauseSeconds: profile.messageDelaySeconds,
      topCopingTools: profile.whatHelpsMe.slice(0, 3),
      topTriggers: profile.commonTriggers.slice(0, 3),
      topRelationshipTriggers: profile.relationshipTriggers.slice(0, 3),
      recentDistressAvg,
      isRelationshipActivated,
      suggestedTools: suggestions.slice(0, 4),
      growthSignals,
    };
  }, [profile, patternSummary, journalEntries, messageDrafts]);
}
