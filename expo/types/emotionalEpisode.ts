export type EpisodeNodeType =
  | 'trigger'
  | 'emotion'
  | 'urge'
  | 'behavior'
  | 'outcome'
  | 'coping';

export interface EpisodeNode {
  id: string;
  type: EpisodeNodeType;
  label: string;
  timestamp: number;
  intensity?: number;
  color: string;
}

export interface EmotionalEpisode {
  id: string;
  startTime: number;
  endTime: number;
  nodes: EpisodeNode[];
  peakIntensity: number;
  averageIntensity: number;
  dominantEmotion: string;
  triggers: string[];
  emotions: string[];
  urges: string[];
  copingUsed: string[];
  outcome: EpisodeOutcome;
  reflection: string;
  interruptSuggestion: string;
  isRelationshipRelated: boolean;
}

export type EpisodeOutcome =
  | 'managed'
  | 'escalated'
  | 'neutral'
  | 'deescalated';

export interface EpisodeReplayState {
  episodes: EmotionalEpisode[];
  selectedEpisode: EmotionalEpisode | null;
  recentEpisodeCount: number;
  highIntensityCount: number;
  managedCount: number;
  topPattern: string | null;
}
