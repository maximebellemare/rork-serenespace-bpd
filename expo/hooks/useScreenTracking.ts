import { useEffect } from 'react';
import { useAnalytics } from '@/providers/AnalyticsProvider';

export function useScreenTracking(screenName: string): void {
  const { trackScreen } = useAnalytics();

  useEffect(() => {
    trackScreen(screenName);
  }, [screenName, trackScreen]);
}
