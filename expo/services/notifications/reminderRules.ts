import {
  ReminderRule,
  ReminderRuleContext,
  ReminderDecision,
} from '@/types/reminderRules';
import { getRandomTemplate } from './notificationTemplates';

const HOUR_MS = 60 * 60 * 1000;
const _DAY_MS = 24 * HOUR_MS;

function hoursAgo(timestamp: number | null): number {
  if (!timestamp) return Infinity;
  return (Date.now() - timestamp) / HOUR_MS;
}

function isToday(timestamp: number | null): boolean {
  if (!timestamp) return false;
  const now = new Date();
  const d = new Date(timestamp);
  return now.getFullYear() === d.getFullYear() &&
    now.getMonth() === d.getMonth() &&
    now.getDate() === d.getDate();
}

function personalizedCheckinCopy(ctx: ReminderRuleContext): { title: string; body: string } | undefined {
  if (ctx.mostUsedFeature === 'relationship_copilot' || ctx.recentRelationshipFlowCount > 2) {
    return {
      title: 'A moment for you',
      body: 'Relationship stress can linger. Checking in helps you notice what you need.',
    };
  }
  if (ctx.recentDistressLevels.length > 0) {
    const avg = ctx.recentDistressLevels.reduce((a, b) => a + b, 0) / ctx.recentDistressLevels.length;
    if (avg >= 5) {
      return {
        title: 'How are you today?',
        body: 'Things have been intense lately. A quick check-in can bring some clarity.',
      };
    }
  }
  return undefined;
}

function personalizedFollowUpCopy(ctx: ReminderRuleContext): { title: string; body: string } | undefined {
  if (ctx.mostUsedFeature === 'journal' || ctx.mostUsedFeature === 'identity_journal') {
    return {
      title: 'How are you now?',
      body: 'Writing about what happened earlier might help you process it.',
    };
  }
  if (ctx.mostUsedFeature === 'ai_companion') {
    return {
      title: 'Checking in with you',
      body: 'Your companion is here if you want to talk through what happened earlier.',
    };
  }
  return undefined;
}

function personalizedRelationshipCopy(ctx: ReminderRuleContext): { title: string; body: string } | undefined {
  if (ctx.recentMessageGuardUsage > 0) {
    return {
      title: 'Before you respond',
      body: 'Slowing down has helped you before. A short pause may protect what matters.',
    };
  }
  if (ctx.recentSpiralDetected) {
    return {
      title: 'A gentle pause',
      body: 'A familiar pattern may be active. Support is here when you need it.',
    };
  }
  return undefined;
}

export const REMINDER_RULES: ReminderRule[] = [
  {
    id: 'daily_checkin',
    category: 'daily_checkin',
    priority: 'routine_support',
    priorityScore: 30,
    evaluate(ctx: ReminderRuleContext): ReminderDecision {
      const checkedInToday = ctx.lastCheckInTime !== null && isToday(ctx.lastCheckInTime);
      const shouldFire = !checkedInToday;

      const template = getRandomTemplate('daily_checkin');
      const personalized = personalizedCheckinCopy(ctx);

      return {
        ruleId: 'daily_checkin',
        shouldFire,
        category: 'daily_checkin',
        priority: 'routine_support',
        priorityScore: 30,
        delaySeconds: 0,
        reason: checkedInToday ? 'Already checked in today' : 'No check-in today',
        deepLink: '/check-in',
        personalizedCopy: personalized ?? { title: template.title, body: template.body },
      };
    },
  },
  {
    id: 'calm_followup',
    category: 'calm_followup',
    priority: 'high_value_support',
    priorityScore: 15,
    evaluate(ctx: ReminderRuleContext): ReminderDecision {
      const hadHighDistress = ctx.highDistressToday && ctx.highDistressTimestamp !== null;
      const enoughTimePassed = ctx.highDistressTimestamp !== null && hoursAgo(ctx.highDistressTimestamp) >= 2;
      const noFollowUp = !ctx.hasFollowUpAfterDistress;
      const shouldFire = hadHighDistress && enoughTimePassed && noFollowUp;

      const delayHours = ctx.currentDistress >= 8 ? 2 : 3;
      const delayFromNow = hadHighDistress && ctx.highDistressTimestamp
        ? Math.max(0, (ctx.highDistressTimestamp + delayHours * HOUR_MS - Date.now()) / 1000)
        : delayHours * 3600;

      const template = getRandomTemplate('calm_followup');
      const personalized = personalizedFollowUpCopy(ctx);

      return {
        ruleId: 'calm_followup',
        shouldFire,
        category: 'calm_followup',
        priority: 'high_value_support',
        priorityScore: 15,
        delaySeconds: Math.max(1, Math.round(delayFromNow)),
        reason: !hadHighDistress
          ? 'No high distress today'
          : !enoughTimePassed
            ? 'Too soon after distress event'
            : !noFollowUp
              ? 'User already followed up'
              : 'High distress without follow-up',
        deepLink: personalized && ctx.mostUsedFeature === 'ai_companion'
          ? '/(tabs)/companion'
          : '/check-in',
        personalizedCopy: personalized ?? { title: template.title, body: template.body },
      };
    },
  },
  {
    id: 'weekly_reflection_ready',
    category: 'weekly_reflection',
    priority: 'high_value_support',
    priorityScore: 20,
    evaluate(ctx: ReminderRuleContext): ReminderDecision {
      const available = ctx.weeklyReflectionAvailable;
      const notViewed = !ctx.weeklyReflectionViewed;
      const shouldFire = available && notViewed;

      const template = getRandomTemplate('weekly_reflection');

      return {
        ruleId: 'weekly_reflection_ready',
        shouldFire,
        category: 'weekly_reflection',
        priority: 'high_value_support',
        priorityScore: 20,
        delaySeconds: 0,
        reason: !available
          ? 'No weekly reflection available'
          : !notViewed
            ? 'Already viewed this week'
            : 'Weekly reflection ready and unviewed',
        deepLink: '/weekly-reflection',
        personalizedCopy: { title: template.title, body: template.body },
      };
    },
  },
  {
    id: 'relationship_support',
    category: 'relationship_support',
    priority: 'high_value_support',
    priorityScore: 12,
    evaluate(ctx: ReminderRuleContext): ReminderDecision {
      const hasRecentActivity = ctx.recentRelationshipFlowCount > 0 ||
        ctx.recentSpiralDetected ||
        ctx.recentMessageGuardUsage > 0;
      const hasRecentRewrites = ctx.recentRewriteCount >= 2;
      const shouldFire = hasRecentActivity || hasRecentRewrites;

      const template = getRandomTemplate('relationship_support');
      const personalized = personalizedRelationshipCopy(ctx);

      return {
        ruleId: 'relationship_support',
        shouldFire,
        category: 'relationship_support',
        priority: 'high_value_support',
        priorityScore: 12,
        delaySeconds: 30 * 60,
        reason: shouldFire
          ? 'Recent relationship-triggered activity detected'
          : 'No recent relationship triggers',
        deepLink: ctx.recentMessageGuardUsage > 0
          ? '/message-guard'
          : '/relationship-copilot',
        personalizedCopy: personalized ?? { title: template.title, body: template.body },
      };
    },
  },
  {
    id: 'ritual_habit',
    category: 'ritual_reminder',
    priority: 'routine_support',
    priorityScore: 35,
    evaluate(ctx: ReminderRuleContext): ReminderDecision {
      const usuallyCompletes = ctx.averageRitualCompletionsPerWeek >= 3;
      const missedToday = ctx.lastRitualCompleteTime === null || !isToday(ctx.lastRitualCompleteTime);
      const shouldFire = usuallyCompletes && missedToday;

      return {
        ruleId: 'ritual_habit',
        shouldFire,
        category: 'ritual_reminder',
        priority: 'routine_support',
        priorityScore: 35,
        delaySeconds: 0,
        reason: !usuallyCompletes
          ? 'Not enough ritual history to justify reminder'
          : !missedToday
            ? 'Ritual already completed today'
            : 'Usually completes rituals but missed today',
        deepLink: '/daily-ritual',
        personalizedCopy: {
          title: 'Your daily ritual',
          body: 'A small reset could help right now.',
        },
      };
    },
  },
  {
    id: 'reengagement',
    category: 'reengagement',
    priority: 'reengagement',
    priorityScore: 50,
    evaluate(ctx: ReminderRuleContext): ReminderDecision {
      const awayLongEnough = ctx.daysSinceLastOpen >= 2;
      const hadUsage = ctx.totalCoreFeatureUsageCount >= 5;
      const shouldFire = awayLongEnough && hadUsage;

      return {
        ruleId: 'reengagement',
        shouldFire,
        category: 'reengagement',
        priority: 'reengagement',
        priorityScore: 50,
        delaySeconds: 0,
        reason: !awayLongEnough
          ? 'User opened app recently'
          : !hadUsage
            ? 'Not enough prior usage'
            : `User away ${ctx.daysSinceLastOpen} days with prior engagement`,
        deepLink: '/check-in',
        personalizedCopy: {
          title: 'A calmer space is here',
          body: 'Whenever you need it, this space is waiting for you.',
        },
      };
    },
  },
];

export function getRuleById(id: string): ReminderRule | undefined {
  return REMINDER_RULES.find(r => r.id === id);
}
