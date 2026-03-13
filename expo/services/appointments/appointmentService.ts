import {
  Appointment,
  PreSessionNotes,
  PostSessionNotes,
  isAppointmentPast,
  isAppointmentToday,
  isAppointmentUpcoming,
} from '@/types/appointment';
import { appointmentRepository } from '@/services/repositories';

function generateId(): string {
  return `appt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

class AppointmentService {
  async addAppointment(
    appointment: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt' | 'completed' | 'preSessionNotes' | 'postSessionNotes'>
  ): Promise<Appointment> {
    const now = Date.now();
    const newAppt: Appointment = {
      ...appointment,
      id: generateId(),
      completed: false,
      preSessionNotes: null,
      postSessionNotes: null,
      createdAt: now,
      updatedAt: now,
    };

    const state = await appointmentRepository.getState();
    state.appointments.unshift(newAppt);
    await appointmentRepository.saveState(state);

    console.log('[AppointmentService] Added appointment:', newAppt.providerName);
    return newAppt;
  }

  async updateAppointment(id: string, updates: Partial<Appointment>): Promise<Appointment | null> {
    const state = await appointmentRepository.getState();
    const idx = state.appointments.findIndex((a: Appointment) => a.id === id);
    if (idx === -1) return null;

    state.appointments[idx] = {
      ...state.appointments[idx],
      ...updates,
      updatedAt: Date.now(),
    };
    await appointmentRepository.saveState(state);

    console.log('[AppointmentService] Updated appointment:', state.appointments[idx].providerName);
    return state.appointments[idx];
  }

  async deleteAppointment(id: string): Promise<void> {
    const state = await appointmentRepository.getState();
    state.appointments = state.appointments.filter((a: Appointment) => a.id !== id);
    await appointmentRepository.saveState(state);
    console.log('[AppointmentService] Deleted appointment:', id);
  }

  async savePreSessionNotes(id: string, notes: PreSessionNotes): Promise<Appointment | null> {
    const state = await appointmentRepository.getState();
    const appt = state.appointments.find((a: Appointment) => a.id === id);
    if (!appt) return null;

    appt.preSessionNotes = notes;
    appt.updatedAt = Date.now();
    await appointmentRepository.saveState(state);

    console.log('[AppointmentService] Saved pre-session notes for:', appt.providerName);
    return appt;
  }

  async savePostSessionNotes(id: string, notes: PostSessionNotes): Promise<Appointment | null> {
    const state = await appointmentRepository.getState();
    const appt = state.appointments.find((a: Appointment) => a.id === id);
    if (!appt) return null;

    appt.postSessionNotes = notes;
    appt.completed = true;
    appt.updatedAt = Date.now();
    await appointmentRepository.saveState(state);

    console.log('[AppointmentService] Saved post-session notes for:', appt.providerName);
    return appt;
  }

  async markCompleted(id: string): Promise<Appointment | null> {
    return this.updateAppointment(id, { completed: true });
  }

  getUpcomingAppointments(appointments: Appointment[]): Appointment[] {
    return appointments
      .filter(a => isAppointmentUpcoming(a) && !a.completed)
      .sort((a, b) => a.dateTime - b.dateTime);
  }

  getTodayAppointments(appointments: Appointment[]): Appointment[] {
    return appointments
      .filter(a => isAppointmentToday(a))
      .sort((a, b) => a.dateTime - b.dateTime);
  }

  getPastAppointments(appointments: Appointment[]): Appointment[] {
    return appointments
      .filter(a => isAppointmentPast(a) || a.completed)
      .sort((a, b) => b.dateTime - a.dateTime);
  }

  getNextAppointment(appointments: Appointment[]): Appointment | null {
    const upcoming = this.getUpcomingAppointments(appointments);
    return upcoming[0] ?? null;
  }

  getNeedsPostSession(appointments: Appointment[]): Appointment[] {
    return appointments.filter(
      a => isAppointmentPast(a) && !a.completed && !a.postSessionNotes
    ).sort((a, b) => b.dateTime - a.dateTime);
  }

  getNeedsPreSession(appointments: Appointment[]): Appointment[] {
    const now = Date.now();
    const twoDaysMs = 2 * 24 * 60 * 60 * 1000;
    return appointments.filter(
      a => !a.completed && !a.preSessionNotes && a.dateTime > now && a.dateTime - now < twoDaysMs
    ).sort((a, b) => a.dateTime - b.dateTime);
  }
}

export const appointmentService = new AppointmentService();
