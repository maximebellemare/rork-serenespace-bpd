import { storageService } from '@/services/storage/storageService';
import { AnalyticsEvent, AnalyticsSummary } from '@/types/analytics';

const STORAGE_KEY = 'bpd_analytics_events';
const MAX_STORED_EVENTS = 500;
const MAX_EVENT_AGE_MS = 30 * 24 * 60 * 60 * 1000;

class LocalEventStore {
  private memoryBuffer: AnalyticsEvent[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    try {
      const stored = await storageService.get<AnalyticsEvent[]>(STORAGE_KEY);
      if (stored && Array.isArray(stored)) {
        const cutoff = Date.now() - MAX_EVENT_AGE_MS;
        this.memoryBuffer = stored.filter(e => e.timestamp > cutoff);
        console.log(`[LocalEventStore] Loaded ${this.memoryBuffer.length} events from storage`);
      }
      this.initialized = true;
    } catch (error) {
      console.log('[LocalEventStore] Error initializing:', error);
      this.initialized = true;
    }
  }

  async addEvent(event: AnalyticsEvent): Promise<void> {
    this.memoryBuffer.push(event);

    if (this.memoryBuffer.length > MAX_STORED_EVENTS) {
      this.memoryBuffer = this.memoryBuffer.slice(-MAX_STORED_EVENTS);
    }

    this.schedulePersist();
  }

  private schedulePersist(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }
    this.flushTimer = setTimeout(() => {
      void this.persist();
    }, 5000);
  }

  async persist(): Promise<void> {
    try {
      await storageService.set(STORAGE_KEY, this.memoryBuffer);
      console.log(`[LocalEventStore] Persisted ${this.memoryBuffer.length} events`);
    } catch (error) {
      console.log('[LocalEventStore] Error persisting:', error);
    }
  }

  async getEvents(limit?: number): Promise<AnalyticsEvent[]> {
    const events = [...this.memoryBuffer].sort((a, b) => b.timestamp - a.timestamp);
    return limit ? events.slice(0, limit) : events;
  }

  async getEventsByName(name: string, limit?: number): Promise<AnalyticsEvent[]> {
    const filtered = this.memoryBuffer
      .filter(e => e.name === name)
      .sort((a, b) => b.timestamp - a.timestamp);
    return limit ? filtered.slice(0, limit) : filtered;
  }

  async getEventsSince(timestamp: number): Promise<AnalyticsEvent[]> {
    return this.memoryBuffer
      .filter(e => e.timestamp >= timestamp)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  async getSummary(): Promise<AnalyticsSummary> {
    const eventCounts: Record<string, number> = {};
    const screenViews: Record<string, number> = {};
    const premiumSignals: Record<string, number> = {};
    const flowStarts: Record<string, number> = {};
    const flowCompletes: Record<string, number> = {};

    const premiumEventNames = new Set([
      'upgrade_screen_viewed',
      'premium_feature_attempted',
      'weekly_reflection_locked',
      'therapist_report_locked',
      'ai_limit_reached',
      'upgrade_clicked',
    ]);

    for (const event of this.memoryBuffer) {
      eventCounts[event.name] = (eventCounts[event.name] || 0) + 1;

      if (event.name === 'screen_view' && event.properties?.screen) {
        const screen = String(event.properties.screen);
        screenViews[screen] = (screenViews[screen] || 0) + 1;
      }

      if (premiumEventNames.has(event.name)) {
        premiumSignals[event.name] = (premiumSignals[event.name] || 0) + 1;
      }

      if (event.name === 'flow_start' && event.properties?.flow) {
        const flow = String(event.properties.flow);
        flowStarts[flow] = (flowStarts[flow] || 0) + 1;
      }

      if (event.name === 'flow_complete' && event.properties?.flow) {
        const flow = String(event.properties.flow);
        flowCompletes[flow] = (flowCompletes[flow] || 0) + 1;
      }
    }

    const allFlows = new Set([...Object.keys(flowStarts), ...Object.keys(flowCompletes)]);
    const flowCompletionRates: Record<string, { started: number; completed: number }> = {};
    allFlows.forEach(flow => {
      flowCompletionRates[flow] = {
        started: flowStarts[flow] || 0,
        completed: flowCompletes[flow] || 0,
      };
    });

    const recentEvents = [...this.memoryBuffer]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 50);

    return {
      totalEvents: this.memoryBuffer.length,
      eventCounts,
      flowCompletionRates,
      recentEvents,
      screenViews,
      premiumSignals,
    };
  }

  async clear(): Promise<void> {
    this.memoryBuffer = [];
    try {
      await storageService.remove(STORAGE_KEY);
      console.log('[LocalEventStore] Cleared all events');
    } catch (error) {
      console.log('[LocalEventStore] Error clearing:', error);
    }
  }

  getEventCount(): number {
    return this.memoryBuffer.length;
  }
}

export const localEventStore = new LocalEventStore();
