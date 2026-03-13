import { MedicationState, DEFAULT_MEDICATION_STATE, Medication, MedicationLog } from '@/types/medication';
import { IStorageService } from '@/services/storage/storageService';

const MEDICATION_KEY = 'bpd_medications';

export interface IMedicationRepository {
  getState(): Promise<MedicationState>;
  saveState(state: MedicationState): Promise<void>;
  getMedications(): Promise<Medication[]>;
  saveMedications(medications: Medication[]): Promise<void>;
  getLogs(): Promise<MedicationLog[]>;
  saveLogs(logs: MedicationLog[]): Promise<void>;
}

export class LocalMedicationRepository implements IMedicationRepository {
  constructor(private storage: IStorageService) {}

  async getState(): Promise<MedicationState> {
    const data = await this.storage.get<MedicationState>(MEDICATION_KEY);
    console.log('[MedicationRepository] Loaded state:', data?.medications?.length ?? 0, 'medications,', data?.logs?.length ?? 0, 'logs');
    return data ?? { ...DEFAULT_MEDICATION_STATE };
  }

  async saveState(state: MedicationState): Promise<void> {
    await this.storage.set(MEDICATION_KEY, state);
    console.log('[MedicationRepository] Saved state:', state.medications.length, 'medications,', state.logs.length, 'logs');
  }

  async getMedications(): Promise<Medication[]> {
    const state = await this.getState();
    return state.medications;
  }

  async saveMedications(medications: Medication[]): Promise<void> {
    const state = await this.getState();
    await this.saveState({ ...state, medications });
  }

  async getLogs(): Promise<MedicationLog[]> {
    const state = await this.getState();
    return state.logs;
  }

  async saveLogs(logs: MedicationLog[]): Promise<void> {
    const state = await this.getState();
    await this.saveState({ ...state, logs });
  }
}
