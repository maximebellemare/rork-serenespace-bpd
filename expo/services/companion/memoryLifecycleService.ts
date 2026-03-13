import {
  CompanionMemoryStore,
  EpisodicMemory,
} from '@/types/companionMemory';

const SHORT_TERM_EXPIRY_DAYS = 7;
const EPISODIC_EXPIRY_DAYS = 120;
const EPISODIC_PINNED_EXPIRY_DAYS = 365;
const SEMANTIC_DECAY_THRESHOLD = 0.05;
const MAX_EPISODIC_AFTER_CLEANUP = 150;
const MAX_SEMANTIC_AFTER_CLEANUP = 80;

export interface LifecycleReport {
  shortTermRemoved: number;
  episodicRemoved: number;
  episodicDecayed: number;
  semanticRemoved: number;
  semanticDecayed: number;
  totalRemoved: number;
}

export function runMemoryLifecycle(store: CompanionMemoryStore): {
  store: CompanionMemoryStore;
  report: LifecycleReport;
} {
  const report: LifecycleReport = {
    shortTermRemoved: 0,
    episodicRemoved: 0,
    episodicDecayed: 0,
    semanticRemoved: 0,
    semanticDecayed: 0,
    totalRemoved: 0,
  };

  const now = Date.now();

  const originalShortTerm = store.shortTermMemories.length;
  store.shortTermMemories = store.shortTermMemories.filter(m => {
    if (m.expiresAt && m.expiresAt < now) return false;
    const ageDays = (now - m.timestamp) / (24 * 60 * 60 * 1000);
    return ageDays < SHORT_TERM_EXPIRY_DAYS;
  });
  report.shortTermRemoved = originalShortTerm - store.shortTermMemories.length;

  const originalEpisodic = store.episodicMemories.length;
  store.episodicMemories = store.episodicMemories.filter(m => {
    const ageDays = (now - m.timestamp) / (24 * 60 * 60 * 1000);
    const isPinned = isMemoryPinned(m);
    const expiryDays = isPinned ? EPISODIC_PINNED_EXPIRY_DAYS : EPISODIC_EXPIRY_DAYS;
    return ageDays < expiryDays;
  });

  if (store.episodicMemories.length > MAX_EPISODIC_AFTER_CLEANUP) {
    const scored = store.episodicMemories.map(m => ({
      memory: m,
      value: calculateEpisodicValue(m, now),
    }));
    scored.sort((a, b) => b.value - a.value);
    store.episodicMemories = scored.slice(0, MAX_EPISODIC_AFTER_CLEANUP).map(s => s.memory);
  }

  report.episodicRemoved = originalEpisodic - store.episodicMemories.length;

  const originalSemantic = store.semanticMemories.length;
  store.semanticMemories = store.semanticMemories.map(m => {
    const daysSinceReinforced = (now - m.lastReinforced) / (24 * 60 * 60 * 1000);
    if (daysSinceReinforced > 60 && m.confidence > SEMANTIC_DECAY_THRESHOLD) {
      const decayRate = 0.01 * Math.floor(daysSinceReinforced / 30);
      const newConfidence = Math.max(SEMANTIC_DECAY_THRESHOLD, m.confidence - decayRate);
      if (newConfidence < m.confidence) {
        report.semanticDecayed++;
        return { ...m, confidence: newConfidence };
      }
    }
    return m;
  });

  store.semanticMemories = store.semanticMemories.filter(m =>
    m.confidence >= SEMANTIC_DECAY_THRESHOLD || m.observationCount >= 3,
  );

  if (store.semanticMemories.length > MAX_SEMANTIC_AFTER_CLEANUP) {
    store.semanticMemories.sort((a, b) => {
      const scoreA = a.confidence * 2 + a.observationCount * 0.3;
      const scoreB = b.confidence * 2 + b.observationCount * 0.3;
      return scoreB - scoreA;
    });
    store.semanticMemories = store.semanticMemories.slice(0, MAX_SEMANTIC_AFTER_CLEANUP);
  }

  report.semanticRemoved = originalSemantic - store.semanticMemories.length;
  report.totalRemoved = report.shortTermRemoved + report.episodicRemoved + report.semanticRemoved;

  store.lastUpdated = now;

  console.log('[MemoryLifecycle] Cleanup complete:', report);

  return { store, report };
}

function isMemoryPinned(memory: EpisodicMemory): boolean {
  if (memory.lesson && memory.lesson.length > 20) return true;
  if (memory.copingUsed && memory.copingUsed.length > 0 && memory.outcome === 'helped') return true;
  if (memory.intensity && memory.intensity >= 8) return true;
  return false;
}

function calculateEpisodicValue(memory: EpisodicMemory, now: number): number {
  let value = 0;

  const ageDays = (now - memory.timestamp) / (24 * 60 * 60 * 1000);
  value += Math.max(0, 10 - ageDays / 7);

  if (memory.lesson) value += 3;
  if (memory.copingUsed && memory.copingUsed.length > 0) value += 2;
  if (memory.outcome === 'helped') value += 2;
  if (memory.relationshipContext) value += 1;
  if (memory.intensity && memory.intensity >= 7) value += 2;

  return value;
}

export function shouldRunLifecycle(store: CompanionMemoryStore): boolean {
  const hoursSinceUpdate = (Date.now() - store.lastUpdated) / (60 * 60 * 1000);

  if (store.shortTermMemories.length > 40) return true;
  if (store.episodicMemories.length > 180) return true;
  if (store.semanticMemories.length > 90) return true;
  if (hoursSinceUpdate > 24) return true;

  return false;
}
