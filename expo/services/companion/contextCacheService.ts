import { RetrievedMemoryContext } from '@/types/companionMemory';

interface CachedContext {
  memoryNarrative: string;
  retrievedMemories: RetrievedMemoryContext | null;
  emotionalContext: string;
  sessionSummary: string | null;
  conversationSummary: string | null;
  cachedAt: number;
  conversationId: string;
  messageCount: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 3;

class ContextCacheService {
  private cache = new Map<string, CachedContext>();

  get(conversationId: string, currentMessageCount: number): CachedContext | null {
    const entry = this.cache.get(conversationId);
    if (!entry) return null;

    const isExpired = Date.now() - entry.cachedAt > CACHE_TTL_MS;
    const isStale = currentMessageCount > entry.messageCount + 2;

    if (isExpired || isStale) {
      this.cache.delete(conversationId);
      console.log('[ContextCache] Cache miss (expired/stale):', conversationId);
      return null;
    }

    console.log('[ContextCache] Cache hit:', conversationId);
    return entry;
  }

  set(conversationId: string, context: Omit<CachedContext, 'cachedAt' | 'conversationId'>): void {
    if (this.cache.size >= MAX_CACHE_ENTRIES) {
      const oldest = this.getOldestKey();
      if (oldest) this.cache.delete(oldest);
    }

    this.cache.set(conversationId, {
      ...context,
      cachedAt: Date.now(),
      conversationId,
    });

    console.log('[ContextCache] Cached context for:', conversationId);
  }

  invalidate(conversationId: string): void {
    this.cache.delete(conversationId);
  }

  invalidateAll(): void {
    this.cache.clear();
    console.log('[ContextCache] All caches invalidated');
  }

  getCacheStats(): { entries: number; oldestAge: number } {
    let oldestAge = 0;
    for (const entry of this.cache.values()) {
      const age = Date.now() - entry.cachedAt;
      if (age > oldestAge) oldestAge = age;
    }
    return { entries: this.cache.size, oldestAge };
  }

  private getOldestKey(): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    for (const [key, value] of this.cache.entries()) {
      if (value.cachedAt < oldestTime) {
        oldestTime = value.cachedAt;
        oldestKey = key;
      }
    }
    return oldestKey;
  }
}

export const contextCache = new ContextCacheService();
