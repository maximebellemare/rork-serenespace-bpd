import { AnalyticsEvent, AnalyticsUserProperties } from '@/types/analytics';
import { IAnalyticsRepository } from './types';
import { analyticsEngine } from '@/services/analytics/analyticsEngine';
import { localEventStore } from '@/services/analytics/localEventStore';

export class LocalAnalyticsRepository implements IAnalyticsRepository {
  private userProperties: AnalyticsUserProperties = {};

  async trackEvent(name: string, properties?: Record<string, string | number | boolean>): Promise<void> {
    return analyticsEngine.trackEvent(name, properties);
  }

  async setUserProperties(properties: AnalyticsUserProperties): Promise<void> {
    this.userProperties = { ...this.userProperties, ...properties };
    return analyticsEngine.setUserProperties(properties);
  }

  async getEvents(): Promise<AnalyticsEvent[]> {
    return localEventStore.getEvents();
  }

  async flush(): Promise<void> {
    return analyticsEngine.flush();
  }
}
