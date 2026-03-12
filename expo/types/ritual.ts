export interface DailyMood {
  id: string;
  emoji: string;
  label: string;
  color: string;
}

export interface EmotionTag {
  id: string;
  label: string;
  emoji: string;
}

export interface DailyRitualEntry {
  id: string;
  timestamp: number;
  date: string;
  mood: DailyMood;
  emotionTags: EmotionTag[];
  stressLevel: number;
  reflection: string;
  intention: string;
}

export interface RitualStreak {
  currentStreak: number;
  longestStreak: number;
  lastCheckInDate: string;
  totalCheckIns: number;
}

export interface WeeklyReflectionSummary {
  averageMood: string;
  averageStress: number;
  topEmotions: EmotionTag[];
  totalDays: number;
  entries: DailyRitualEntry[];
}

export interface RitualState {
  entries: DailyRitualEntry[];
  streak: RitualStreak;
}
