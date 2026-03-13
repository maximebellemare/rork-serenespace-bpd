import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import {
  Appointment,
  PreSessionNotes,
  PostSessionNotes,
} from '@/types/appointment';
import { appointmentRepository } from '@/services/repositories';
import { appointmentService } from '@/services/appointments/appointmentService';
import { appointmentReminderService } from '@/services/appointments/appointmentReminderService';

export const [AppointmentProvider, useAppointments] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const stateQuery = useQuery({
    queryKey: ['appointments'],
    queryFn: () => appointmentRepository.getState(),
  });

  useEffect(() => {
    if (stateQuery.data) {
      setAppointments(stateQuery.data.appointments);
    }
  }, [stateQuery.data]);

  const addAppointmentMutation = useMutation({
    mutationFn: (appt: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt' | 'completed' | 'preSessionNotes' | 'postSessionNotes'>) =>
      appointmentService.addAppointment(appt),
    onSuccess: (newAppt) => {
      const updated = [newAppt, ...appointments];
      setAppointments(updated);
      void appointmentReminderService.syncReminders(updated);
      void queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });

  const updateAppointmentMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Appointment> }) =>
      appointmentService.updateAppointment(id, updates),
    onSuccess: (result) => {
      if (result) {
        const updated = appointments.map(a => a.id === result.id ? result : a);
        setAppointments(updated);
        void appointmentReminderService.syncReminders(updated);
        void queryClient.invalidateQueries({ queryKey: ['appointments'] });
      }
    },
  });

  const deleteAppointmentMutation = useMutation({
    mutationFn: (id: string) => appointmentService.deleteAppointment(id),
    onSuccess: (_, id) => {
      const updated = appointments.filter(a => a.id !== id);
      setAppointments(updated);
      void appointmentReminderService.syncReminders(updated);
      void queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });

  const savePreSessionMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: PreSessionNotes }) =>
      appointmentService.savePreSessionNotes(id, notes),
    onSuccess: (result) => {
      if (result) {
        const updated = appointments.map(a => a.id === result.id ? result : a);
        setAppointments(updated);
        void queryClient.invalidateQueries({ queryKey: ['appointments'] });
      }
    },
  });

  const savePostSessionMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: PostSessionNotes }) =>
      appointmentService.savePostSessionNotes(id, notes),
    onSuccess: (result) => {
      if (result) {
        const updated = appointments.map(a => a.id === result.id ? result : a);
        setAppointments(updated);
        void queryClient.invalidateQueries({ queryKey: ['appointments'] });
      }
    },
  });

  const markCompletedMutation = useMutation({
    mutationFn: (id: string) => appointmentService.markCompleted(id),
    onSuccess: (result) => {
      if (result) {
        const updated = appointments.map(a => a.id === result.id ? result : a);
        setAppointments(updated);
        void queryClient.invalidateQueries({ queryKey: ['appointments'] });
      }
    },
  });

  const updateAppointment = useCallback(
    (id: string, updates: Partial<Appointment>) =>
      updateAppointmentMutation.mutateAsync({ id, updates }),
    [updateAppointmentMutation],
  );

  const upcomingAppointments = useMemo(
    () => appointmentService.getUpcomingAppointments(appointments),
    [appointments],
  );

  const todayAppointments = useMemo(
    () => appointmentService.getTodayAppointments(appointments),
    [appointments],
  );

  const pastAppointments = useMemo(
    () => appointmentService.getPastAppointments(appointments),
    [appointments],
  );

  const nextAppointment = useMemo(
    () => appointmentService.getNextAppointment(appointments),
    [appointments],
  );

  const needsPostSession = useMemo(
    () => appointmentService.getNeedsPostSession(appointments),
    [appointments],
  );

  const needsPreSession = useMemo(
    () => appointmentService.getNeedsPreSession(appointments),
    [appointments],
  );

  const getAppointmentById = useCallback(
    (id: string) => appointments.find(a => a.id === id) ?? null,
    [appointments],
  );

  const savePreSession = useCallback(
    (id: string, notes: PreSessionNotes) =>
      savePreSessionMutation.mutateAsync({ id, notes }),
    [savePreSessionMutation],
  );

  const savePostSession = useCallback(
    (id: string, notes: PostSessionNotes) =>
      savePostSessionMutation.mutateAsync({ id, notes }),
    [savePostSessionMutation],
  );

  return useMemo(() => ({
    appointments,
    upcomingAppointments,
    todayAppointments,
    pastAppointments,
    nextAppointment,
    needsPostSession,
    needsPreSession,
    isLoading: stateQuery.isLoading,
    addAppointment: addAppointmentMutation.mutateAsync,
    updateAppointment,
    deleteAppointment: deleteAppointmentMutation.mutateAsync,
    savePreSessionNotes: savePreSession,
    savePostSessionNotes: savePostSession,
    markCompleted: markCompletedMutation.mutateAsync,
    isAdding: addAppointmentMutation.isPending,
    isSavingPreSession: savePreSessionMutation.isPending,
    isSavingPostSession: savePostSessionMutation.isPending,
    getAppointmentById,
  }), [
    appointments, upcomingAppointments, todayAppointments, pastAppointments,
    nextAppointment, needsPostSession, needsPreSession, stateQuery.isLoading,
    addAppointmentMutation.mutateAsync, addAppointmentMutation.isPending,
    updateAppointment, deleteAppointmentMutation.mutateAsync,
    savePreSession, savePostSession,
    savePreSessionMutation.isPending, savePostSessionMutation.isPending,
    markCompletedMutation.mutateAsync, getAppointmentById,
  ]);
});
