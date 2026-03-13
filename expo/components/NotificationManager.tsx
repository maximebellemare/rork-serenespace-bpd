import { useNotifications } from '@/hooks/useNotifications';
import { useSmartReminders } from '@/hooks/useSmartReminders';

export default function NotificationManager() {
  useNotifications();
  useSmartReminders();
  return null;
}
