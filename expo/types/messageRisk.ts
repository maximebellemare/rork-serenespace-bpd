export type RiskLevel = 'low' | 'medium' | 'high' | 'severe';

export type ProtectiveStrategy =
  | 'soften_preserve'
  | 'clarify'
  | 'boundary_rewrite'
  | 'secure_rewrite'
  | 'full_replacement'
  | 'save_not_send'
  | 'pause_first';

export interface SafetyDimension {
  score: number;
  label: string;
  detected: boolean;
}

export interface MessageSafetyClassification {
  riskLevel: RiskLevel;
  preserveWordingAllowed: boolean;
  recommendedStrategy: ProtectiveStrategy;
  explanation: string;
  dimensions: {
    hostility: SafetyDimension;
    contempt: SafetyDimension;
    blame: SafetyDimension;
    desperation: SafetyDimension;
    reassuranceSeeking: SafetyDimension;
    overexplaining: SafetyDimension;
    escalationRisk: SafetyDimension;
    regretRisk: SafetyDimension;
    clarity: SafetyDimension;
    boundaryStrength: SafetyDimension;
  };
  flaggedContent: FlaggedContent[];
  safeRewriteTypes: SafeRewriteType[];
}

export interface FlaggedContent {
  text: string;
  reason: string;
  severity: 'warning' | 'block';
}

export type SafeRewriteType =
  | 'secure'
  | 'calm_boundary'
  | 'short_boundary'
  | 'no_send'
  | 'save_for_later'
  | 'journal_instead';

export interface SafeRewrite {
  type: SafeRewriteType;
  label: string;
  emoji: string;
  color: string;
  text: string;
  whyThisHelps: string;
  isRecommended: boolean;
}

export interface DoNotSendRecommendation {
  active: boolean;
  reason: string;
  likelyConsequence: string;
  options: DoNotSendOption[];
}

export interface DoNotSendOption {
  id: string;
  label: string;
  emoji: string;
  action: 'save_draft' | 'rewrite_boundary' | 'pause' | 'relationship_copilot' | 'journal' | 'grounding';
}

export const SAFE_REWRITE_META: Record<SafeRewriteType, { label: string; emoji: string; color: string }> = {
  secure: { label: 'Secure', emoji: '🌿', color: '#6B9080' },
  calm_boundary: { label: 'Calm boundary', emoji: '🛡️', color: '#5B8FB9' },
  short_boundary: { label: 'Short boundary', emoji: '✋', color: '#4A8B8D' },
  no_send: { label: "Don't send", emoji: '🛑', color: '#C47878' },
  save_for_later: { label: 'Save for later', emoji: '📂', color: '#9B8EC4' },
  journal_instead: { label: 'Journal instead', emoji: '📝', color: '#C4956A' },
};

export const DO_NOT_SEND_OPTIONS: DoNotSendOption[] = [
  { id: 'save', label: 'Save draft', emoji: '📂', action: 'save_draft' },
  { id: 'boundary', label: 'Rewrite as boundary', emoji: '🛡️', action: 'rewrite_boundary' },
  { id: 'pause', label: 'Pause 10 minutes', emoji: '⏸️', action: 'pause' },
  { id: 'journal', label: 'Journal first', emoji: '📝', action: 'journal' },
  { id: 'ground', label: 'Ground yourself', emoji: '🧘', action: 'grounding' },
];
