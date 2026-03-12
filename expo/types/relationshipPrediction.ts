export type SpiralRiskLevel = 'calm' | 'watchful' | 'rising' | 'urgent';

export type SpiralPatternType =
  | 'communication_uncertainty'
  | 'abandonment_cascade'
  | 'conflict_shame_withdrawal'
  | 'reassurance_seeking'
  | 'rewrite_surge'
  | 'distress_communication'
  | 'repeated_messaging_urge';

export interface SpiralSignal {
  id: string;
  type: SpiralPatternType;
  label: string;
  description: string;
  strength: number;
  detectedAt: number;
  relatedTriggers: string[];
}

export interface SpiralIntervention {
  id: string;
  type: 'pause' | 'ground' | 'simulate' | 'journal' | 'ai_companion' | 'breathe';
  title: string;
  description: string;
  route: string;
  icon: string;
  priority: number;
}

export interface SpiralChain {
  id: string;
  trigger: string;
  emotion: string;
  urge: string;
  frequencyThisWeek: number;
  whatHelps: string;
}

export interface RelationshipSpiralResult {
  riskLevel: SpiralRiskLevel;
  signals: SpiralSignal[];
  interventions: SpiralIntervention[];
  chains: SpiralChain[];
  message: string | null;
  supportMessage: string | null;
  score: number;
  lastUpdated: number;
}

export interface SpiralHistoryEntry {
  id: string;
  timestamp: number;
  riskLevel: SpiralRiskLevel;
  signals: SpiralSignal[];
  resolvedNaturally: boolean;
}
