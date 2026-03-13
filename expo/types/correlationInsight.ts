export type CorrelationCategory =
  | 'medication_mood'
  | 'appointment_intensity'
  | 'checkin_routine'
  | 'coping_distress'
  | 'pause_regret'
  | 'movement_mood'
  | 'relationship_outcome'
  | 'time_pattern'
  | 'routine_stability';

export type CorrelationStrength = 'weak' | 'moderate' | 'strong';
export type CorrelationDirection = 'positive' | 'negative' | 'neutral';

export interface CorrelationInsight {
  id: string;
  category: CorrelationCategory;
  title: string;
  narrative: string;
  supportiveNote: string;
  strength: CorrelationStrength;
  direction: CorrelationDirection;
  confidence: number;
  dataPoints: number;
  sourceA: string;
  sourceB: string;
  generatedAt: number;
  viewed: boolean;
}

export interface CorrelationSummary {
  totalCorrelations: number;
  strongCorrelations: number;
  topHelpful: CorrelationInsight | null;
  topConcern: CorrelationInsight | null;
  lastGeneratedAt: number;
}

export interface WhatHelpsItem {
  id: string;
  label: string;
  description: string;
  strength: CorrelationStrength;
  emoji: string;
  category: CorrelationCategory;
}
