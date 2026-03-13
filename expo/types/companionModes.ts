export type CompanionMode =
  | 'calm'
  | 'reflection'
  | 'clarity'
  | 'relationship'
  | 'action'
  | 'high_distress'
  | 'post_conflict_repair'
  | 'insight_review'
  | 'coaching';

export interface CompanionModeChip {
  id: CompanionMode;
  label: string;
  icon: string;
  shortLabel: string;
}

export const COMPANION_MODE_CHIPS: CompanionModeChip[] = [
  { id: 'calm', label: 'Calm me', icon: '🌊', shortLabel: 'Calm' },
  { id: 'reflection', label: 'Help me understand this', icon: '🔍', shortLabel: 'Reflect' },
  { id: 'relationship', label: 'Help me respond well', icon: '💬', shortLabel: 'Relationship' },
  { id: 'action', label: 'Give me a next step', icon: '⚡', shortLabel: 'Action' },
  { id: 'coaching', label: 'Guide me through a skill', icon: '🧭', shortLabel: 'Coaching' },
  { id: 'insight_review', label: 'Show patterns', icon: '📊', shortLabel: 'Patterns' },
  { id: 'post_conflict_repair', label: 'Help me repair', icon: '🩹', shortLabel: 'Repair' },
];

export interface FollowUpPrompt {
  id: string;
  type: 'post_distress' | 'post_conflict' | 'post_pause' | 'post_reflection' | 'post_therapy_report' | 'reinforcement';
  title: string;
  message: string;
  suggestedPrompt: string;
  triggerContext: string;
  createdAt: number;
  expiresAt: number;
  dismissed: boolean;
}

export interface OutcomeRecord {
  id: string;
  timestamp: number;
  sourceFlow: string;
  toolSuggested: string;
  distressBefore?: number;
  distressAfter?: number;
  didPause?: boolean;
  didSendMessage?: boolean;
  didCompleteExercise?: boolean;
  markedHelpful?: boolean;
  emotionalContext: string;
  tags: string[];
}

export interface CompanionPremiumGate {
  feature: string;
  title: string;
  description: string;
  freeLimit?: number;
  currentUsage?: number;
}
