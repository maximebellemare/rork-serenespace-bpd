import { CheckInEntry } from '@/types';
import { ICheckInRepository } from './types';
import { IStorageService } from '@/services/storage/storageService';

const CHECKINS_KEY = 'bpd_checkins';

export class LocalCheckInRepository implements ICheckInRepository {
  constructor(private storage: IStorageService) {}

  async getAll(): Promise<CheckInEntry[]> {
    const data = await this.storage.get<CheckInEntry[]>(CHECKINS_KEY);
    console.log('[CheckInRepository] Loaded', data?.length ?? 0, 'check-ins');
    return data ?? [];
  }

  async save(entries: CheckInEntry[]): Promise<void> {
    await this.storage.set(CHECKINS_KEY, entries);
    console.log('[CheckInRepository] Saved', entries.length, 'check-ins');
  }

  async add(entry: CheckInEntry): Promise<CheckInEntry[]> {
    const entries = await this.getAll();
    const updated = [entry, ...entries];
    await this.save(updated);
    return updated;
  }

  async getById(id: string): Promise<CheckInEntry | null> {
    const entries = await this.getAll();
    return entries.find(e => e.id === id) ?? null;
  }

  async getByDateRange(start: number, end: number): Promise<CheckInEntry[]> {
    const entries = await this.getAll();
    const filtered = entries.filter(e => e.timestamp >= start && e.timestamp <= end);
    console.log('[CheckInRepository] Found', filtered.length, 'check-ins in date range');
    return filtered;
  }

  async remove(id: string): Promise<CheckInEntry[]> {
    const entries = await this.getAll();
    const updated = entries.filter(e => e.id !== id);
    await this.save(updated);
    return updated;
  }
}
