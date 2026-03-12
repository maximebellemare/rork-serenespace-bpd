import { JournalEntry, MessageDraft } from '@/types';
import { EmotionalMemoryGraph, GraphPatternSummary } from '@/types/memoryGraph';
import { buildEmotionalMemoryGraph } from '@/services/memory/memoryGraphBuilder';
import { interpretGraph } from '@/services/memory/memoryGraphInterpreter';

let cachedGraph: EmotionalMemoryGraph | null = null;
let cachedSummary: GraphPatternSummary | null = null;
let lastBuildHash = '';

function computeHash(entries: JournalEntry[], drafts: MessageDraft[]): string {
  return `${entries.length}-${drafts.length}-${entries[0]?.timestamp ?? 0}-${drafts[0]?.timestamp ?? 0}`;
}

export function getEmotionalMemoryGraph(
  journalEntries: JournalEntry[],
  messageDrafts: MessageDraft[],
): EmotionalMemoryGraph {
  const hash = computeHash(journalEntries, messageDrafts);

  if (cachedGraph && lastBuildHash === hash) {
    return cachedGraph;
  }

  console.log('[EmotionalMemoryGraphService] Building new graph...');
  cachedGraph = buildEmotionalMemoryGraph(journalEntries, messageDrafts);
  lastBuildHash = hash;
  cachedSummary = null;

  return cachedGraph;
}

export function getGraphPatternSummary(
  journalEntries: JournalEntry[],
  messageDrafts: MessageDraft[],
): GraphPatternSummary {
  const graph = getEmotionalMemoryGraph(journalEntries, messageDrafts);

  if (cachedSummary) {
    return cachedSummary;
  }

  console.log('[EmotionalMemoryGraphService] Interpreting graph...');
  cachedSummary = interpretGraph(graph);
  return cachedSummary;
}

export function invalidateGraphCache(): void {
  cachedGraph = null;
  cachedSummary = null;
  lastBuildHash = '';
  console.log('[EmotionalMemoryGraphService] Cache invalidated');
}

export function getGraphStats(
  journalEntries: JournalEntry[],
  messageDrafts: MessageDraft[],
): { nodeCount: number; edgeCount: number; dataPoints: number } {
  const graph = getEmotionalMemoryGraph(journalEntries, messageDrafts);
  return {
    nodeCount: graph.nodes.length,
    edgeCount: graph.edges.length,
    dataPoints: graph.totalDataPoints,
  };
}
