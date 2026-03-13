import { JournalEntry, MessageDraft } from '@/types';
import { MemoryProfile } from '@/types/memory';
import {
  UserMemory,
  MemoryConnection,
  MemorySnapshot,
  MemoryNarrative,
  MemorySummary,
  MemoryCategory,
  MemoryStrength,
} from '@/types/userMemory';
import { storageService } from '@/services/storage/storageService';

const MEMORY_STORAGE_KEY = 'bpd_user_memories';
const MEMORY_VERSION = 1;

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

function calculateStrength(occurrences: number): MemoryStrength {
  if (occurrences >= 5) return 'strong';
  if (occurrences >= 2) return 'moderate';
  return 'weak';
}

export async function loadMemorySnapshot(): Promise<MemorySnapshot> {
  try {
    const stored = await storageService.get<MemorySnapshot>(MEMORY_STORAGE_KEY);
    if (stored && stored.version === MEMORY_VERSION) {
      console.log('[UserMemoryService] Loaded', stored.memories.length, 'memories,', stored.connections.length, 'connections');
      return stored;
    }
    return createEmptySnapshot();
  } catch (error) {
    console.log('[UserMemoryService] Error loading snapshot:', error);
    return createEmptySnapshot();
  }
}

export async function saveMemorySnapshot(snapshot: MemorySnapshot): Promise<void> {
  try {
    snapshot.lastUpdated = Date.now();
    await storageService.set(MEMORY_STORAGE_KEY, snapshot);
    console.log('[UserMemoryService] Saved', snapshot.memories.length, 'memories');
  } catch (error) {
    console.log('[UserMemoryService] Error saving snapshot:', error);
  }
}

function createEmptySnapshot(): MemorySnapshot {
  return {
    memories: [],
    connections: [],
    lastUpdated: 0,
    version: MEMORY_VERSION,
  };
}

function findMemory(
  memories: UserMemory[],
  category: MemoryCategory,
  label: string,
): UserMemory | undefined {
  return memories.find(
    m => m.category === category && m.label.toLowerCase() === label.toLowerCase(),
  );
}

function upsertMemory(
  memories: UserMemory[],
  category: MemoryCategory,
  label: string,
  description: string,
  metadata?: Record<string, string | number | boolean>,
): UserMemory {
  const existing = findMemory(memories, category, label);
  if (existing) {
    existing.occurrences += 1;
    existing.lastObserved = Date.now();
    existing.strength = calculateStrength(existing.occurrences);
    if (metadata) {
      existing.metadata = { ...existing.metadata, ...metadata };
    }
    return existing;
  }

  const memory: UserMemory = {
    id: generateId(category),
    category,
    label,
    description,
    strength: 'weak',
    occurrences: 1,
    firstObserved: Date.now(),
    lastObserved: Date.now(),
    relatedMemoryIds: [],
    metadata,
  };
  memories.push(memory);
  return memory;
}

function upsertConnection(
  connections: MemoryConnection[],
  source: UserMemory,
  target: UserMemory,
  label: string,
): MemoryConnection {
  const existing = connections.find(
    c => c.sourceId === source.id && c.targetId === target.id,
  );
  if (existing) {
    existing.occurrences += 1;
    existing.strength = Math.min(1, existing.occurrences / 8);
    existing.lastObserved = Date.now();
    return existing;
  }

  const connection: MemoryConnection = {
    id: generateId('conn'),
    sourceId: source.id,
    targetId: target.id,
    sourceCategory: source.category,
    targetCategory: target.category,
    label,
    strength: 0.15,
    occurrences: 1,
    lastObserved: Date.now(),
  };
  connections.push(connection);

  if (!source.relatedMemoryIds.includes(target.id)) {
    source.relatedMemoryIds.push(target.id);
  }
  if (!target.relatedMemoryIds.includes(source.id)) {
    target.relatedMemoryIds.push(source.id);
  }

  return connection;
}

export function buildMemoriesFromJournal(
  snapshot: MemorySnapshot,
  entries: JournalEntry[],
): MemorySnapshot {
  const { memories, connections } = snapshot;

  entries.forEach(entry => {
    const triggerMemories = entry.checkIn.triggers.map(t =>
      upsertMemory(memories, 'trigger', t.label, `Trigger: ${t.label}`, {
        category: t.category,
        avgIntensity: entry.checkIn.intensityLevel,
      }),
    );

    const emotionMemories = entry.checkIn.emotions.map(e =>
      upsertMemory(memories, 'emotion', e.label, `Emotion: ${e.label}`, {
        intensity: e.intensity ?? entry.checkIn.intensityLevel,
      }),
    );

    const copingMemories = (entry.checkIn.copingUsed ?? []).map(c =>
      upsertMemory(memories, 'coping', c, `Coping tool: ${c}`, {
        outcome: entry.outcome ?? 'neutral',
      }),
    );

    triggerMemories.forEach(trigger => {
      emotionMemories.forEach(emotion => {
        upsertConnection(connections, trigger, emotion, 'triggers');
      });
      copingMemories.forEach(coping => {
        upsertConnection(connections, trigger, coping, 'managed_with');
      });
    });

    emotionMemories.forEach(emotion => {
      entry.checkIn.urges.forEach(u => {
        const urgeMemory = upsertMemory(memories, 'loop', u.label, `Urge: ${u.label}`, {
          risk: u.risk,
        });
        upsertConnection(connections, emotion, urgeMemory, 'leads_to');
      });
      copingMemories.forEach(coping => {
        upsertConnection(connections, emotion, coping, 'soothed_by');
      });
    });

    const isRelationship = entry.checkIn.triggers.some(t => t.category === 'relationship');
    if (isRelationship) {
      const relTriggerLabels = entry.checkIn.triggers
        .filter(t => t.category === 'relationship')
        .map(t => t.label)
        .join(', ');
      upsertMemory(
        memories,
        'relationship',
        relTriggerLabels,
        `Relationship pattern: ${relTriggerLabels}`,
        { intensity: entry.checkIn.intensityLevel },
      );
    }
  });

  snapshot.lastUpdated = Date.now();
  console.log('[UserMemoryService] Built memories from journal:', memories.length, 'memories,', connections.length, 'connections');
  return snapshot;
}

export function buildMemoriesFromMessages(
  snapshot: MemorySnapshot,
  drafts: MessageDraft[],
): MemorySnapshot {
  const { memories } = snapshot;

  const rewriteCount = drafts.filter(m => m.rewrittenText).length;
  const pauseCount = drafts.filter(m => m.paused).length;

  if (rewriteCount > 0) {
    upsertMemory(memories, 'coping', 'Message Rewriting', 'Using message rewrites to communicate more clearly', {
      totalRewrites: rewriteCount,
    });
  }

  if (pauseCount > 0) {
    upsertMemory(memories, 'coping', 'Pause Before Sending', 'Pausing before responding reactively', {
      totalPauses: pauseCount,
    });
  }

  const helpedPauses = drafts.filter(m => m.paused && m.outcome === 'helped').length;
  if (helpedPauses > 0) {
    upsertMemory(memories, 'growth', 'Pause Effectiveness', 'Pausing before sending is helping regulate communication', {
      helpedCount: helpedPauses,
    });
  }

  snapshot.lastUpdated = Date.now();
  return snapshot;
}

export function buildMemoriesFromProfile(
  snapshot: MemorySnapshot,
  profile: MemoryProfile,
): MemorySnapshot {
  const { memories } = snapshot;

  if (profile.intensityTrend === 'falling') {
    upsertMemory(memories, 'growth', 'Decreasing Intensity', 'Emotional intensity has been trending downward recently');
  }

  if (profile.copingSuccessRate >= 50) {
    upsertMemory(memories, 'growth', 'Effective Coping', `Managing emotions effectively ${profile.copingSuccessRate}% of the time`);
  }

  profile.recentImprovements.forEach(imp => {
    upsertMemory(memories, 'growth', imp.area, imp.description);
  });

  snapshot.lastUpdated = Date.now();
  return snapshot;
}

export function generateNarratives(snapshot: MemorySnapshot): MemoryNarrative[] {
  const narratives: MemoryNarrative[] = [];
  const { memories, connections } = snapshot;

  const strongTriggers = memories
    .filter(m => m.category === 'trigger' && m.strength !== 'weak')
    .sort((a, b) => b.occurrences - a.occurrences)
    .slice(0, 3);

  strongTriggers.forEach(trigger => {
    const relatedConnections = connections.filter(c => c.sourceId === trigger.id);
    const emotionIds = relatedConnections
      .filter(c => c.targetCategory === 'emotion')
      .map(c => c.targetId);
    const emotions = memories.filter(m => emotionIds.includes(m.id));

    if (emotions.length > 0) {
      const emotionLabels = emotions.slice(0, 2).map(e => e.label.toLowerCase()).join(' and ');
      narratives.push({
        id: generateId('narr'),
        category: 'trigger',
        text: `"${trigger.label}" tends to bring up ${emotionLabels}. This pattern has appeared ${trigger.occurrences} times.`,
        relatedMemoryIds: [trigger.id, ...emotionIds.slice(0, 2)],
        generatedAt: Date.now(),
      });
    }
  });

  const strongCoping = memories
    .filter(m => m.category === 'coping' && m.strength !== 'weak')
    .sort((a, b) => b.occurrences - a.occurrences)
    .slice(0, 3);

  strongCoping.forEach(coping => {
    narratives.push({
      id: generateId('narr'),
      category: 'coping',
      text: `"${coping.label}" has been consistently helpful for you, used ${coping.occurrences} times.`,
      relatedMemoryIds: [coping.id],
      generatedAt: Date.now(),
    });
  });

  const growthSignals = memories
    .filter(m => m.category === 'growth')
    .sort((a, b) => b.lastObserved - a.lastObserved)
    .slice(0, 3);

  growthSignals.forEach(growth => {
    narratives.push({
      id: generateId('narr'),
      category: 'growth',
      text: growth.description,
      relatedMemoryIds: [growth.id],
      generatedAt: Date.now(),
    });
  });

  const relationshipMemories = memories
    .filter(m => m.category === 'relationship' && m.occurrences >= 2)
    .sort((a, b) => b.occurrences - a.occurrences)
    .slice(0, 2);

  relationshipMemories.forEach(rel => {
    narratives.push({
      id: generateId('narr'),
      category: 'relationship',
      text: `Relationship stress around "${rel.label}" has come up ${rel.occurrences} times. Recognizing this pattern may help you respond with more awareness.`,
      relatedMemoryIds: [rel.id],
      generatedAt: Date.now(),
    });
  });

  const loopMemories = memories
    .filter(m => m.category === 'loop' && m.occurrences >= 2)
    .sort((a, b) => b.occurrences - a.occurrences)
    .slice(0, 2);

  loopMemories.forEach(loop => {
    const incomingConnections = connections.filter(c => c.targetId === loop.id);
    const sourceEmotions = memories.filter(m =>
      incomingConnections.some(c => c.sourceId === m.id && m.category === 'emotion'),
    );

    if (sourceEmotions.length > 0) {
      const emotionLabel = sourceEmotions[0].label.toLowerCase();
      narratives.push({
        id: generateId('narr'),
        category: 'loop',
        text: `When feeling ${emotionLabel}, you tend to feel the urge to "${loop.label.toLowerCase()}." This loop has appeared ${loop.occurrences} times.`,
        relatedMemoryIds: [loop.id, sourceEmotions[0].id],
        generatedAt: Date.now(),
      });
    }
  });

  return narratives;
}

export function buildMemorySummary(snapshot: MemorySnapshot): MemorySummary {
  const { memories } = snapshot;

  const byCategory = (cat: MemoryCategory) =>
    memories
      .filter(m => m.category === cat)
      .sort((a, b) => b.occurrences - a.occurrences);

  const narratives = generateNarratives(snapshot);

  return {
    topTriggers: byCategory('trigger').slice(0, 5),
    commonLoops: byCategory('loop').slice(0, 5),
    helpfulTools: byCategory('coping').slice(0, 5),
    growthSignals: byCategory('growth').slice(0, 5),
    personalValues: byCategory('value').slice(0, 5),
    relationshipPatterns: byCategory('relationship').slice(0, 5),
    narratives,
    totalMemories: memories.length,
    strongMemoryCount: memories.filter(m => m.strength === 'strong').length,
  };
}

export function buildAIMemoryContext(snapshot: MemorySnapshot): string {
  const { memories, connections } = snapshot;

  if (memories.length === 0) {
    return '';
  }

  const parts: string[] = [];
  parts.push('[Persistent Memory Context]');

  const strongTriggers = memories
    .filter(m => m.category === 'trigger' && m.strength !== 'weak')
    .sort((a, b) => b.occurrences - a.occurrences)
    .slice(0, 3);

  if (strongTriggers.length > 0) {
    parts.push(`Known triggers: ${strongTriggers.map(t => `"${t.label}" (${t.occurrences}x)`).join(', ')}.`);
  }

  const strongEmotions = memories
    .filter(m => m.category === 'emotion' && m.strength !== 'weak')
    .sort((a, b) => b.occurrences - a.occurrences)
    .slice(0, 3);

  if (strongEmotions.length > 0) {
    parts.push(`Frequent emotions: ${strongEmotions.map(e => `"${e.label}"`).join(', ')}.`);
  }

  const effectiveTools = memories
    .filter(m => m.category === 'coping' && m.strength !== 'weak')
    .sort((a, b) => b.occurrences - a.occurrences)
    .slice(0, 3);

  if (effectiveTools.length > 0) {
    parts.push(`Effective coping tools: ${effectiveTools.map(c => `"${c.label}"`).join(', ')}.`);
  }

  const loops = memories
    .filter(m => m.category === 'loop' && m.occurrences >= 2)
    .sort((a, b) => b.occurrences - a.occurrences)
    .slice(0, 2);

  if (loops.length > 0) {
    parts.push(`Recurring urges: ${loops.map(l => `"${l.label}" (${l.occurrences}x)`).join(', ')}.`);
  }

  const relPatterns = memories
    .filter(m => m.category === 'relationship' && m.occurrences >= 2)
    .sort((a, b) => b.occurrences - a.occurrences)
    .slice(0, 2);

  if (relPatterns.length > 0) {
    parts.push(`Relationship stress patterns: ${relPatterns.map(r => `"${r.label}"`).join(', ')}.`);
  }

  const growth = memories
    .filter(m => m.category === 'growth')
    .sort((a, b) => b.lastObserved - a.lastObserved)
    .slice(0, 2);

  if (growth.length > 0) {
    parts.push(`Growth signals: ${growth.map(g => g.description).join(' ')}`);
  }

  const strongConnections = connections
    .filter(c => c.strength >= 0.3)
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 3);

  if (strongConnections.length > 0) {
    const connectionDescs = strongConnections.map(c => {
      const source = memories.find(m => m.id === c.sourceId);
      const target = memories.find(m => m.id === c.targetId);
      if (source && target) {
        return `"${source.label}" ${c.label} "${target.label}"`;
      }
      return null;
    }).filter(Boolean);

    if (connectionDescs.length > 0) {
      parts.push(`Known connections: ${connectionDescs.join('; ')}.`);
    }
  }

  const values = memories.filter(m => m.category === 'value').slice(0, 3);
  if (values.length > 0) {
    parts.push(`Personal values: ${values.map(v => `"${v.label}"`).join(', ')}.`);
  }

  return parts.join('\n');
}

export function getMemoryBasedSuggestion(
  snapshot: MemorySnapshot,
  currentTrigger?: string,
  currentEmotion?: string,
): string | null {
  const { memories, connections } = snapshot;

  if (memories.length === 0) return null;

  if (currentTrigger) {
    const triggerMemory = findMemory(memories, 'trigger', currentTrigger);
    if (triggerMemory && triggerMemory.occurrences >= 2) {
      const relatedConnections = connections.filter(
        c => c.sourceId === triggerMemory.id && c.targetCategory === 'emotion',
      );
      const relatedEmotions = relatedConnections
        .map(c => memories.find(m => m.id === c.targetId))
        .filter(Boolean)
        .slice(0, 2);

      if (relatedEmotions.length > 0) {
        const emotionLabels = relatedEmotions.map(e => e!.label.toLowerCase()).join(' and ');
        return `This situation looks similar to one that has triggered ${emotionLabels} before. You've encountered "${currentTrigger}" ${triggerMemory.occurrences} times.`;
      }
    }
  }

  if (currentEmotion) {
    const emotionMemory = findMemory(memories, 'emotion', currentEmotion);
    if (emotionMemory) {
      const copingConnections = connections.filter(
        c => c.sourceId === emotionMemory.id && c.targetCategory === 'coping',
      );
      const copingTools = copingConnections
        .sort((a, b) => b.occurrences - a.occurrences)
        .map(c => memories.find(m => m.id === c.targetId))
        .filter(Boolean)
        .slice(0, 2);

      if (copingTools.length > 0) {
        const toolLabels = copingTools.map(t => `"${t!.label}"`).join(' or ');
        return `When you've felt ${currentEmotion.toLowerCase()} before, ${toolLabels} seemed to help.`;
      }
    }
  }

  return null;
}

export function addValueMemory(
  snapshot: MemorySnapshot,
  label: string,
  description: string,
): MemorySnapshot {
  upsertMemory(snapshot.memories, 'value', label, description);
  snapshot.lastUpdated = Date.now();
  return snapshot;
}
