import { NotificationCategory } from './notifications';

export type ExperimentId =
  | 'daily_checkin_copy'
  | 'weekly_reflection_copy'
  | 'calm_followup_timing'
  | 'relationship_support_tone'
  | 'premium_reminder_tone'
  | 'ritual_reminder_copy'
  | 'reengagement_copy';

export type VariantId = 'A' | 'B';

export interface ExperimentVariant {
  id: VariantId;
  label: string;
  copy?: {
    title: string;
    body: string;
  };
  timingDelaySeconds?: number;
}

export interface ExperimentDefinition {
  id: ExperimentId;
  label: string;
  category: NotificationCategory;
  description: string;
  variants: [ExperimentVariant, ExperimentVariant];
  safetyExempt: boolean;
}

export interface ExperimentAssignment {
  experimentId: ExperimentId;
  variantId: VariantId;
  assignedAt: number;
}

export interface ExperimentEvent {
  experimentId: ExperimentId;
  variantId: VariantId;
  category: NotificationCategory;
  eventType: 'sent' | 'opened' | 'flow_started' | 'flow_completed' | 'bounced';
  timestamp: number;
  metadata?: Record<string, string | number | boolean>;
}

export interface VariantPerformance {
  variantId: VariantId;
  sentCount: number;
  openedCount: number;
  flowStartedCount: number;
  flowCompletedCount: number;
  bouncedCount: number;
  openRate: number;
  completionRate: number;
}

export interface ExperimentSummary {
  experimentId: ExperimentId;
  label: string;
  category: NotificationCategory;
  totalEvents: number;
  variants: [VariantPerformance, VariantPerformance];
  winningVariant: VariantId | null;
  confidence: 'low' | 'medium' | 'high';
}
