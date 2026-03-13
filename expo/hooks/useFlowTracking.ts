import { useCallback, useRef } from 'react';
import { useAnalytics } from '@/providers/AnalyticsProvider';

export function useFlowTracking(flowName: string) {
  const { trackFlowStart, trackFlowStep, trackFlowComplete } = useAnalytics();
  const started = useRef(false);

  const startFlow = useCallback(() => {
    if (!started.current) {
      started.current = true;
      trackFlowStart(flowName);
    }
  }, [flowName, trackFlowStart]);

  const stepFlow = useCallback(
    (stepName: string) => {
      trackFlowStep(flowName, stepName);
    },
    [flowName, trackFlowStep],
  );

  const completeFlow = useCallback(
    (properties?: Record<string, string | number | boolean>) => {
      trackFlowComplete(flowName, properties);
      started.current = false;
    },
    [flowName, trackFlowComplete],
  );

  return { startFlow, stepFlow, completeFlow };
}
