import {
  EmotionalLoop,
  LoopDetailData,
  LoopPhase,
  LoopNode,
  InterruptPoint,
  ActiveLoopSignal,
} from '@/types/emotionalLoop';
import { JournalEntry, MessageDraft } from '@/types';

const RELATIONSHIP_TRIGGERS = [
  'someone ignored me',
  'feeling rejected',
  'fear of abandonment',
  'conflict with someone',
  'perceived criticism',
];

function isRelationshipRelated(loop: EmotionalLoop): boolean {
  return loop.nodes.some(n =>
    RELATIONSHIP_TRIGGERS.some(t => n.label.toLowerCase().includes(t.toLowerCase()))
  );
}

function getFrequencyLabel(occurrences: number): string {
  if (occurrences >= 10) return 'Very frequent';
  if (occurrences >= 5) return 'Frequent';
  if (occurrences >= 3) return 'Recurring';
  return 'Emerging';
}

function getDistressLabel(avgDistress: number): string {
  if (avgDistress >= 8) return 'Very high intensity';
  if (avgDistress >= 6) return 'High intensity';
  if (avgDistress >= 4) return 'Moderate intensity';
  return 'Lower intensity';
}

function buildPhase(
  label: string,
  description: string,
  nodes: LoopNode[],
): LoopPhase {
  const avgIntensity = nodes.length > 0
    ? nodes.reduce((sum, n) => sum + n.averageIntensity, 0) / nodes.length
    : 0;
  return { label, description, nodes, intensity: Math.round(avgIntensity * 10) / 10 };
}

export function mapLoopDetail(
  loop: EmotionalLoop,
  allInterruptPoints: InterruptPoint[],
): LoopDetailData {
  console.log('[LoopMappingService] Mapping detail for loop:', loop.id);

  const triggerNodes = loop.nodes.filter(n => n.type === 'trigger');
  const emotionNodes = loop.nodes.filter(n => n.type === 'emotion');
  const urgeNodes = loop.nodes.filter(n => n.type === 'urge');
  const behaviorNodes = loop.nodes.filter(n => n.type === 'behavior');
  const outcomeNodes = loop.nodes.filter(n => n.type === 'outcome' || n.type === 'coping');

  const triggerLabels = triggerNodes.map(n => n.label.toLowerCase()).join(', ');
  const emotionLabels = emotionNodes.map(n => n.label.toLowerCase()).join(', ');

  const triggerPhase = buildPhase(
    'What tends to start this',
    triggerNodes.length > 0
      ? `This loop often begins when ${triggerLabels} happens.`
      : 'The starting point of this pattern may vary.',
    triggerNodes,
  );

  const emotionalRise = buildPhase(
    'What usually follows',
    emotionNodes.length > 0
      ? `${emotionLabels.charAt(0).toUpperCase() + emotionLabels.slice(1)} tends to rise after the trigger.`
      : 'Emotional intensity may increase at this stage.',
    emotionNodes,
  );

  const urgePhase = buildPhase(
    'Urge phase',
    urgeNodes.length > 0
      ? `The urge to ${urgeNodes.map(n => n.label.toLowerCase()).join(' or ')} often appears here.`
      : 'Urges may become stronger at this point.',
    urgeNodes,
  );

  const actionPhase = buildPhase(
    'What may happen next',
    behaviorNodes.length > 0
      ? `${behaviorNodes.map(n => n.label).join(', ')} often follows the urge.`
      : 'Actions taken during this phase may vary.',
    behaviorNodes,
  );

  const aftereffect = buildPhase(
    'Aftereffect',
    outcomeNodes.length > 0
      ? `Afterward, ${outcomeNodes.map(n => n.label.toLowerCase()).join(' or ')} tends to follow.`
      : 'The aftermath of this loop may carry emotional weight.',
    outcomeNodes,
  );

  const interruptOptions = allInterruptPoints.filter(p => p.loopId === loop.id);

  return {
    loop,
    triggerPhase,
    emotionalRise,
    urgePhase,
    actionPhase,
    aftereffect,
    interruptOptions,
    frequencyLabel: getFrequencyLabel(loop.occurrences),
    distressLabel: getDistressLabel(loop.averageDistress),
    isRelationshipRelated: isRelationshipRelated(loop),
  };
}

export function detectActiveLoops(
  journalEntries: JournalEntry[],
  messageDrafts: MessageDraft[],
  loops: EmotionalLoop[],
): ActiveLoopSignal[] {
  console.log('[LoopMappingService] Checking for active loops...');

  const signals: ActiveLoopSignal[] = [];
  const recentWindow = 4 * 60 * 60 * 1000;
  const now = Date.now();

  const recentEntries = journalEntries.filter(e => now - e.timestamp < recentWindow);
  const recentDrafts = messageDrafts.filter(d => now - d.timestamp < recentWindow);

  if (recentEntries.length === 0 && recentDrafts.length === 0) {
    return signals;
  }

  const recentTriggers = new Set<string>();
  const recentEmotions = new Set<string>();
  const recentUrges = new Set<string>();

  for (const entry of recentEntries) {
    entry.checkIn.triggers.forEach(t => recentTriggers.add(t.label.toLowerCase()));
    entry.checkIn.emotions.forEach(e => recentEmotions.add(e.label.toLowerCase()));
    entry.checkIn.urges.forEach(u => recentUrges.add(u.label.toLowerCase()));
  }

  const hasRecentRewrites = recentDrafts.length >= 2;

  for (const loop of loops) {
    let matchScore = 0;
    const loopTriggers = loop.nodes.filter(n => n.type === 'trigger');
    const loopEmotions = loop.nodes.filter(n => n.type === 'emotion');
    const loopUrges = loop.nodes.filter(n => n.type === 'urge');
    const loopBehaviors = loop.nodes.filter(n => n.type === 'behavior');

    for (const t of loopTriggers) {
      if (recentTriggers.has(t.label.toLowerCase())) matchScore += 2;
    }
    for (const e of loopEmotions) {
      if (recentEmotions.has(e.label.toLowerCase())) matchScore += 1.5;
    }
    for (const u of loopUrges) {
      if (recentUrges.has(u.label.toLowerCase())) matchScore += 1;
    }
    if (hasRecentRewrites && loopBehaviors.some(b => b.label.toLowerCase().includes('rewrite'))) {
      matchScore += 1.5;
    }

    const maxPossible = loopTriggers.length * 2 + loopEmotions.length * 1.5 + loopUrges.length * 1 + 1.5;
    const confidence = maxPossible > 0 ? Math.min(matchScore / maxPossible, 1) : 0;

    if (confidence >= 0.3) {
      const firstNode = loop.nodes[0];
      signals.push({
        loopId: loop.id,
        loopLabel: loop.narrative || `${loop.nodes.map(n => n.label).join(' → ')}`,
        confidence,
        message: `This may be part of a familiar pattern. ${firstNode ? `It often starts with ${firstNode.label.toLowerCase()}.` : ''}`,
        suggestedAction: 'View this loop',
        suggestedRoute: `/loop-detail?loopId=${loop.id}`,
      });
    }
  }

  return signals.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
}
