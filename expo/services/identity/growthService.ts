import { storageService } from '@/services/storage/storageService';
import {
  GrowthSignal,
  PersonalStrength,
  DailyIdentityResponse,
  DailyIdentityPrompt,
  GrowthState,
  GrowthSnapshot,
  DEFAULT_GROWTH_STATE,
} from '@/types/identity';
import { CORE_VALUES, getValuesState } from '@/services/identity/valuesService';
import { getSelfTrustResponses } from '@/services/identity/valuesService';
import { getAnchorStatements, getConflictSessions } from '@/services/identity/selfTrustService';
import { getIdentityJournalEntries } from '@/services/identity/identityJournalService';

const GROWTH_KEY = 'steady_growth_state';

export const DAILY_IDENTITY_PROMPTS: DailyIdentityPrompt[] = [
  { id: 'dip_1', text: 'What matters most to you today?', category: 'values' },
  { id: 'dip_2', text: 'What kind of person do you want to be in conflict?', category: 'conflict' },
  { id: 'dip_3', text: 'What values guide your relationships?', category: 'relationships' },
  { id: 'dip_4', text: 'What do you want to protect about yourself today?', category: 'self-image' },
  { id: 'dip_5', text: 'If you could trust yourself fully, what would change?', category: 'future-self' },
  { id: 'dip_6', text: 'What boundary would make today easier?', category: 'relationships' },
  { id: 'dip_7', text: 'What does calm confidence look like for you?', category: 'self-image' },
  { id: 'dip_8', text: 'What would your wisest self say right now?', category: 'future-self' },
  { id: 'dip_9', text: 'What part of yourself are you learning to accept?', category: 'self-image' },
  { id: 'dip_10', text: 'What would honoring your needs look like today?', category: 'values' },
  { id: 'dip_11', text: 'How do you want to respond when fear shows up?', category: 'conflict' },
  { id: 'dip_12', text: 'What kind of partner or friend do you want to become?', category: 'relationships' },
  { id: 'dip_13', text: 'What is one thing you have gotten better at?', category: 'future-self' },
  { id: 'dip_14', text: 'What does self-respect mean to you in this season?', category: 'values' },
  { id: 'dip_15', text: 'What would you tell your younger self about handling hard emotions?', category: 'conflict' },
  { id: 'dip_16', text: 'What quality in yourself do you want to nurture?', category: 'self-image' },
  { id: 'dip_17', text: 'What does being present actually feel like for you?', category: 'future-self' },
  { id: 'dip_18', text: 'How do you want to show up for the people you care about?', category: 'relationships' },
  { id: 'dip_19', text: 'What does it mean to be enough, exactly as you are?', category: 'self-image' },
  { id: 'dip_20', text: 'What small choice today could reflect your deepest values?', category: 'values' },
  { id: 'dip_21', text: 'What are you ready to let go of?', category: 'future-self' },
];

function getDateKey(timestamp?: number): string {
  const d = timestamp ? new Date(timestamp) : new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getTodaysPrompt(): DailyIdentityPrompt {
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
  );
  const index = dayOfYear % DAILY_IDENTITY_PROMPTS.length;
  console.log('[GrowthService] Today\'s prompt index:', index);
  return DAILY_IDENTITY_PROMPTS[index];
}

export async function getGrowthState(): Promise<GrowthState> {
  const data = await storageService.get<GrowthState>(GROWTH_KEY);
  console.log('[GrowthService] Loaded growth state');
  return data ?? DEFAULT_GROWTH_STATE;
}

export async function saveGrowthState(state: GrowthState): Promise<void> {
  await storageService.set(GROWTH_KEY, state);
  console.log('[GrowthService] Saved growth state');
}

export async function saveDailyResponse(
  promptId: string,
  promptText: string,
  response: string,
): Promise<GrowthState> {
  const state = await getGrowthState();
  const newResponse: DailyIdentityResponse = {
    id: `dr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    promptId,
    promptText,
    response,
    date: getDateKey(),
    createdAt: Date.now(),
  };
  const updated: GrowthState = {
    ...state,
    dailyResponses: [newResponse, ...state.dailyResponses],
  };
  await saveGrowthState(updated);
  console.log('[GrowthService] Saved daily response for prompt:', promptId);
  return updated;
}

export async function addGrowthSignal(
  signal: Omit<GrowthSignal, 'id' | 'detectedAt'>,
): Promise<GrowthState> {
  const state = await getGrowthState();
  const newSignal: GrowthSignal = {
    ...signal,
    id: `gs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    detectedAt: Date.now(),
  };
  const updated: GrowthState = {
    ...state,
    growthSignals: [newSignal, ...state.growthSignals],
  };
  await saveGrowthState(updated);
  console.log('[GrowthService] Added growth signal:', signal.label);
  return updated;
}

export async function addPersonalStrength(
  strength: Omit<PersonalStrength, 'id' | 'discoveredAt'>,
): Promise<GrowthState> {
  const state = await getGrowthState();
  const newStrength: PersonalStrength = {
    ...strength,
    id: `ps_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    discoveredAt: Date.now(),
  };
  const updated: GrowthState = {
    ...state,
    personalStrengths: [newStrength, ...state.personalStrengths],
  };
  await saveGrowthState(updated);
  console.log('[GrowthService] Added personal strength:', strength.label);
  return updated;
}

export async function removeGrowthSignal(id: string): Promise<GrowthState> {
  const state = await getGrowthState();
  const updated: GrowthState = {
    ...state,
    growthSignals: state.growthSignals.filter(s => s.id !== id),
  };
  await saveGrowthState(updated);
  console.log('[GrowthService] Removed growth signal:', id);
  return updated;
}

export async function removePersonalStrength(id: string): Promise<GrowthState> {
  const state = await getGrowthState();
  const updated: GrowthState = {
    ...state,
    personalStrengths: state.personalStrengths.filter(s => s.id !== id),
  };
  await saveGrowthState(updated);
  console.log('[GrowthService] Removed personal strength:', id);
  return updated;
}

function computeIdentityStreak(dailyResponses: DailyIdentityResponse[]): number {
  if (dailyResponses.length === 0) return 0;
  const uniqueDays = [...new Set(dailyResponses.map(r => r.date))].sort().reverse();
  const today = getDateKey();
  const yesterday = getDateKey(Date.now() - 24 * 60 * 60 * 1000);

  if (uniqueDays[0] !== today && uniqueDays[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < uniqueDays.length; i++) {
    const prevDate = new Date(uniqueDays[i - 1]);
    const currDate = new Date(uniqueDays[i]);
    const diffDays = Math.round((prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export async function computeGrowthSnapshot(): Promise<GrowthSnapshot> {
  const [growthState, valuesState, selfTrustResponses, anchors, conflictSessions, journalEntries] = await Promise.all([
    getGrowthState(),
    getValuesState(),
    getSelfTrustResponses(),
    getAnchorStatements(),
    getConflictSessions(),
    getIdentityJournalEntries(),
  ]);

  const topValues = valuesState.selectedValues
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 5)
    .map(sv => {
      const value = CORE_VALUES.find(v => v.id === sv.valueId);
      return { label: value?.label ?? 'Unknown', emoji: value?.emoji ?? '' };
    });

  const recentSignals = growthState.growthSignals
    .sort((a, b) => b.detectedAt - a.detectedAt)
    .slice(0, 10);

  console.log('[GrowthService] Computed growth snapshot');

  return {
    totalJournalEntries: journalEntries.length,
    totalSelfTrustResponses: selfTrustResponses.length,
    totalAnchorStatements: anchors.length,
    totalConflictSessions: conflictSessions.length,
    totalGrowthSignals: growthState.growthSignals.length,
    selectedValuesCount: valuesState.selectedValues.length,
    identityStreakDays: computeIdentityStreak(growthState.dailyResponses),
    topValues,
    recentGrowthSignals: recentSignals,
    personalStrengths: growthState.personalStrengths,
  };
}

export function hasTodaysPromptBeenAnswered(dailyResponses: DailyIdentityResponse[]): boolean {
  const today = getDateKey();
  return dailyResponses.some(r => r.date === today);
}
