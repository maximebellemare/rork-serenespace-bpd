import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  InterruptPlan,
  InterruptPlanStep,
  EmotionalLoop,
} from '@/types/emotionalLoop';

const STORAGE_KEY = 'emotional_loop_interrupt_plans';

const DEFAULT_STEPS_BY_PATTERN: Record<string, InterruptPlanStep[]> = {
  anxiety_texting: [
    { id: 'ds1', label: 'Wait 2 minutes', description: 'Let the first wave of urgency pass', icon: 'Timer', route: '/exercise?id=c6' },
    { id: 'ds2', label: 'Grounding', description: 'Reconnect with the present moment', icon: 'Anchor', route: '/exercise?id=c1' },
    { id: 'ds3', label: 'Secure rewrite', description: 'Rewrite from a calmer place', icon: 'Sparkles', route: '/(tabs)/messages' },
    { id: 'ds4', label: 'Do not send from urgency', description: 'Protect yourself and the relationship', icon: 'Shield' },
  ],
  shame_withdrawal: [
    { id: 'ds5', label: 'Name the emotion', description: 'Say what you feel without judgment', icon: 'Heart' },
    { id: 'ds6', label: 'Self-compassion', description: 'Speak to yourself as you would a friend', icon: 'BookOpen', route: '/exercise?id=c4' },
    { id: 'ds7', label: 'Short check-in', description: 'A brief moment of self-awareness', icon: 'Anchor', route: '/check-in' },
    { id: 'ds8', label: 'One safe connection', description: 'Reach out gently to someone safe', icon: 'Users' },
  ],
  anger_impulsive: [
    { id: 'ds9', label: 'Breathing', description: 'Slow breaths to lower intensity', icon: 'Wind', route: '/exercise?id=c1' },
    { id: 'ds10', label: 'Delayed send', description: 'Wait before sending anything', icon: 'Timer' },
    { id: 'ds11', label: 'Simulate response', description: 'Try different ways to respond', icon: 'Sparkles', route: '/(tabs)/messages' },
    { id: 'ds12', label: 'STOP skill', description: 'Stop, Take a step back, Observe, Proceed mindfully', icon: 'Shield' },
  ],
  abandonment_panic: [
    { id: 'ds13', label: 'Ground yourself', description: 'Feel your feet on the floor', icon: 'Anchor', route: '/exercise?id=c1' },
    { id: 'ds14', label: 'Check the facts', description: 'Separate what happened from interpretation', icon: 'BookOpen', route: '/exercise?id=c5' },
    { id: 'ds15', label: 'AI reflection', description: 'Talk through what you notice', icon: 'Sparkles', route: '/(tabs)/companion' },
    { id: 'ds16', label: 'Ride the wave', description: 'Let the feeling pass without acting', icon: 'Wind', route: '/exercise?id=c8' },
  ],
  default: [
    { id: 'ds17', label: 'Pause', description: 'Take a moment before reacting', icon: 'Timer' },
    { id: 'ds18', label: 'Grounding', description: 'Anchor yourself in the present', icon: 'Anchor', route: '/exercise?id=c1' },
    { id: 'ds19', label: 'Reflect', description: 'Check in with yourself', icon: 'BookOpen', route: '/check-in' },
    { id: 'ds20', label: 'AI Companion', description: 'Talk through what is happening', icon: 'Sparkles', route: '/(tabs)/companion' },
  ],
};

function detectPatternType(loop: EmotionalLoop): string {
  const labels = loop.nodes.map(n => n.label.toLowerCase());

  if (labels.some(l => l.includes('anxi') || l.includes('afraid')) && labels.some(l => l.includes('text') || l.includes('message') || l.includes('reassurance'))) {
    return 'anxiety_texting';
  }
  if (labels.some(l => l.includes('sham') || l.includes('ashamed')) && labels.some(l => l.includes('withdraw') || l.includes('isolat'))) {
    return 'shame_withdrawal';
  }
  if (labels.some(l => l.includes('ang') || l.includes('hurt')) && labels.some(l => l.includes('lash') || l.includes('impuls') || l.includes('sharp'))) {
    return 'anger_impulsive';
  }
  if (labels.some(l => l.includes('abandon') || l.includes('reject')) && labels.some(l => l.includes('panic') || l.includes('desperat'))) {
    return 'abandonment_panic';
  }

  return 'default';
}

function generateTriggerDescription(loop: EmotionalLoop): string {
  const triggers = loop.nodes.filter(n => n.type === 'trigger');
  if (triggers.length > 0) {
    return `When I notice ${triggers.map(t => t.label.toLowerCase()).join(' or ')}`;
  }
  const first = loop.nodes[0];
  return first ? `When ${first.label.toLowerCase()} appears` : 'When this pattern starts';
}

export function generateDefaultPlan(loop: EmotionalLoop): InterruptPlan {
  const patternType = detectPatternType(loop);
  const steps = DEFAULT_STEPS_BY_PATTERN[patternType] ?? DEFAULT_STEPS_BY_PATTERN['default'];

  return {
    id: `plan_${loop.id}_${Date.now()}`,
    loopId: loop.id,
    loopLabel: loop.narrative || loop.nodes.map(n => n.label).join(' → '),
    triggerDescription: generateTriggerDescription(loop),
    steps,
    isFavorite: false,
    isHelpful: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export async function loadInterruptPlans(): Promise<InterruptPlan[]> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      const plans = JSON.parse(stored) as InterruptPlan[];
      console.log('[LoopInterruptService] Loaded', plans.length, 'interrupt plans');
      return plans;
    }
  } catch (e) {
    console.error('[LoopInterruptService] Failed to load plans:', e);
  }
  return [];
}

export async function saveInterruptPlans(plans: InterruptPlan[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
    console.log('[LoopInterruptService] Saved', plans.length, 'plans');
  } catch (e) {
    console.error('[LoopInterruptService] Failed to save plans:', e);
  }
}

export async function saveInterruptPlan(plan: InterruptPlan): Promise<InterruptPlan[]> {
  const plans = await loadInterruptPlans();
  const existingIdx = plans.findIndex(p => p.id === plan.id);
  if (existingIdx >= 0) {
    plans[existingIdx] = { ...plan, updatedAt: Date.now() };
  } else {
    plans.unshift(plan);
  }
  await saveInterruptPlans(plans);
  return plans;
}

export async function toggleFavorite(planId: string): Promise<InterruptPlan[]> {
  const plans = await loadInterruptPlans();
  const plan = plans.find(p => p.id === planId);
  if (plan) {
    plan.isFavorite = !plan.isFavorite;
    plan.updatedAt = Date.now();
    await saveInterruptPlans(plans);
  }
  return plans;
}

export async function markHelpful(planId: string, helpful: boolean): Promise<InterruptPlan[]> {
  const plans = await loadInterruptPlans();
  const plan = plans.find(p => p.id === planId);
  if (plan) {
    plan.isHelpful = helpful;
    plan.updatedAt = Date.now();
    await saveInterruptPlans(plans);
  }
  return plans;
}

export async function deletePlan(planId: string): Promise<InterruptPlan[]> {
  const plans = await loadInterruptPlans();
  const filtered = plans.filter(p => p.id !== planId);
  await saveInterruptPlans(filtered);
  return filtered;
}
