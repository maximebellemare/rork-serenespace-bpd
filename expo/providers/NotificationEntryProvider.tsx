import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import {
  NotificationEntryState,
  NotificationConversionEvent,
  NOTIFICATION_ENTRY_INITIAL,
} from '@/types/notificationRouting';
import { NotificationCategory } from '@/types/notifications';
import { notificationActionHandler } from '@/services/notifications/notificationActionHandler';

const ENTRY_EXPIRY_MS = 30 * 1000;

export const [NotificationEntryProvider, useNotificationEntry] = createContextHook(() => {
  const [entryState, setEntryState] = useState<NotificationEntryState>({ ...NOTIFICATION_ENTRY_INITIAL });
  const expiryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleExpiry = useCallback(() => {
    if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
    expiryTimerRef.current = setTimeout(() => {
      setEntryState(prev => {
        if (prev.active) {
          console.log('[NotificationEntry] Entry state expired');
          return { ...NOTIFICATION_ENTRY_INITIAL };
        }
        return prev;
      });
    }, ENTRY_EXPIRY_MS);
  }, []);

  useEffect(() => {
    const loadPersisted = async () => {
      const persisted = await notificationActionHandler.getPersistedEntryState();
      if (persisted.active) {
        setEntryState(persisted);
        scheduleExpiry();
      }
    };
    void loadPersisted();
    return () => {
      if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
    };
  }, [scheduleExpiry]);

  const setNotificationEntry = useCallback((state: NotificationEntryState) => {
    console.log('[NotificationEntry] Setting entry state:', state.category, state.route);
    setEntryState(state);
    if (state.active) {
      scheduleExpiry();
    }
  }, [scheduleExpiry]);

  const clearEntry = useCallback(() => {
    console.log('[NotificationEntry] Clearing entry state');
    setEntryState({ ...NOTIFICATION_ENTRY_INITIAL });
    void notificationActionHandler.clearEntryState();
    if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
  }, []);

  const markFlowStarted = useCallback(() => {
    void notificationActionHandler.markFlowStarted();
  }, []);

  const markFlowCompleted = useCallback((distressAfter?: number) => {
    void notificationActionHandler.markFlowCompleted(distressAfter);
    clearEntry();
  }, [clearEntry]);

  const markBounced = useCallback(() => {
    void notificationActionHandler.markBounced();
    clearEntry();
  }, [clearEntry]);

  const isFromNotification = useCallback((category?: NotificationCategory): boolean => {
    if (!entryState.active) return false;
    if (category) return entryState.category === category;
    return true;
  }, [entryState]);

  const getConversionHistory = useCallback(async (limit?: number): Promise<NotificationConversionEvent[]> => {
    return notificationActionHandler.getConversionHistory(limit);
  }, []);

  const getConversionStats = useCallback(async () => {
    return notificationActionHandler.getConversionStats();
  }, []);

  return useMemo(() => ({
    entryState,
    setNotificationEntry,
    clearEntry,
    markFlowStarted,
    markFlowCompleted,
    markBounced,
    isFromNotification,
    getConversionHistory,
    getConversionStats,
  }), [
    entryState,
    setNotificationEntry,
    clearEntry,
    markFlowStarted,
    markFlowCompleted,
    markBounced,
    isFromNotification,
    getConversionHistory,
    getConversionStats,
  ]);
});
