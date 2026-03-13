import { AppointmentState, DEFAULT_APPOINTMENT_STATE, Appointment } from '@/types/appointment';
import { IStorageService } from '@/services/storage/storageService';

const APPOINTMENT_KEY = 'bpd_appointments';

export interface IAppointmentRepository {
  getState(): Promise<AppointmentState>;
  saveState(state: AppointmentState): Promise<void>;
  getAppointments(): Promise<Appointment[]>;
}

export class LocalAppointmentRepository implements IAppointmentRepository {
  constructor(private storage: IStorageService) {}

  async getState(): Promise<AppointmentState> {
    const data = await this.storage.get<AppointmentState>(APPOINTMENT_KEY);
    console.log('[AppointmentRepository] Loaded state:', data?.appointments?.length ?? 0, 'appointments');
    return data ?? { ...DEFAULT_APPOINTMENT_STATE };
  }

  async saveState(state: AppointmentState): Promise<void> {
    await this.storage.set(APPOINTMENT_KEY, state);
    console.log('[AppointmentRepository] Saved state:', state.appointments.length, 'appointments');
  }

  async getAppointments(): Promise<Appointment[]> {
    const state = await this.getState();
    return state.appointments;
  }
}
