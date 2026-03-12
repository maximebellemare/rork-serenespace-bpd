import {
  EmotionalMemoryGraph,
  GraphNode,
  GraphEdge,
  TriggerChain,
  EmotionCluster,
  CalmingPattern,
  RelationshipChain,
  GrowthSignal,
  GraphPatternSummary,
} from '@/types/memoryGraph';

function getNodesByType(graph: EmotionalMemoryGraph, type: string): GraphNode[] {
  return graph.nodes
    .filter((n) => n.type === type)
    .sort((a, b) => b.weight - a.weight);
}

function getEdgesFrom(graph: EmotionalMemoryGraph, sourceId: string): GraphEdge[] {
  return graph.edges.filter((e) => e.sourceId === sourceId);
}

function getNodeById(graph: EmotionalMemoryGraph, id: string): GraphNode | undefined {
  return graph.nodes.find((n) => n.id === id);
}

function buildTriggerChains(graph: EmotionalMemoryGraph): TriggerChain[] {
  const triggerNodes = getNodesByType(graph, 'trigger').slice(0, 8);
  const chains: TriggerChain[] = [];

  triggerNodes.forEach((trigger) => {
    const outEdges = getEdgesFrom(graph, trigger.id);
    const emotions: GraphNode[] = [];
    const urges: GraphNode[] = [];
    const copingTools: GraphNode[] = [];

    outEdges.forEach((edge) => {
      const target = getNodeById(graph, edge.targetId);
      if (!target) return;
      if (target.type === 'emotion') emotions.push(target);
      if (target.type === 'urge') urges.push(target);
      if (target.type === 'coping') copingTools.push(target);
    });

    if (emotions.length === 0 && urges.length === 0) return;

    const avgIntensity = trigger.metadata?.avgIntensity
      ? Number(trigger.metadata.avgIntensity)
      : 0;

    const emotionLabels = emotions
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 3)
      .map((e) => e.label.toLowerCase());
    const urgeLabels = urges
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 2)
      .map((u) => u.label.toLowerCase());
    const copingLabels = copingTools
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 2)
      .map((c) => c.label.toLowerCase());

    let narrative = `When "${trigger.label}" occurs`;
    if (emotionLabels.length > 0) {
      narrative += `, ${emotionLabels.join(' and ')} often follow`;
    }
    if (urgeLabels.length > 0) {
      narrative += `, along with urges to ${urgeLabels.join(' or ')}`;
    }
    narrative += '.';
    if (copingLabels.length > 0) {
      narrative += ` ${copingLabels.join(' and ')} may help in these moments.`;
    }

    chains.push({
      id: `tc-${trigger.id}`,
      trigger,
      emotions: emotions.sort((a, b) => b.weight - a.weight).slice(0, 4),
      urges: urges.sort((a, b) => b.weight - a.weight).slice(0, 3),
      copingTools: copingTools.sort((a, b) => b.weight - a.weight).slice(0, 3),
      averageIntensity: avgIntensity,
      occurrences: trigger.weight,
      narrative,
    });
  });

  return chains.sort((a, b) => b.occurrences - a.occurrences);
}

function buildEmotionClusters(graph: EmotionalMemoryGraph): EmotionCluster[] {
  const emotionNodes = getNodesByType(graph, 'emotion');
  const clusters: EmotionCluster[] = [];
  const processed = new Set<string>();

  const coOccurrenceEdges = graph.edges.filter(
    (e) => e.context === 'emotion<->emotion',
  );

  emotionNodes.forEach((emotion) => {
    if (processed.has(emotion.id)) return;

    const related = coOccurrenceEdges
      .filter((e) => e.sourceId === emotion.id || e.targetId === emotion.id)
      .filter((e) => e.occurrences >= 2);

    if (related.length === 0) return;

    const clusterNodes: GraphNode[] = [emotion];
    related.forEach((edge) => {
      const partnerId =
        edge.sourceId === emotion.id ? edge.targetId : edge.sourceId;
      const partner = getNodeById(graph, partnerId);
      if (partner && !processed.has(partner.id)) {
        clusterNodes.push(partner);
        processed.add(partner.id);
      }
    });
    processed.add(emotion.id);

    if (clusterNodes.length < 2) return;

    const totalOccurrences = related.reduce((s, e) => s + e.occurrences, 0);
    const avgRate = totalOccurrences / related.length;

    const triggerEdges = graph.edges.filter(
      (e) =>
        e.context === 'trigger->emotion' &&
        clusterNodes.some((n) => n.id === e.targetId),
    );
    const commonTriggers = [
      ...new Set(
        triggerEdges
          .map((e) => getNodeById(graph, e.sourceId)?.label)
          .filter(Boolean) as string[],
      ),
    ].slice(0, 3);

    const labels = clusterNodes.map((n) => n.label.toLowerCase());
    const narrative =
      labels.length === 2
        ? `${labels[0]} and ${labels[1]} often appear together.`
        : `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]} tend to occur together.`;

    clusters.push({
      id: `ec-${emotion.id}`,
      emotions: clusterNodes,
      coOccurrenceRate: Math.round(avgRate),
      commonTriggers,
      narrative,
    });
  });

  return clusters.sort((a, b) => b.coOccurrenceRate - a.coOccurrenceRate);
}

function buildCalmingPatterns(graph: EmotionalMemoryGraph): CalmingPattern[] {
  const patterns: CalmingPattern[] = [];
  const copingEdges = graph.edges.filter(
    (e) =>
      e.targetType === 'coping' &&
      (e.sourceType === 'emotion' || e.sourceType === 'trigger'),
  );

  const groupedByCoping = new Map<
    string,
    { trigger: string; emotion: string; occurrences: number }[]
  >();

  copingEdges.forEach((edge) => {
    const copingNode = getNodeById(graph, edge.targetId);
    const sourceNode = getNodeById(graph, edge.sourceId);
    if (!copingNode || !sourceNode) return;

    const key = copingNode.label;
    if (!groupedByCoping.has(key)) {
      groupedByCoping.set(key, []);
    }
    groupedByCoping.get(key)!.push({
      trigger: sourceNode.type === 'trigger' ? sourceNode.label : '',
      emotion: sourceNode.type === 'emotion' ? sourceNode.label : '',
      occurrences: edge.occurrences,
    });
  });

  groupedByCoping.forEach((connections, copingLabel) => {
    const totalOccurrences = connections.reduce(
      (s, c) => s + c.occurrences,
      0,
    );
    const triggers = connections
      .filter((c) => c.trigger)
      .sort((a, b) => b.occurrences - a.occurrences);
    const emotions = connections
      .filter((c) => c.emotion)
      .sort((a, b) => b.occurrences - a.occurrences);

    const topTrigger = triggers[0]?.trigger ?? 'various situations';
    const topEmotion = emotions[0]?.emotion ?? 'distress';

    const effectiveness = Math.min(100, totalOccurrences * 15);

    const narrative = `${copingLabel} seems most helpful when feeling ${topEmotion.toLowerCase()}, especially after ${topTrigger.toLowerCase()}.`;

    patterns.push({
      id: `cp-${copingLabel.replace(/\s+/g, '_')}`,
      trigger: topTrigger,
      emotion: topEmotion,
      copingTool: copingLabel,
      effectivenessScore: effectiveness,
      timesUsed: totalOccurrences,
      narrative,
    });
  });

  return patterns.sort((a, b) => b.timesUsed - a.timesUsed);
}

function buildRelationshipChains(
  graph: EmotionalMemoryGraph,
): RelationshipChain[] {
  const relNodes = getNodesByType(graph, 'relationship_pattern');
  const commNodes = getNodesByType(graph, 'communication_pattern');
  const chains: RelationshipChain[] = [];

  relNodes.forEach((relNode) => {
    const triggerEdges = graph.edges.filter(
      (e) =>
        e.sourceType === 'trigger' &&
        e.targetType === 'emotion',
    );

    const emotionLabels = new Set<string>();
    const urgeLabels = new Set<string>();

    triggerEdges.forEach((edge) => {
      const source = getNodeById(graph, edge.sourceId);
      if (
        source &&
        source.metadata?.category === 'relationship'
      ) {
        const target = getNodeById(graph, edge.targetId);
        if (target) emotionLabels.add(target.label);
      }
    });

    const urgeEdges = graph.edges.filter(
      (e) => e.sourceType === 'emotion' && e.targetType === 'urge',
    );
    urgeEdges.forEach((edge) => {
      const source = getNodeById(graph, edge.sourceId);
      if (source && emotionLabels.has(source.label)) {
        const target = getNodeById(graph, edge.targetId);
        if (target) urgeLabels.add(target.label);
      }
    });

    const commStyle =
      commNodes.length > 0 ? commNodes[0].label : 'reactive communication';

    const emotionArr = Array.from(emotionLabels).slice(0, 2);
    const urgeArr = Array.from(urgeLabels).slice(0, 2);

    const narrative = `${relNode.label} tends to bring up ${emotionArr.join(' and ') || 'strong emotions'}${urgeArr.length > 0 ? `, which may lead to ${urgeArr.join(' or ')}` : ''}. ${commStyle} often follows.`;

    chains.push({
      id: `rc-${relNode.id}`,
      situation: relNode.label,
      emotionalResponse: emotionArr.join(', ') || 'emotional intensity',
      behavioralUrge: urgeArr.join(', ') || 'various urges',
      communicationStyle: commStyle,
      occurrences: relNode.weight,
      narrative,
    });
  });

  return chains.sort((a, b) => b.occurrences - a.occurrences);
}

function buildGrowthSignals(graph: EmotionalMemoryGraph): GrowthSignal[] {
  const progressNodes = getNodesByType(graph, 'progress');
  const signals: GrowthSignal[] = [];

  progressNodes.forEach((node) => {
    let direction: 'improving' | 'stable' | 'needs_attention' = 'improving';
    let metric = '';
    let changeValue = 0;
    let narrative = '';

    if (node.label === 'Intensity Decreasing') {
      const change = Number(node.metadata?.change ?? 0);
      metric = 'distress_intensity';
      changeValue = change;
      narrative = `Your average distress intensity has dropped by ${change.toFixed(1)} points recently. This suggests your coping strategies may be working.`;
    } else if (node.label === 'Better Coping Outcomes') {
      const recentRate = Number(node.metadata?.recentRate ?? 0);
      metric = 'coping_rate';
      changeValue = recentRate;
      narrative = `You are managing emotions more effectively — ${recentRate}% managed recently. This is meaningful progress.`;
    } else if (node.label === 'Expanding Toolkit') {
      const recentCount = Number(node.metadata?.recentCount ?? 0);
      metric = 'toolkit_size';
      changeValue = recentCount;
      narrative = `You are now using ${recentCount} different coping tools. A wider toolkit means more options in difficult moments.`;
    } else if (node.label === 'Pause Effectiveness') {
      metric = 'pause_use';
      changeValue = 1;
      narrative = 'Pausing before reacting seems to be helping you. This is a real sign of growing emotional regulation.';
    } else {
      direction = 'stable';
      metric = 'general';
      narrative = `${node.label}: observed ${node.weight} times.`;
    }

    signals.push({
      id: `gs-${node.id}`,
      area: node.label,
      description: narrative,
      direction,
      metric,
      changeValue,
      narrative,
    });
  });

  return signals;
}

function buildPersonalizedNarrative(
  triggerChains: TriggerChain[],
  calmingPatterns: CalmingPattern[],
  growthSignals: GrowthSignal[],
  totalDataPoints: number,
): string {
  if (totalDataPoints === 0) {
    return 'As you use the app more, your emotional patterns will become clearer here.';
  }

  const parts: string[] = [];

  if (triggerChains.length > 0) {
    const top = triggerChains[0];
    parts.push(
      `Your most frequent trigger seems to be "${top.trigger.label}"${top.emotions.length > 0 ? `, which often brings up ${top.emotions[0].label.toLowerCase()}` : ''}.`,
    );
  }

  if (calmingPatterns.length > 0) {
    const top = calmingPatterns[0];
    parts.push(
      `${top.copingTool} appears to be one of your most effective coping tools.`,
    );
  }

  const improving = growthSignals.filter((g) => g.direction === 'improving');
  if (improving.length > 0) {
    parts.push(
      `There are signs of growth: ${improving.map((g) => g.area.toLowerCase()).join(', ')}.`,
    );
  }

  if (parts.length === 0) {
    parts.push(
      'Keep checking in — every entry helps build a clearer picture of your emotional landscape.',
    );
  }

  return parts.join(' ');
}

export function interpretGraph(
  graph: EmotionalMemoryGraph,
): GraphPatternSummary {
  console.log('[MemoryGraphInterpreter] Interpreting graph with', graph.nodes.length, 'nodes');

  const triggerChains = buildTriggerChains(graph);
  const emotionClusters = buildEmotionClusters(graph);
  const calmingPatterns = buildCalmingPatterns(graph);
  const relationshipChains = buildRelationshipChains(graph);
  const growthSignals = buildGrowthSignals(graph);

  const personalizedNarrative = buildPersonalizedNarrative(
    triggerChains,
    calmingPatterns,
    growthSignals,
    graph.totalDataPoints,
  );

  console.log('[MemoryGraphInterpreter] Found', triggerChains.length, 'trigger chains,', emotionClusters.length, 'emotion clusters,', calmingPatterns.length, 'calming patterns');

  return {
    topTriggerChains: triggerChains.slice(0, 5),
    topEmotionClusters: emotionClusters.slice(0, 5),
    mostEffectiveCalming: calmingPatterns.slice(0, 5),
    relationshipPatterns: relationshipChains.slice(0, 5),
    growthSignals,
    personalizedNarrative,
  };
}
