import {
  MovementEntry,
  MovementType,
  MovementIntensity,
  MoodLevel,
} from '@/types/movement';
import { movementRepository } from '@/services/repositories';

function generateId(): string {
  return `mov_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

class MovementService {
  async addEntry(params: {
    type: MovementType;
    customType?: string;
    duration: number;
    intensity: MovementIntensity;
    moodBefore: MoodLevel;
    moodAfter: MoodLevel;
    notes: string;
  }): Promise<MovementEntry> {
    const now = Date.now();
    const entry: MovementEntry = {
      id: generateId(),
      type: params.type,
      customType: params.customType,
      duration: params.duration,
      intensity: params.intensity,
      moodBefore: params.moodBefore,
      moodAfter: params.moodAfter,
      notes: params.notes,
      timestamp: now,
      createdAt: now,
    };

    const state = await movementRepository.getState();
    state.entries.unshift(entry);
    await movementRepository.saveState(state);

    console.log('[MovementService] Added entry:', entry.type, entry.duration, 'min');
    return entry;
  }

  async updateEntry(id: string, updates: Partial<MovementEntry>): Promise<MovementEntry | null> {
    const state = await movementRepository.getState();
    const idx = state.entries.findIndex((e: MovementEntry) => e.id === id);
    if (idx === -1) return null;

    state.entries[idx] = { ...state.entries[idx], ...updates };
    await movementRepository.saveState(state);

    console.log('[MovementService] Updated entry:', id);
    return state.entries[idx];
  }

  async deleteEntry(id: string): Promise<void> {
    const state = await movementRepository.getState();
    state.entries = state.entries.filter((e: MovementEntry) => e.id !== id);
    await movementRepository.saveState(state);
    console.log('[MovementService] Deleted entry:', id);
  }

  getTodayEntries(entries: MovementEntry[]): MovementEntry[] {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return entries.filter(e => e.timestamp >= todayStart.getTime());
  }

  getWeekEntries(entries: MovementEntry[]): MovementEntry[] {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return entries.filter(e => e.timestamp >= weekAgo);
  }

  getTotalMinutesToday(entries: MovementEntry[]): number {
    return this.getTodayEntries(entries).reduce((sum, e) => sum + e.duration, 0);
  }

  getTotalMinutesWeek(entries: MovementEntry[]): number {
    return this.getWeekEntries(entries).reduce((sum, e) => sum + e.duration, 0);
  }

  getAverageMoodShift(entries: MovementEntry[], days: number = 30): number {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const recent = entries.filter(e => e.timestamp >= cutoff);
    if (recent.length === 0) return 0;
    const totalShift = recent.reduce((sum, e) => sum + (e.moodAfter - e.moodBefore), 0);
    return Math.round((totalShift / recent.length) * 10) / 10;
  }

  getEntriesByType(entries: MovementEntry[]): Record<MovementType, number> {
    const counts: Record<string, number> = {};
    entries.forEach(e => {
      counts[e.type] = (counts[e.type] ?? 0) + 1;
    });
    return counts as Record<MovementType, number>;
  }

  getStreakDays(entries: MovementEntry[]): number {
    if (entries.length === 0) return 0;
    const sorted = [...entries].sort((a, b) => b.timestamp - a.timestamp);
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 365; i++) {
      const dayStart = new Date(today);
      dayStart.setDate(dayStart.getDate() - i);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const hasEntry = sorted.some(
        e => e.timestamp >= dayStart.getTime() && e.timestamp < dayEnd.getTime()
      );

      if (hasEntry) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }

    return streak;
  }

  getMoodImpactSummary(entries: MovementEntry[], days: number = 30): {
    improved: number;
    same: number;
    declined: number;
    total: number;
  } {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const recent = entries.filter(e => e.timestamp >= cutoff);
    let improved = 0;
    let same = 0;
    let declined = 0;

    recent.forEach(e => {
      const diff = e.moodAfter - e.moodBefore;
      if (diff > 0) improved++;
      else if (diff < 0) declined++;
      else same++;
    });

    return { improved, same, declined, total: recent.length };
  }
}

export const movementService = new MovementService();
