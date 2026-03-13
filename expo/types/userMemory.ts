export type MemoryCategory =
  | 'trigger'
  | 'emotion'
  | 'coping'
  | 'relationship'
  | 'value'
  | 'loop'
  | 'growth'
  | 'preference';

export type MemoryStrength = 'weak' | 'moderate' | 'strong';

export interface UserMemory {
  id: string;
  category: MemoryCategory;
  label: string;
  description: string;
  strength: MemoryStrength;
  occurrences: number;
  firstObserved: number;
  lastObserved: number;
  relatedMemoryIds: string[];
  metadata?: Record<string, string | number | boolean>;
}

export interface MemoryConnection {
  id: string;
  sourceId: string;
  targetId: string;
  sourceCategory: MemoryCategory;
  targetCategory: MemoryCategory;
  label: string;
  strength: number;
  occurrences: number;
  lastObserved: number;
}

export interface MemorySnapshot {
  memories: UserMemory[];
  connections: MemoryConnection[];
  lastUpdated: number;
  version: number;
}

export interface MemoryNarrative {
  id: string;
  category: MemoryCategory;
  text: string;
  relatedMemoryIds: string[];
  generatedAt: number;
}

export interface MemorySummary {
  topTriggers: UserMemory[];
  commonLoops: UserMemory[];
  helpfulTools: UserMemory[];
  growthSignals: UserMemory[];
  personalValues: UserMemory[];
  relationshipPatterns: UserMemory[];
  narratives: MemoryNarrative[];
  totalMemories: number;
  strongMemoryCount: number;
}
