import { JournalEntry, MessageDraft } from '@/types';
import { EmotionalMemoryGraph, GraphPatternSummary } from '@/types/memoryGraph';
import { MemoryProfile } from '@/types/memory';
import { buildEmotionalMemoryGraph } from '@/services/memory/memoryGraphBuilder';
import { interpretGraph } from '@/services/memory/memoryGraphInterpreter';
import { buildMemoryProfile, buildContextSummary } from '@/services/memory/memoryProfileService';
import { storageService } from '@/services/storage/storageService';

const GRAPH_STORAGE_KEY = 'bpd_emotional_memory_graph';
const GRAPH_UPDATED_KEY = 'bpd_emotional_memory_graph_updated';
const MIN_REBUILD_INTERVAL_MS = 5 * 60 * 1000;

export interface MemoryGraphState {
  graph: EmotionalMemoryGraph;
  patterns: GraphPatternSummary;
  profile: MemoryProfile;
  contextSummary: string;
  lastUpdated: number;
}

function createEmptyGraph(): EmotionalMemoryGraph {
  return {
    nodes: [],
    edges: [],
    triggerChains: [],
    emotionClusters: [],
    calmingPatterns: [],
    relationshipChains: [],
    growthSignals: [],
    lastUpdated: 0,
    totalDataPoints: 0,
  };
}

function createEmptyPatterns(): GraphPatternSummary {
  return {
    topTriggerChains: [],
    topEmotionClusters: [],
    mostEffectiveCalming: [],
    relationshipPatterns: [],
    growthSignals: [],
    personalizedNarrative: 'As you use the app more, your emotional patterns will become clearer here.',
  };
}

function createEmptyProfile(): MemoryProfile {
  return {
    topTriggers: [],
    topEmotions: [],
    topUrges: [],
    copingToolsUsed: [],
    relationshipPatterns: [],
    recentImprovements: [],
    recentCheckInCount: 0,
    averageIntensity: 0,
    intensityTrend: 'unknown',
    recentThemes: [],
    lastCheckInDate: null,
    copingSuccessRate: 0,
    mostEffectiveCoping: null,
    weeklyCheckInAvg: 0,
    messageUsage: {
      totalRewrites: 0,
      totalPauses: 0,
      rewriteTypes: {},
      pauseSuccessRate: 0,
      sentAfterRewrite: 0,
      notSentAfterPause: 0,
    },
    supportiveSummary: '',
    relationshipPatternSummary: '',
    distressTrendDescription: '',
  };
}

export function buildFullMemoryState(
  journalEntries: JournalEntry[],
  messageDrafts: MessageDraft[],
  triggerCounts: Record<string, number>,
  emotionCounts: Record<string, number>,
  urgeCounts: Record<string, number>,
): MemoryGraphState {
  console.log('[MemoryGraphService] Building full memory state from', journalEntries.length, 'entries');

  if (journalEntries.length === 0 && messageDrafts.length === 0) {
    console.log('[MemoryGraphService] No data available, returning empty state');
    return {
      graph: createEmptyGraph(),
      patterns: createEmptyPatterns(),
      profile: createEmptyProfile(),
      contextSummary: '',
      lastUpdated: Date.now(),
    };
  }

  const graph = buildEmotionalMemoryGraph(journalEntries, messageDrafts);

  const patterns = interpretGraph(graph);

  graph.triggerChains = patterns.topTriggerChains;
  graph.emotionClusters = patterns.topEmotionClusters;
  graph.calmingPatterns = patterns.mostEffectiveCalming;
  graph.relationshipChains = patterns.relationshipPatterns;
  graph.growthSignals = patterns.growthSignals;

  const profile = buildMemoryProfile(
    journalEntries,
    triggerCounts,
    emotionCounts,
    urgeCounts,
    messageDrafts,
  );

  const contextSummary = buildContextSummary(profile);

  console.log('[MemoryGraphService] Built state:', graph.nodes.length, 'nodes,', graph.edges.length, 'edges,', patterns.topTriggerChains.length, 'trigger chains');

  return {
    graph,
    patterns,
    profile,
    contextSummary,
    lastUpdated: Date.now(),
  };
}

export async function persistGraph(graph: EmotionalMemoryGraph): Promise<void> {
  try {
    await storageService.set(GRAPH_STORAGE_KEY, graph);
    await storageService.set(GRAPH_UPDATED_KEY, Date.now());
    console.log('[MemoryGraphService] Persisted graph with', graph.nodes.length, 'nodes');
  } catch (error) {
    console.log('[MemoryGraphService] Error persisting graph:', error);
  }
}

export async function loadPersistedGraph(): Promise<EmotionalMemoryGraph | null> {
  try {
    const graph = await storageService.get<EmotionalMemoryGraph>(GRAPH_STORAGE_KEY);
    console.log('[MemoryGraphService] Loaded persisted graph:', graph ? `${graph.nodes.length} nodes` : 'null');
    return graph;
  } catch (error) {
    console.log('[MemoryGraphService] Error loading persisted graph:', error);
    return null;
  }
}

export async function shouldRebuildGraph(): Promise<boolean> {
  try {
    const lastUpdated = await storageService.get<number>(GRAPH_UPDATED_KEY);
    if (!lastUpdated) return true;
    return Date.now() - lastUpdated > MIN_REBUILD_INTERVAL_MS;
  } catch {
    return true;
  }
}

export function getTopDistressTriggers(patterns: GraphPatternSummary, limit: number = 3): string[] {
  return patterns.topTriggerChains
    .sort((a, b) => b.averageIntensity - a.averageIntensity)
    .slice(0, limit)
    .map(c => c.trigger.label);
}

export function getMostEffectiveCopingTools(patterns: GraphPatternSummary, limit: number = 3): string[] {
  return patterns.mostEffectiveCalming
    .sort((a, b) => b.effectivenessScore - a.effectivenessScore)
    .slice(0, limit)
    .map(p => p.copingTool);
}

export function getImprovingAreas(patterns: GraphPatternSummary): string[] {
  return patterns.growthSignals
    .filter(s => s.direction === 'improving')
    .map(s => s.area);
}

export function generatePersonalizationContext(state: MemoryGraphState): string {
  const parts: string[] = [];

  if (state.profile.recentCheckInCount > 0) {
    parts.push(`User has ${state.profile.recentCheckInCount} check-ins.`);
  }

  const topDistress = getTopDistressTriggers(state.patterns);
  if (topDistress.length > 0) {
    parts.push(`Highest distress triggers: ${topDistress.join(', ')}.`);
  }

  const effectiveTools = getMostEffectiveCopingTools(state.patterns);
  if (effectiveTools.length > 0) {
    parts.push(`Most effective coping: ${effectiveTools.join(', ')}.`);
  }

  const improving = getImprovingAreas(state.patterns);
  if (improving.length > 0) {
    parts.push(`Improving: ${improving.join(', ')}.`);
  }

  if (state.profile.intensityTrend !== 'unknown') {
    parts.push(`Intensity trend: ${state.profile.intensityTrend}.`);
  }

  if (state.patterns.relationshipPatterns.length > 0) {
    const topRel = state.patterns.relationshipPatterns[0];
    parts.push(`Key relationship pattern: ${topRel.situation} → ${topRel.emotionalResponse}.`);
  }

  if (state.contextSummary) {
    parts.push(state.contextSummary);
  }

  return parts.join(' ');
}
