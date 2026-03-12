export type NodeType =
  | 'trigger'
  | 'emotion'
  | 'urge'
  | 'coping'
  | 'relationship_pattern'
  | 'communication_pattern'
  | 'progress';

export interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  weight: number;
  firstSeen: number;
  lastSeen: number;
  metadata?: Record<string, string | number | boolean>;
}

export interface GraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  sourceType: NodeType;
  targetType: NodeType;
  strength: number;
  occurrences: number;
  lastObserved: number;
  context?: string;
}

export interface TriggerChain {
  id: string;
  trigger: GraphNode;
  emotions: GraphNode[];
  urges: GraphNode[];
  copingTools: GraphNode[];
  averageIntensity: number;
  occurrences: number;
  narrative: string;
}

export interface EmotionCluster {
  id: string;
  emotions: GraphNode[];
  coOccurrenceRate: number;
  commonTriggers: string[];
  narrative: string;
}

export interface CalmingPattern {
  id: string;
  trigger: string;
  emotion: string;
  copingTool: string;
  effectivenessScore: number;
  timesUsed: number;
  narrative: string;
}

export interface RelationshipChain {
  id: string;
  situation: string;
  emotionalResponse: string;
  behavioralUrge: string;
  communicationStyle: string;
  occurrences: number;
  narrative: string;
}

export interface GrowthSignal {
  id: string;
  area: string;
  description: string;
  direction: 'improving' | 'stable' | 'needs_attention';
  metric: string;
  changeValue: number;
  narrative: string;
}

export interface EmotionalMemoryGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  triggerChains: TriggerChain[];
  emotionClusters: EmotionCluster[];
  calmingPatterns: CalmingPattern[];
  relationshipChains: RelationshipChain[];
  growthSignals: GrowthSignal[];
  lastUpdated: number;
  totalDataPoints: number;
}

export interface GraphPatternSummary {
  topTriggerChains: TriggerChain[];
  topEmotionClusters: EmotionCluster[];
  mostEffectiveCalming: CalmingPattern[];
  relationshipPatterns: RelationshipChain[];
  growthSignals: GrowthSignal[];
  personalizedNarrative: string;
}
