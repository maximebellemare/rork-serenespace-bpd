export interface PlaybookStrategy {
  id: string;
  category: 'coping' | 'relationship' | 'calming' | 'identity';
  title: string;
  narrative: string;
  effectivenessScore: number;
  timesUsed: number;
  avgDistressReduction: number;
  relatedTriggers: string[];
  lastUsed: number;
  icon: string;
}

export interface PlaybookSection {
  title: string;
  subtitle: string;
  strategies: PlaybookStrategy[];
}

export interface PlaybookReport {
  copingStrategies: PlaybookStrategy[];
  relationshipStrategies: PlaybookStrategy[];
  calmingRoutines: PlaybookStrategy[];
  identityReminders: PlaybookStrategy[];
  topStrategy: PlaybookStrategy | null;
  totalStrategiesTracked: number;
  hasEnoughData: boolean;
  personalNarrative: string;
}

export interface PlaybookQuickAccess {
  topStrategies: PlaybookStrategy[];
  currentDistressLevel: number;
  suggestedNow: PlaybookStrategy | null;
}
