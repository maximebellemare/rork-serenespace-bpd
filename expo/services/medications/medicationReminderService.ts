import { Medication, formatTime } from '@/types/medication';
import { notificationService } from '@/services/notifications/notificationService';

class MedicationReminderService {
  async syncReminders(medications: Medication[]): Promise<void> {
    console.log('[MedicationReminderService] Syncing reminders for', medications.length, 'medications');

    await notificationService.cancelAllByCategory('medication_reminder');

    const activeMeds = medications.filter(m => m.active && m.reminderEnabled && m.schedule !== 'as_needed');

    for (const med of activeMeds) {
      for (const time of med.times) {
        try {
          await notificationService.scheduleDailyReminder(
            time.hour,
            time.minute,
            `Time for ${med.name}`,
            `${med.dosage} — ${time.label}`,
            'medication_reminder' as any,
          );
          console.log('[MedicationReminderService] Scheduled reminder for', med.name, 'at', formatTime(time.hour, time.minute));
        } catch (error) {
          console.log('[MedicationReminderService] Failed to schedule reminder for', med.name, error);
        }
      }
    }

    console.log('[MedicationReminderService] Sync complete');
  }

  async cancelAllReminders(): Promise<void> {
    await notificationService.cancelAllByCategory('medication_reminder');
    console.log('[MedicationReminderService] All medication reminders cancelled');
  }
}

export const medicationReminderService = new MedicationReminderService();
