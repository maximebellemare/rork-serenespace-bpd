import { useEffect, useCallback, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { analyticsEngine } from '@/services/analytics/analyticsEngine';
import { localEventStore } from '@/services/analytics/localEventStore';
import { AnalyticsUserProperties, RegulationOutcome, AnalyticsSummary } from '@/types/analytics';

export const [AnalyticsProvider, useAnalytics] = createContextHook(() => {
  useEffect(() => {
    void analyticsEngine.initialize();
  }, []);

  const trackEvent = useCallback(
    (name: string, properties?: Record<string, string | number | boolean>) => {
      void analyticsEngine.trackEvent(name, properties);
    },
    [],
  );

  const trackScreen = useCallback((screenName: string) => {
    void analyticsEngine.trackScreen(screenName);
  }, []);

  const trackFlowStart = useCallback((flowName: string) => {
    void analyticsEngine.trackFlowStart(flowName);
  }, []);

  const trackFlowStep = useCallback((flowName: string, stepName: string) => {
    void analyticsEngine.trackFlowStep(flowName, stepName);
  }, []);

  const trackFlowComplete = useCallback(
    (flowName: string, properties?: Record<string, string | number | boolean>) => {
      void analyticsEngine.trackFlowComplete(flowName, properties);
    },
    [],
  );

  const trackRegulationOutcome = useCallback((outcome: RegulationOutcome) => {
    void analyticsEngine.trackRegulationOutcome(outcome);
  }, []);

  const setUserProperties = useCallback((properties: AnalyticsUserProperties) => {
    void analyticsEngine.setUserProperties(properties);
  }, []);

  const flush = useCallback(() => {
    void analyticsEngine.flush();
  }, []);

  const getSummary = useCallback(async (): Promise<AnalyticsSummary> => {
    return localEventStore.getSummary();
  }, []);

  const getRecentEvents = useCallback(async (limit?: number) => {
    return localEventStore.getEvents(limit);
  }, []);

  const clearEvents = useCallback(async () => {
    return localEventStore.clear();
  }, []);

  return useMemo(() => ({
    trackEvent,
    trackScreen,
    trackFlowStart,
    trackFlowStep,
    trackFlowComplete,
    trackRegulationOutcome,
    setUserProperties,
    flush,
    getSummary,
    getRecentEvents,
    clearEvents,
  }), [
    trackEvent,
    trackScreen,
    trackFlowStart,
    trackFlowStep,
    trackFlowComplete,
    trackRegulationOutcome,
    setUserProperties,
    flush,
    getSummary,
    getRecentEvents,
    clearEvents,
  ]);
});
