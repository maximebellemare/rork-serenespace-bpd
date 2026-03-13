import { MovementState, MovementEntry, DEFAULT_MOVEMENT_STATE } from '@/types/movement';
import { IStorageService } from '@/services/storage/storageService';

const MOVEMENT_KEY = 'bpd_movement';

export interface IMovementRepository {
  getState(): Promise<MovementState>;
  saveState(state: MovementState): Promise<void>;
  getEntries(): Promise<MovementEntry[]>;
  saveEntries(entries: MovementEntry[]): Promise<void>;
}

export class LocalMovementRepository implements IMovementRepository {
  constructor(private storage: IStorageService) {}

  async getState(): Promise<MovementState> {
    const data = await this.storage.get<MovementState>(MOVEMENT_KEY);
    console.log('[MovementRepository] Loaded state:', data?.entries?.length ?? 0, 'entries');
    return data ?? { ...DEFAULT_MOVEMENT_STATE };
  }

  async saveState(state: MovementState): Promise<void> {
    await this.storage.set(MOVEMENT_KEY, state);
    console.log('[MovementRepository] Saved state:', state.entries.length, 'entries');
  }

  async getEntries(): Promise<MovementEntry[]> {
    const state = await this.getState();
    return state.entries;
  }

  async saveEntries(entries: MovementEntry[]): Promise<void> {
    const state = await this.getState();
    await this.saveState({ ...state, entries });
  }
}
