import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import {
  Medication,
  MedicationLog,
  MedicationTime,
  LogStatus,
  MoodAfter,
} from '@/types/medication';
import { medicationRepository } from '@/services/repositories';
import { medicationService } from '@/services/medications/medicationService';
import { medicationReminderService } from '@/services/medications/medicationReminderService';

export const [MedicationProvider, useMedications] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [logs, setLogs] = useState<MedicationLog[]>([]);

  const stateQuery = useQuery({
    queryKey: ['medications'],
    queryFn: () => medicationRepository.getState(),
  });

  useEffect(() => {
    if (stateQuery.data) {
      setMedications(stateQuery.data.medications);
      setLogs(stateQuery.data.logs);
    }
  }, [stateQuery.data]);

  const addMedicationMutation = useMutation({
    mutationFn: (med: Omit<Medication, 'id' | 'createdAt' | 'updatedAt'>) =>
      medicationService.addMedication(med),
    onSuccess: (newMed) => {
      const updated = [newMed, ...medications];
      setMedications(updated);
      void medicationReminderService.syncReminders(updated);
      void queryClient.invalidateQueries({ queryKey: ['medications'] });
    },
  });

  const updateMedicationMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Medication> }) =>
      medicationService.updateMedication(id, updates),
    onSuccess: (result) => {
      if (result) {
        const updated = medications.map(m => m.id === result.id ? result : m);
        setMedications(updated);
        void medicationReminderService.syncReminders(updated);
        void queryClient.invalidateQueries({ queryKey: ['medications'] });
      }
    },
  });

  const deleteMedicationMutation = useMutation({
    mutationFn: (id: string) => medicationService.deleteMedication(id),
    onSuccess: (_, id) => {
      const updated = medications.filter(m => m.id !== id);
      setMedications(updated);
      setLogs(prev => prev.filter(l => l.medicationId !== id));
      void medicationReminderService.syncReminders(updated);
      void queryClient.invalidateQueries({ queryKey: ['medications'] });
    },
  });

  const logMedicationMutation = useMutation({
    mutationFn: (params: {
      medicationId: string;
      status: LogStatus;
      scheduledTime: MedicationTime | null;
      moodAfter?: MoodAfter | null;
      anxietyAfter?: number | null;
      sleepiness?: number | null;
      sideEffects?: string;
      didItHelp?: boolean | null;
      notes?: string;
    }) => medicationService.logMedication(params),
    onSuccess: (newLog) => {
      setLogs(prev => [newLog, ...prev]);
      void queryClient.invalidateQueries({ queryKey: ['medications'] });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (id: string) => medicationService.toggleMedicationActive(id),
    onSuccess: (result) => {
      if (result) {
        const updated = medications.map(m => m.id === result.id ? result : m);
        setMedications(updated);
        void medicationReminderService.syncReminders(updated);
        void queryClient.invalidateQueries({ queryKey: ['medications'] });
      }
    },
  });

  const updateMedication = useCallback(
    (id: string, updates: Partial<Medication>) =>
      updateMedicationMutation.mutateAsync({ id, updates }),
    [updateMedicationMutation],
  );

  const activeMedications = useMemo(() => medications.filter(m => m.active), [medications]);
  const inactiveMedications = useMemo(() => medications.filter(m => !m.active), [medications]);

  const dueMedications = useMemo(
    () => medicationService.getDueMedications(medications, logs),
    [medications, logs],
  );

  const todayLogs = useMemo(() => medicationService.getTodayLogs(logs), [logs]);

  const overallAdherence = useMemo(
    () => medicationService.getAdherenceRate(logs),
    [logs],
  );

  const getMedicationById = useCallback(
    (id: string) => medications.find(m => m.id === id) ?? null,
    [medications],
  );

  const getLogsForMedication = useCallback(
    (medicationId: string) => logs.filter(l => l.medicationId === medicationId),
    [logs],
  );

  const getAdherenceRate = useCallback(
    (medicationId?: string, days?: number) =>
      medicationService.getAdherenceRate(logs, medicationId, days),
    [logs],
  );

  const getStreak = useCallback(
    (medicationId: string) => medicationService.getStreakDays(logs, medicationId),
    [logs],
  );

  return useMemo(() => ({
    medications,
    logs,
    activeMedications,
    inactiveMedications,
    dueMedications,
    todayLogs,
    overallAdherence,
    isLoading: stateQuery.isLoading,
    addMedication: addMedicationMutation.mutateAsync,
    updateMedication,
    deleteMedication: deleteMedicationMutation.mutateAsync,
    toggleActive: toggleActiveMutation.mutateAsync,
    logMedication: logMedicationMutation.mutateAsync,
    isAddingMedication: addMedicationMutation.isPending,
    isLogging: logMedicationMutation.isPending,
    getMedicationById,
    getLogsForMedication,
    getAdherenceRate,
    getStreak,
  }), [
    medications, logs, activeMedications, inactiveMedications,
    dueMedications, todayLogs, overallAdherence, stateQuery.isLoading,
    addMedicationMutation.mutateAsync, addMedicationMutation.isPending,
    updateMedication, deleteMedicationMutation.mutateAsync,
    toggleActiveMutation.mutateAsync, logMedicationMutation.mutateAsync,
    logMedicationMutation.isPending, getMedicationById, getLogsForMedication,
    getAdherenceRate, getStreak,
  ]);
});
