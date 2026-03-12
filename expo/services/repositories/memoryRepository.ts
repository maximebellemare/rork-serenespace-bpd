import { MemoryProfile } from '@/types/memory';
import { IMemoryRepository } from './types';
import { IStorageService } from '@/services/storage/storageService';

const MEMORY_PROFILE_KEY = 'bpd_memory_profile';
const MEMORY_UPDATED_KEY = 'bpd_memory_updated_at';

export class LocalMemoryRepository implements IMemoryRepository {
  constructor(private storage: IStorageService) {}

  async getProfile(): Promise<MemoryProfile | null> {
    const data = await this.storage.get<MemoryProfile>(MEMORY_PROFILE_KEY);
    console.log('[MemoryRepository] Loaded memory profile:', data ? 'exists' : 'null');
    return data;
  }

  async saveProfile(profile: MemoryProfile): Promise<void> {
    await this.storage.set(MEMORY_PROFILE_KEY, profile);
    await this.storage.set(MEMORY_UPDATED_KEY, Date.now());
    console.log('[MemoryRepository] Saved memory profile');
  }

  async getLastUpdated(): Promise<number | null> {
    const timestamp = await this.storage.get<number>(MEMORY_UPDATED_KEY);
    return timestamp;
  }

  async clear(): Promise<void> {
    await this.storage.remove(MEMORY_PROFILE_KEY);
    await this.storage.remove(MEMORY_UPDATED_KEY);
    console.log('[MemoryRepository] Cleared memory profile');
  }
}
