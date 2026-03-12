import { AnalyticsEvent, AnalyticsUserProperties } from '@/types/analytics';
import { IAnalyticsRepository } from './types';

export class LocalAnalyticsRepository implements IAnalyticsRepository {
  private events: AnalyticsEvent[] = [];
  private userProperties: AnalyticsUserProperties = {};

  async trackEvent(name: string, properties?: Record<string, string | number | boolean>): Promise<void> {
    const event: AnalyticsEvent = {
      name,
      properties,
      timestamp: Date.now(),
    };
    this.events.push(event);
    console.log('[Analytics] Event tracked:', name, properties ?? '');
  }

  async setUserProperties(properties: AnalyticsUserProperties): Promise<void> {
    this.userProperties = { ...this.userProperties, ...properties };
    console.log('[Analytics] User properties updated:', properties);
  }

  async getEvents(): Promise<AnalyticsEvent[]> {
    return [...this.events];
  }

  async flush(): Promise<void> {
    console.log('[Analytics] Flushing', this.events.length, 'events (no-op in local mode)');
  }
}
