import { FollowUpPrompt } from '@/types/companionModes';
import { EmotionalState } from '@/types/companionMemory';
import { storageService } from '@/services/storage/storageService';

const FOLLOW_UP_KEY = 'bpd_companion_follow_ups';
const FOLLOW_UP_EXPIRY_MS = 6 * 60 * 60 * 1000;
const MAX_ACTIVE_FOLLOW_UPS = 3;

function generateId(): string {
  return `fu_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function loadFollowUps(): Promise<FollowUpPrompt[]> {
  try {
    const stored = await storageService.get<FollowUpPrompt[]>(FOLLOW_UP_KEY);
    if (!stored) return [];
    const now = Date.now();
    return stored.filter(f => !f.dismissed && f.expiresAt > now);
  } catch (error) {
    console.log('[FollowUp] Error loading:', error);
    return [];
  }
}

export async function saveFollowUps(followUps: FollowUpPrompt[]): Promise<void> {
  try {
    await storageService.set(FOLLOW_UP_KEY, followUps.slice(0, 10));
    console.log('[FollowUp] Saved', followUps.length, 'follow-ups');
  } catch (error) {
    console.log('[FollowUp] Error saving:', error);
  }
}

export async function dismissFollowUp(followUpId: string): Promise<void> {
  const existing = await loadFollowUps();
  const updated = existing.map(f =>
    f.id === followUpId ? { ...f, dismissed: true } : f,
  );
  await saveFollowUps(updated);
  console.log('[FollowUp] Dismissed:', followUpId);
}

export async function createFollowUp(
  type: FollowUpPrompt['type'],
  triggerContext: string,
): Promise<FollowUpPrompt | null> {
  const existing = await loadFollowUps();
  const activeCount = existing.filter(f => !f.dismissed).length;

  if (activeCount >= MAX_ACTIVE_FOLLOW_UPS) {
    console.log('[FollowUp] Max active follow-ups reached, skipping');
    return null;
  }

  const hasSimilar = existing.some(
    f => f.type === type && !f.dismissed && Date.now() - f.createdAt < 2 * 60 * 60 * 1000,
  );
  if (hasSimilar) {
    console.log('[FollowUp] Similar follow-up already exists, skipping');
    return null;
  }

  const template = FOLLOW_UP_TEMPLATES[type];
  if (!template) return null;

  const followUp: FollowUpPrompt = {
    id: generateId(),
    type,
    title: template.title,
    message: template.message,
    suggestedPrompt: template.suggestedPrompt,
    triggerContext,
    createdAt: Date.now(),
    expiresAt: Date.now() + FOLLOW_UP_EXPIRY_MS,
    dismissed: false,
  };

  const updated = [followUp, ...existing].slice(0, 10);
  await saveFollowUps(updated);
  console.log('[FollowUp] Created follow-up:', type, 'for context:', triggerContext.substring(0, 40));

  return followUp;
}

const FOLLOW_UP_TEMPLATES: Record<FollowUpPrompt['type'], {
  title: string;
  message: string;
  suggestedPrompt: string;
}> = {
  post_distress: {
    title: 'Checking in',
    message: 'Things felt intense earlier. Want to take a calmer look now?',
    suggestedPrompt: 'I want to reflect on what happened earlier when I was really distressed.',
  },
  post_conflict: {
    title: 'After the storm',
    message: 'Would it help to process what happened before you respond again?',
    suggestedPrompt: 'I had a conflict and I want to understand what happened and what I could do differently.',
  },
  post_pause: {
    title: 'Nice pause',
    message: 'You handled a difficult moment with more pause than usual. Want to reflect on that?',
    suggestedPrompt: 'I managed to pause before reacting. I want to reflect on that.',
  },
  post_reflection: {
    title: 'Your weekly reflection is ready',
    message: 'Want to talk through what came up this week?',
    suggestedPrompt: 'I want to discuss my weekly reflection and what patterns I noticed.',
  },
  post_therapy_report: {
    title: 'Therapy report ready',
    message: 'Your therapy summary is ready. Want to walk through the key insights together?',
    suggestedPrompt: 'Help me understand my therapy report and what stands out.',
  },
  reinforcement: {
    title: 'Growth moment',
    message: 'You have been showing up for yourself consistently. That takes real courage.',
    suggestedPrompt: 'Tell me more about the progress you have noticed in my patterns.',
  },
};

export function shouldCreateFollowUp(
  emotionalState: EmotionalState,
  conversationLength: number,
  hasHighDistress: boolean,
  hasRelationshipConflict: boolean,
  hasCopingSuccess: boolean,
): FollowUpPrompt['type'] | null {
  if (hasHighDistress && conversationLength >= 4) {
    return 'post_distress';
  }

  if (hasRelationshipConflict && conversationLength >= 4) {
    return 'post_conflict';
  }

  if (hasCopingSuccess) {
    return 'post_pause';
  }

  return null;
}

export function getFollowUpForFlow(
  sourceFlow: string,
): FollowUpPrompt['type'] | null {
  switch (sourceFlow) {
    case 'crisis_regulation':
      return 'post_distress';
    case 'relationship_copilot':
    case 'conflict_replay':
      return 'post_conflict';
    case 'message_guard':
      return 'post_pause';
    case 'weekly_reflection':
      return 'post_reflection';
    case 'therapy_report':
      return 'post_therapy_report';
    default:
      return null;
  }
}
