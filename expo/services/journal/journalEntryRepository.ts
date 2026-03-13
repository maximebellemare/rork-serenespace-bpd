import { SmartJournalEntry } from '@/types/journalEntry';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'smart_journal_entries';

class JournalEntryRepository {
  async getAll(): Promise<SmartJournalEntry[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const entries = raw ? JSON.parse(raw) : [];
      console.log('[JournalEntryRepo] Loaded', entries.length, 'smart journal entries');
      return entries;
    } catch (error) {
      console.error('[JournalEntryRepo] Failed to load entries:', error);
      return [];
    }
  }

  async save(entries: SmartJournalEntry[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
      console.log('[JournalEntryRepo] Saved', entries.length, 'entries');
    } catch (error) {
      console.error('[JournalEntryRepo] Failed to save:', error);
    }
  }

  async add(entry: SmartJournalEntry): Promise<SmartJournalEntry[]> {
    const entries = await this.getAll();
    const updated = [entry, ...entries];
    await this.save(updated);
    return updated;
  }

  async update(id: string, updates: Partial<SmartJournalEntry>): Promise<SmartJournalEntry[]> {
    const entries = await this.getAll();
    const updated = entries.map(e =>
      e.id === id ? { ...e, ...updates, updatedAt: Date.now() } : e
    );
    await this.save(updated);
    return updated;
  }

  async remove(id: string): Promise<SmartJournalEntry[]> {
    const entries = await this.getAll();
    const updated = entries.filter(e => e.id !== id);
    await this.save(updated);
    return updated;
  }
}

export const journalEntryRepository = new JournalEntryRepository();
