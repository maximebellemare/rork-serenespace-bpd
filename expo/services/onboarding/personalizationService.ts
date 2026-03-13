import { OnboardingProfile, PrimaryReason, PreferredTool } from '@/types/onboarding';

export interface HomeCardBoost {
  key: string;
  priorityBoost: number;
  forceVisible: boolean;
}

export function getPersonalizedCardBoosts(profile: OnboardingProfile): HomeCardBoost[] {
  const boosts: HomeCardBoost[] = [];

  if (!profile.primaryReason && profile.preferredTools.length === 0) {
    return boosts;
  }

  const reasonBoosts = getReasonBoosts(profile.primaryReason);
  const toolBoosts = getToolBoosts(profile.preferredTools);

  const merged = new Map<string, HomeCardBoost>();

  [...reasonBoosts, ...toolBoosts].forEach(b => {
    const existing = merged.get(b.key);
    if (existing) {
      existing.priorityBoost = Math.min(existing.priorityBoost, b.priorityBoost);
      existing.forceVisible = existing.forceVisible || b.forceVisible;
    } else {
      merged.set(b.key, { ...b });
    }
  });

  return Array.from(merged.values());
}

function getReasonBoosts(reason: PrimaryReason | null): HomeCardBoost[] {
  if (!reason) return [];

  switch (reason) {
    case 'relationship_spirals':
    case 'fear_of_abandonment':
      return [
        { key: 'relationship_copilot', priorityBoost: -15, forceVisible: true },
        { key: 'message_guard', priorityBoost: -12, forceVisible: true },
        { key: 'relationship_hub', priorityBoost: -10, forceVisible: true },
        { key: 'relationship_spiral', priorityBoost: -8, forceVisible: true },
        { key: 'conflict_replay', priorityBoost: -5, forceVisible: true },
      ];
    case 'impulsive_messaging':
      return [
        { key: 'message_guard', priorityBoost: -15, forceVisible: true },
        { key: 'relationship_copilot', priorityBoost: -10, forceVisible: true },
        { key: 'ai_companion', priorityBoost: -5, forceVisible: true },
      ];
    case 'emotional_overwhelm':
      return [
        { key: 'ai_companion', priorityBoost: -15, forceVisible: true },
        { key: 'crisis_mode', priorityBoost: -10, forceVisible: true },
        { key: 'emotional_playbook', priorityBoost: -8, forceVisible: true },
        { key: 'smart_coping', priorityBoost: -5, forceVisible: true },
      ];
    case 'therapy_support':
      return [
        { key: 'therapy_report', priorityBoost: -15, forceVisible: true },
        { key: 'weekly_reflection', priorityBoost: -12, forceVisible: true },
        { key: 'emotional_insights', priorityBoost: -8, forceVisible: true },
        { key: 'progress_dashboard', priorityBoost: -5, forceVisible: true },
      ];
    case 'building_stability':
      return [
        { key: 'daily_rituals', priorityBoost: -15, forceVisible: true },
        { key: 'progress_dashboard', priorityBoost: -12, forceVisible: true },
        { key: 'coaching', priorityBoost: -8, forceVisible: true },
        { key: 'emotional_playbook', priorityBoost: -5, forceVisible: true },
      ];
    case 'understanding_patterns':
      return [
        { key: 'emotional_insights', priorityBoost: -15, forceVisible: true },
        { key: 'emotional_loops', priorityBoost: -12, forceVisible: true },
        { key: 'emotional_profile', priorityBoost: -10, forceVisible: true },
        { key: 'home_insights', priorityBoost: -8, forceVisible: true },
        { key: 'emotional_timeline', priorityBoost: -5, forceVisible: true },
      ];
    case 'medication_routine':
      return [
        { key: 'daily_rituals', priorityBoost: -15, forceVisible: true },
        { key: 'progress_dashboard', priorityBoost: -10, forceVisible: true },
      ];
    default:
      return [];
  }
}

function getToolBoosts(tools: PreferredTool[]): HomeCardBoost[] {
  const boosts: HomeCardBoost[] = [];

  tools.forEach((tool, index) => {
    const weight = -(10 - index * 2);

    switch (tool) {
      case 'ai_companion':
        boosts.push({ key: 'ai_companion', priorityBoost: weight, forceVisible: true });
        break;
      case 'journaling':
        boosts.push({ key: 'reflection_mirror', priorityBoost: weight, forceVisible: true });
        break;
      case 'grounding':
        boosts.push({ key: 'smart_coping', priorityBoost: weight, forceVisible: true });
        break;
      case 'pause_before_messaging':
        boosts.push({ key: 'message_guard', priorityBoost: weight, forceVisible: true });
        break;
      case 'relationship_support':
        boosts.push({ key: 'relationship_copilot', priorityBoost: weight, forceVisible: true });
        boosts.push({ key: 'relationship_hub', priorityBoost: weight + 2, forceVisible: true });
        break;
      case 'reflections_insights':
        boosts.push({ key: 'emotional_insights', priorityBoost: weight, forceVisible: true });
        boosts.push({ key: 'home_insights', priorityBoost: weight + 2, forceVisible: true });
        break;
      case 'dbt_tools':
        boosts.push({ key: 'coaching', priorityBoost: weight, forceVisible: true });
        boosts.push({ key: 'emotional_playbook', priorityBoost: weight + 2, forceVisible: true });
        break;
      case 'routines_reminders':
        boosts.push({ key: 'daily_rituals', priorityBoost: weight, forceVisible: true });
        break;
    }
  });

  return boosts;
}

export function getCompanionSuggestedPrompts(profile: OnboardingProfile): string[] {
  const prompts: string[] = [];

  switch (profile.primaryReason) {
    case 'relationship_spirals':
      prompts.push("I'm spiraling about a relationship right now");
      prompts.push("Help me understand why I react this way in relationships");
      break;
    case 'fear_of_abandonment':
      prompts.push("I'm scared someone is going to leave me");
      prompts.push("Help me sit with the uncertainty");
      break;
    case 'impulsive_messaging':
      prompts.push("I want to send a message I might regret");
      prompts.push("Help me pause before I react");
      break;
    case 'emotional_overwhelm':
      prompts.push("Everything feels too much right now");
      prompts.push("Help me ground myself");
      break;
    case 'therapy_support':
      prompts.push("I want to prepare for my next therapy session");
      prompts.push("Help me reflect on what I've been working on");
      break;
    case 'building_stability':
      prompts.push("Help me build a routine that sticks");
      prompts.push("I want to feel more stable day to day");
      break;
    case 'understanding_patterns':
      prompts.push("What patterns have you noticed in my check-ins?");
      prompts.push("Help me understand my emotional triggers");
      break;
    case 'medication_routine':
      prompts.push("Help me stay on track with my routine");
      prompts.push("I'm struggling with consistency");
      break;
  }

  prompts.push("I just need someone to talk to");
  prompts.push("What should I focus on today?");

  return prompts.slice(0, 4);
}

export function getMessageDefaultSuggestions(profile: OnboardingProfile): string[] {
  const suggestions: string[] = [];

  if (profile.hardestMoments.includes('delayed_replies')) {
    suggestions.push("I'm anxious about waiting for a reply");
  }
  if (profile.hardestMoments.includes('not_knowing_how_to_respond')) {
    suggestions.push("I don't know what to say back");
  }
  if (profile.hardestMoments.includes('conflict')) {
    suggestions.push("I want to address this without escalating");
  }
  if (profile.primaryReason === 'impulsive_messaging') {
    suggestions.push("Let me pause and think about this first");
  }

  return suggestions.slice(0, 3);
}
