import { RitualState, DailyRitualEntry, RitualStreak } from '@/types/ritual';
import { IStorageService } from '@/services/storage/storageService';

const RITUAL_KEY = 'steady_ritual';

export interface IRitualRepository {
  getState(): Promise<RitualState>;
  saveState(state: RitualState): Promise<void>;
  addEntry(entry: DailyRitualEntry): Promise<RitualState>;
  getEntriesByDateRange(start: number, end: number): Promise<DailyRitualEntry[]>;
}

const DEFAULT_STREAK: RitualStreak = {
  currentStreak: 0,
  longestStreak: 0,
  lastCheckInDate: '',
  totalCheckIns: 0,
};

export class LocalRitualRepository implements IRitualRepository {
  constructor(private storage: IStorageService) {}

  async getState(): Promise<RitualState> {
    const data = await this.storage.get<RitualState>(RITUAL_KEY);
    console.log('[RitualRepository] Loaded state with', data?.entries?.length ?? 0, 'entries');
    return data ?? { entries: [], streak: { ...DEFAULT_STREAK } };
  }

  async saveState(state: RitualState): Promise<void> {
    await this.storage.set(RITUAL_KEY, state);
    console.log('[RitualRepository] Saved state with', state.entries.length, 'entries');
  }

  async addEntry(entry: DailyRitualEntry): Promise<RitualState> {
    const state = await this.getState();
    const updated: RitualState = {
      entries: [entry, ...state.entries],
      streak: this.calculateStreak([entry, ...state.entries]),
    };
    await this.saveState(updated);
    return updated;
  }

  async getEntriesByDateRange(start: number, end: number): Promise<DailyRitualEntry[]> {
    const state = await this.getState();
    return state.entries.filter(e => e.timestamp >= start && e.timestamp <= end);
  }

  private calculateStreak(entries: DailyRitualEntry[]): RitualStreak {
    if (entries.length === 0) {
      return { ...DEFAULT_STREAK };
    }

    const sortedDates = [...new Set(entries.map(e => e.date))].sort().reverse();
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    let currentStreak = 0;
    if (sortedDates[0] === today || sortedDates[0] === yesterday) {
      currentStreak = 1;
      for (let i = 1; i < sortedDates.length; i++) {
        const prevDate = new Date(sortedDates[i - 1]);
        const currDate = new Date(sortedDates[i]);
        const diff = prevDate.getTime() - currDate.getTime();
        if (diff <= 86400000 * 1.5) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    let longestStreak = 1;
    let tempStreak = 1;
    for (let i = 1; i < sortedDates.length; i++) {
      const prevDate = new Date(sortedDates[i - 1]);
      const currDate = new Date(sortedDates[i]);
      const diff = prevDate.getTime() - currDate.getTime();
      if (diff <= 86400000 * 1.5) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 1;
      }
    }

    return {
      currentStreak,
      longestStreak: Math.max(longestStreak, currentStreak),
      lastCheckInDate: sortedDates[0],
      totalCheckIns: entries.length,
    };
  }
}
