import { JournalEntry, MessageDraft } from '@/types';
import {
  GraphNode,
  GraphEdge,
  NodeType,
  EmotionalMemoryGraph,
} from '@/types/memoryGraph';

function makeNodeId(type: NodeType, label: string): string {
  return `${type}::${label.toLowerCase().replace(/\s+/g, '_')}`;
}

function makeEdgeId(sourceId: string, targetId: string): string {
  return `edge::${sourceId}->>${targetId}`;
}

function upsertNode(
  nodesMap: Map<string, GraphNode>,
  type: NodeType,
  label: string,
  timestamp: number,
  metadata?: Record<string, string | number | boolean>,
): GraphNode {
  const id = makeNodeId(type, label);
  const existing = nodesMap.get(id);

  if (existing) {
    existing.weight += 1;
    existing.lastSeen = Math.max(existing.lastSeen, timestamp);
    if (metadata) {
      existing.metadata = { ...existing.metadata, ...metadata };
    }
    return existing;
  }

  const node: GraphNode = {
    id,
    type,
    label,
    weight: 1,
    firstSeen: timestamp,
    lastSeen: timestamp,
    metadata,
  };
  nodesMap.set(id, node);
  return node;
}

function upsertEdge(
  edgesMap: Map<string, GraphEdge>,
  source: GraphNode,
  target: GraphNode,
  timestamp: number,
  context?: string,
): GraphEdge {
  const id = makeEdgeId(source.id, target.id);
  const existing = edgesMap.get(id);

  if (existing) {
    existing.occurrences += 1;
    existing.strength = Math.min(1, existing.occurrences / 10);
    existing.lastObserved = Math.max(existing.lastObserved, timestamp);
    return existing;
  }

  const edge: GraphEdge = {
    id,
    sourceId: source.id,
    targetId: target.id,
    sourceType: source.type,
    targetType: target.type,
    strength: 0.1,
    occurrences: 1,
    lastObserved: timestamp,
    context,
  };
  edgesMap.set(id, edge);
  return edge;
}

function processJournalEntries(
  entries: JournalEntry[],
  nodesMap: Map<string, GraphNode>,
  edgesMap: Map<string, GraphEdge>,
): void {
  entries.forEach((entry) => {
    const ts = entry.timestamp;
    const intensity = entry.checkIn.intensityLevel;

    const triggerNodes = entry.checkIn.triggers.map((t) =>
      upsertNode(nodesMap, 'trigger', t.label, ts, {
        category: t.category,
        avgIntensity: intensity,
      }),
    );

    const emotionNodes = entry.checkIn.emotions.map((e) =>
      upsertNode(nodesMap, 'emotion', e.label, ts, {
        intensity: e.intensity ?? intensity,
      }),
    );

    const urgeNodes = entry.checkIn.urges.map((u) =>
      upsertNode(nodesMap, 'urge', u.label, ts, { risk: u.risk }),
    );

    const copingNodes = (entry.checkIn.copingUsed ?? []).map((c) =>
      upsertNode(nodesMap, 'coping', c, ts, {
        outcome: entry.outcome ?? 'neutral',
      }),
    );

    const isRelationshipTrigger = entry.checkIn.triggers.some(
      (t) => t.category === 'relationship',
    );

    if (isRelationshipTrigger) {
      const relLabel = entry.checkIn.triggers
        .filter((t) => t.category === 'relationship')
        .map((t) => t.label)
        .join(', ');
      upsertNode(nodesMap, 'relationship_pattern', relLabel, ts, {
        intensity,
      });
    }

    triggerNodes.forEach((triggerNode) => {
      emotionNodes.forEach((emotionNode) => {
        upsertEdge(edgesMap, triggerNode, emotionNode, ts, 'trigger->emotion');
      });
      urgeNodes.forEach((urgeNode) => {
        upsertEdge(edgesMap, triggerNode, urgeNode, ts, 'trigger->urge');
      });
    });

    emotionNodes.forEach((emotionNode) => {
      urgeNodes.forEach((urgeNode) => {
        upsertEdge(edgesMap, emotionNode, urgeNode, ts, 'emotion->urge');
      });
      copingNodes.forEach((copingNode) => {
        upsertEdge(edgesMap, emotionNode, copingNode, ts, 'emotion->coping');
      });
    });

    triggerNodes.forEach((triggerNode) => {
      copingNodes.forEach((copingNode) => {
        upsertEdge(edgesMap, triggerNode, copingNode, ts, 'trigger->coping');
      });
    });

    for (let i = 0; i < emotionNodes.length; i++) {
      for (let j = i + 1; j < emotionNodes.length; j++) {
        upsertEdge(
          edgesMap,
          emotionNodes[i],
          emotionNodes[j],
          ts,
          'emotion<->emotion',
        );
      }
    }
  });
}

function processMessageDrafts(
  drafts: MessageDraft[],
  nodesMap: Map<string, GraphNode>,
  _edgesMap: Map<string, GraphEdge>,
): void {
  const rewriteCount = drafts.filter((m) => m.rewrittenText).length;
  const pauseCount = drafts.filter((m) => m.paused).length;

  if (rewriteCount > 0) {
    upsertNode(nodesMap, 'communication_pattern', 'Message Rewriting', Date.now(), {
      totalRewrites: rewriteCount,
    });
  }

  if (pauseCount > 0) {
    upsertNode(nodesMap, 'communication_pattern', 'Pause Before Sending', Date.now(), {
      totalPauses: pauseCount,
    });
  }

  drafts.forEach((draft) => {
    if (draft.paused && draft.outcome === 'helped') {
      const pauseNode = nodesMap.get(
        makeNodeId('communication_pattern', 'Pause Before Sending'),
      );
      if (pauseNode) {
        upsertNode(nodesMap, 'progress', 'Pause Effectiveness', draft.timestamp, {
          helped: true,
        });
      }
    }
  });
}

function detectProgressNodes(
  entries: JournalEntry[],
  nodesMap: Map<string, GraphNode>,
): void {
  if (entries.length < 5) return;

  const recent = entries.slice(0, Math.min(10, entries.length));
  const older = entries.slice(
    Math.min(10, entries.length),
    Math.min(20, entries.length),
  );

  if (older.length < 3) return;

  const recentAvg =
    recent.reduce((s, e) => s + e.checkIn.intensityLevel, 0) / recent.length;
  const olderAvg =
    older.reduce((s, e) => s + e.checkIn.intensityLevel, 0) / older.length;

  if (olderAvg - recentAvg > 0.5) {
    upsertNode(nodesMap, 'progress', 'Intensity Decreasing', Date.now(), {
      change: olderAvg - recentAvg,
    });
  }

  const recentManaged = recent.filter((e) => e.outcome === 'managed').length;
  const olderManaged = older.filter((e) => e.outcome === 'managed').length;
  const recentRate = recent.length > 0 ? recentManaged / recent.length : 0;
  const olderRate = older.length > 0 ? olderManaged / older.length : 0;

  if (recentRate > olderRate + 0.1) {
    upsertNode(nodesMap, 'progress', 'Better Coping Outcomes', Date.now(), {
      recentRate: Math.round(recentRate * 100),
      olderRate: Math.round(olderRate * 100),
    });
  }

  const recentCoping = new Set<string>();
  recent.forEach((e) =>
    e.checkIn.copingUsed?.forEach((c) => recentCoping.add(c)),
  );
  const olderCoping = new Set<string>();
  older.forEach((e) =>
    e.checkIn.copingUsed?.forEach((c) => olderCoping.add(c)),
  );

  if (recentCoping.size > olderCoping.size) {
    upsertNode(nodesMap, 'progress', 'Expanding Toolkit', Date.now(), {
      recentCount: recentCoping.size,
      olderCount: olderCoping.size,
    });
  }
}

export function buildEmotionalMemoryGraph(
  journalEntries: JournalEntry[],
  messageDrafts: MessageDraft[],
): EmotionalMemoryGraph {
  console.log('[MemoryGraphBuilder] Building graph from', journalEntries.length, 'entries and', messageDrafts.length, 'drafts');

  const nodesMap = new Map<string, GraphNode>();
  const edgesMap = new Map<string, GraphEdge>();

  processJournalEntries(journalEntries, nodesMap, edgesMap);
  processMessageDrafts(messageDrafts, nodesMap, edgesMap);
  detectProgressNodes(journalEntries, nodesMap);

  const nodes = Array.from(nodesMap.values());
  const edges = Array.from(edgesMap.values());

  console.log('[MemoryGraphBuilder] Built graph with', nodes.length, 'nodes and', edges.length, 'edges');

  return {
    nodes,
    edges,
    triggerChains: [],
    emotionClusters: [],
    calmingPatterns: [],
    relationshipChains: [],
    growthSignals: [],
    lastUpdated: Date.now(),
    totalDataPoints: journalEntries.length + messageDrafts.length,
  };
}
