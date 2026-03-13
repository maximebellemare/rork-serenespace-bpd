import { notificationService } from './notificationService';
import { NotificationSettings } from '@/types/notifications';
import { JournalEntry } from '@/types';

class NotificationScheduler {
  async syncReminders(settings: NotificationSettings): Promise<void> {
    console.log('[NotificationScheduler] Syncing reminders with settings');

    await this.syncDailyCheckIn(settings);
    await this.syncWeeklyReflection(settings);

    console.log('[NotificationScheduler] Sync complete');
  }

  private async syncDailyCheckIn(settings: NotificationSettings): Promise<void> {
    await notificationService.cancelAllByCategory('daily_checkin');

    if (!settings.dailyCheckInReminder) {
      console.log('[NotificationScheduler] Daily check-in reminder disabled');
      return;
    }

    const [hourStr, minuteStr] = settings.checkInReminderTime.split(':');
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);

    await notificationService.scheduleDailyReminder(
      hour,
      minute,
      'Time to check in',
      'Take a moment to check in with yourself.',
      'daily_checkin',
    );

    await notificationService.recordEvent({
      category: 'daily_checkin',
      title: 'Time to check in',
      body: 'Take a moment to check in with yourself.',
    });
  }

  private async syncWeeklyReflection(settings: NotificationSettings): Promise<void> {
    await notificationService.cancelAllByCategory('weekly_reflection');

    if (!settings.weeklyReflectionReminder) {
      console.log('[NotificationScheduler] Weekly reflection reminder disabled');
      return;
    }

    await notificationService.scheduleWeeklyReminder(
      1,
      10,
      0,
      'Your weekly reflection is ready',
      'Look back on this week with compassion and curiosity.',
      'weekly_reflection',
    );

    await notificationService.recordEvent({
      category: 'weekly_reflection',
      title: 'Your weekly reflection is ready',
      body: 'Look back on this week with compassion and curiosity.',
    });
  }

  async scheduleRegulationFollowUp(
    distressLevel: number,
    enabled: boolean,
  ): Promise<void> {
    if (!enabled) return;

    if (distressLevel < 6) return;

    const delayHours = distressLevel >= 8 ? 2 : 3;
    const delaySec = delayHours * 60 * 60;

    await notificationService.scheduleReminder(
      'regulation_followup',
      'How are you feeling now?',
      'Things felt intense earlier. You showed up for yourself — how are you now?',
      delaySec,
      false,
      { originalDistress: String(distressLevel) },
    );

    await notificationService.recordEvent({
      category: 'regulation_followup',
      title: 'How are you feeling now?',
      body: 'Things felt intense earlier. You showed up for yourself — how are you now?',
    });

    console.log('[NotificationScheduler] Regulation follow-up scheduled in', delayHours, 'hours');
  }

  async scheduleRelationshipSupport(
    enabled: boolean,
    recentRelTrigger: boolean,
    recentRewriteCount: number,
  ): Promise<void> {
    if (!enabled) return;

    const shouldNudge = recentRelTrigger || recentRewriteCount >= 2;
    if (!shouldNudge) return;

    const messages = [
      {
        title: 'A gentle pause',
        body: 'You might benefit from slowing down before responding.',
      },
      {
        title: 'Relationship support',
        body: 'Communication stress can be intense. The Copilot is here if you need it.',
      },
      {
        title: 'Before you respond',
        body: 'A short pause may help protect what matters to you right now.',
      },
    ];

    const msg = messages[Math.floor(Math.random() * messages.length)];

    const delaySec = 30 * 60;

    await notificationService.scheduleReminder(
      'relationship_support',
      msg.title,
      msg.body,
      delaySec,
      false,
      { trigger: recentRelTrigger ? 'relationship_trigger' : 'rewrite_activity' },
    );

    await notificationService.recordEvent({
      category: 'relationship_support',
      title: msg.title,
      body: msg.body,
    });

    console.log('[NotificationScheduler] Relationship support reminder scheduled');
  }

  async scheduleEveningCheckInNudge(
    entries: JournalEntry[],
    enabled: boolean,
  ): Promise<void> {
    if (!enabled) return;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const hasCheckedInToday = entries.some(
      e => e.timestamp >= todayStart.getTime(),
    );

    if (hasCheckedInToday) {
      console.log('[NotificationScheduler] User already checked in today');
      return;
    }

    const now = new Date();
    const eveningHour = 20;

    if (now.getHours() >= eveningHour) {
      await notificationService.scheduleReminder(
        'gentle_nudge',
        'End-of-day check-in',
        'You haven\'t checked in today. Even a quick one can help.',
        60 * 5,
        false,
      );

      await notificationService.recordEvent({
        category: 'gentle_nudge',
        title: 'End-of-day check-in',
        body: 'You haven\'t checked in today. Even a quick one can help.',
      });

      console.log('[NotificationScheduler] Evening nudge scheduled');
    }
  }

  async cancelAllReminders(): Promise<void> {
    await notificationService.cancelAll();
    console.log('[NotificationScheduler] All reminders cancelled');
  }
}

export const notificationScheduler = new NotificationScheduler();
