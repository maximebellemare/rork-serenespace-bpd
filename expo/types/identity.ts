export interface PersonalValue {
  id: string;
  label: string;
  category: ValueCategory;
  description: string;
  emoji: string;
}

export type ValueCategory =
  | 'connection'
  | 'integrity'
  | 'self'
  | 'growth'
  | 'peace';

export interface UserValueSelection {
  valueId: string;
  rank: number;
  reflection: string;
  selectedAt: number;
}

export interface UserValuesState {
  selectedValues: UserValueSelection[];
  updatedAt: number;
}

export interface SelfTrustPrompt {
  id: string;
  text: string;
  category: 'grounding' | 'clarity' | 'self-respect' | 'future-self' | 'needs';
}

export interface SelfTrustResponse {
  id: string;
  promptId: string;
  promptText: string;
  response: string;
  isFavorite: boolean;
  createdAt: number;
}

export interface IdentityJournalEntry {
  id: string;
  promptId: string;
  promptText: string;
  content: string;
  tags: string[];
  isFavorite: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface IdentityJournalPrompt {
  id: string;
  text: string;
  category: 'calm-self' | 'conflict-self' | 'relationship-self' | 'core-self' | 'boundaries';
}

export interface AnchorStatement {
  id: string;
  text: string;
  isPinned: boolean;
  isFavorite: boolean;
  createdAt: number;
}

export interface ConflictAlignmentSession {
  id: string;
  feeling: string;
  fear: string;
  need: string;
  valuesResponse: string;
  protectsBoth: string;
  createdAt: number;
}

export interface IdentityState {
  values: UserValuesState;
  selfTrustResponses: SelfTrustResponse[];
  journalEntries: IdentityJournalEntry[];
  anchorStatements: AnchorStatement[];
  conflictSessions: ConflictAlignmentSession[];
}

export interface GrowthSignal {
  id: string;
  type: 'value_alignment' | 'regulation_win' | 'boundary_set' | 'self_awareness' | 'relationship_skill' | 'emotional_growth';
  label: string;
  description: string;
  detectedAt: number;
  relatedValueId?: string;
}

export interface PersonalStrength {
  id: string;
  label: string;
  description: string;
  evidence: string[];
  discoveredAt: number;
}

export interface DailyIdentityPrompt {
  id: string;
  text: string;
  category: 'values' | 'conflict' | 'relationships' | 'self-image' | 'future-self';
}

export interface DailyIdentityResponse {
  id: string;
  promptId: string;
  promptText: string;
  response: string;
  date: string;
  createdAt: number;
}

export interface GrowthSnapshot {
  totalJournalEntries: number;
  totalSelfTrustResponses: number;
  totalAnchorStatements: number;
  totalConflictSessions: number;
  totalGrowthSignals: number;
  selectedValuesCount: number;
  identityStreakDays: number;
  topValues: Array<{ label: string; emoji: string }>;
  recentGrowthSignals: GrowthSignal[];
  personalStrengths: PersonalStrength[];
}

export interface GrowthState {
  growthSignals: GrowthSignal[];
  personalStrengths: PersonalStrength[];
  dailyResponses: DailyIdentityResponse[];
}

export const DEFAULT_GROWTH_STATE: GrowthState = {
  growthSignals: [],
  personalStrengths: [],
  dailyResponses: [],
};

export interface IdentityState {
  values: UserValuesState;
  selfTrustResponses: SelfTrustResponse[];
  journalEntries: IdentityJournalEntry[];
  anchorStatements: AnchorStatement[];
  conflictSessions: ConflictAlignmentSession[];
}

export const DEFAULT_IDENTITY_STATE: IdentityState = {
  values: { selectedValues: [], updatedAt: 0 },
  selfTrustResponses: [],
  journalEntries: [],
  anchorStatements: [],
  conflictSessions: [],
};
