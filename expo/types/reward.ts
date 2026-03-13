export type RewardCategory =
  | 'check_in'
  | 'journaling'
  | 'pause_win'
  | 'reflection'
  | 'therapy_prep'
  | 'medication'
  | 'companion'
  | 'support_before_reaction'
  | 'appointment'
  | 'movement'
  | 'consistency';

export type MilestoneLevel = 'bronze' | 'silver' | 'gold';

export interface MilestoneDefinition {
  id: string;
  title: string;
  description: string;
  category: RewardCategory;
  threshold: number;
  level: MilestoneLevel;
  icon: string;
  celebrationMessage: string;
}

export interface UnlockedMilestone {
  milestoneId: string;
  unlockedAt: number;
  seen: boolean;
}

export interface ConsistencyMetrics {
  checkInDays: number;
  journalDays: number;
  pauseWins: number;
  weeklyReflections: number;
  therapyPreps: number;
  medicationAdherenceDays: number;
  companionSessions: number;
  supportBeforeReaction: number;
  appointmentsAttended: number;
  currentCheckInStreak: number;
  currentJournalStreak: number;
}

export interface RewardState {
  unlockedMilestones: UnlockedMilestone[];
  metrics: ConsistencyMetrics;
  lastComputedAt: number;
}

export const DEFAULT_CONSISTENCY_METRICS: ConsistencyMetrics = {
  checkInDays: 0,
  journalDays: 0,
  pauseWins: 0,
  weeklyReflections: 0,
  therapyPreps: 0,
  medicationAdherenceDays: 0,
  companionSessions: 0,
  supportBeforeReaction: 0,
  appointmentsAttended: 0,
  currentCheckInStreak: 0,
  currentJournalStreak: 0,
};

export const DEFAULT_REWARD_STATE: RewardState = {
  unlockedMilestones: [],
  metrics: { ...DEFAULT_CONSISTENCY_METRICS },
  lastComputedAt: 0,
};

export const MILESTONE_DEFINITIONS: MilestoneDefinition[] = [
  {
    id: 'first_checkin',
    title: 'First Step',
    description: 'Completed your first check-in',
    category: 'check_in',
    threshold: 1,
    level: 'bronze',
    icon: 'Heart',
    celebrationMessage: 'You showed up for yourself today.',
  },
  {
    id: 'checkin_3',
    title: '3 Days of Checking In',
    description: 'Checked in on 3 different days',
    category: 'check_in',
    threshold: 3,
    level: 'bronze',
    icon: 'Heart',
    celebrationMessage: 'Three days of showing up. That takes intention.',
  },
  {
    id: 'checkin_7',
    title: 'A Week of Presence',
    description: 'Checked in on 7 different days',
    category: 'check_in',
    threshold: 7,
    level: 'silver',
    icon: 'Heart',
    celebrationMessage: 'A full week of being present with yourself.',
  },
  {
    id: 'checkin_30',
    title: 'Steady Practice',
    description: 'Checked in on 30 different days',
    category: 'check_in',
    threshold: 30,
    level: 'gold',
    icon: 'Heart',
    celebrationMessage: 'Thirty days of consistent self-awareness. That\'s real growth.',
  },
  {
    id: 'first_journal',
    title: 'First Reflection',
    description: 'Wrote your first journal entry',
    category: 'journaling',
    threshold: 1,
    level: 'bronze',
    icon: 'BookOpen',
    celebrationMessage: 'Putting feelings into words is brave.',
  },
  {
    id: 'journal_7',
    title: 'Reflection Streak',
    description: 'Journaled on 7 different days',
    category: 'journaling',
    threshold: 7,
    level: 'silver',
    icon: 'BookOpen',
    celebrationMessage: 'A week of reflection. You\'re building self-understanding.',
  },
  {
    id: 'journal_30',
    title: 'Deep Practice',
    description: 'Journaled on 30 different days',
    category: 'journaling',
    threshold: 30,
    level: 'gold',
    icon: 'BookOpen',
    celebrationMessage: 'Thirty days of writing through it. That\'s profound.',
  },
  {
    id: 'first_pause',
    title: 'First Pause Win',
    description: 'Paused before sending a message',
    category: 'pause_win',
    threshold: 1,
    level: 'bronze',
    icon: 'Shield',
    celebrationMessage: 'You chose to pause. That takes strength.',
  },
  {
    id: 'pause_5',
    title: 'Building the Pause',
    description: 'Paused before sending 5 messages',
    category: 'pause_win',
    threshold: 5,
    level: 'silver',
    icon: 'Shield',
    celebrationMessage: 'Five times you chose pause over impulse.',
  },
  {
    id: 'pause_20',
    title: 'Calm Response Milestone',
    description: 'Paused before sending 20 messages',
    category: 'pause_win',
    threshold: 20,
    level: 'gold',
    icon: 'Shield',
    celebrationMessage: 'Twenty pauses. You\'re rewriting old patterns.',
  },
  {
    id: 'first_reflection',
    title: 'Weekly Check-In',
    description: 'Completed your first weekly reflection',
    category: 'reflection',
    threshold: 1,
    level: 'bronze',
    icon: 'Compass',
    celebrationMessage: 'Looking back helps you move forward.',
  },
  {
    id: 'reflection_4',
    title: 'Month of Reflection',
    description: 'Completed 4 weekly reflections',
    category: 'reflection',
    threshold: 4,
    level: 'silver',
    icon: 'Compass',
    celebrationMessage: 'A month of weekly reflection. Real self-respect.',
  },
  {
    id: 'first_therapy_prep',
    title: 'Therapy Prep',
    description: 'Prepared for a therapy session',
    category: 'therapy_prep',
    threshold: 1,
    level: 'bronze',
    icon: 'FileText',
    celebrationMessage: 'Preparing for sessions shows commitment to your growth.',
  },
  {
    id: 'therapy_prep_5',
    title: 'Therapy Prep Consistency',
    description: 'Prepared for 5 therapy sessions',
    category: 'therapy_prep',
    threshold: 5,
    level: 'silver',
    icon: 'FileText',
    celebrationMessage: 'Five prepared sessions. Your therapist notices this work.',
  },
  {
    id: 'first_med',
    title: 'Medication Consistency',
    description: 'Logged medication on your first day',
    category: 'medication',
    threshold: 1,
    level: 'bronze',
    icon: 'Pill',
    celebrationMessage: 'Taking care of your body supports your mind.',
  },
  {
    id: 'med_7',
    title: 'Week of Adherence',
    description: 'Logged medication on 7 days',
    category: 'medication',
    threshold: 7,
    level: 'silver',
    icon: 'Pill',
    celebrationMessage: 'A full week of medication consistency.',
  },
  {
    id: 'med_30',
    title: 'Steady Foundation',
    description: 'Logged medication on 30 days',
    category: 'medication',
    threshold: 30,
    level: 'gold',
    icon: 'Pill',
    celebrationMessage: 'Thirty days of consistency. That\'s a foundation.',
  },
  {
    id: 'first_companion',
    title: 'First Conversation',
    description: 'Had your first Companion session',
    category: 'companion',
    threshold: 1,
    level: 'bronze',
    icon: 'Sparkles',
    celebrationMessage: 'Reaching out is a skill. You practiced it.',
  },
  {
    id: 'companion_10',
    title: 'Showing Up For Yourself',
    description: 'Completed 10 Companion sessions',
    category: 'companion',
    threshold: 10,
    level: 'silver',
    icon: 'Sparkles',
    celebrationMessage: 'Ten sessions of working through it. That\'s dedication.',
  },
  {
    id: 'first_support_reaction',
    title: 'Support Before Reaction',
    description: 'Used a support tool before reacting',
    category: 'support_before_reaction',
    threshold: 1,
    level: 'bronze',
    icon: 'Anchor',
    celebrationMessage: 'Choosing support over impulse is powerful.',
  },
  {
    id: 'support_reaction_10',
    title: 'New Pattern',
    description: 'Used support tools 10 times before reacting',
    category: 'support_before_reaction',
    threshold: 10,
    level: 'silver',
    icon: 'Anchor',
    celebrationMessage: 'Ten times you chose a different path. That\'s a new pattern.',
  },
  {
    id: 'first_appointment',
    title: 'Keeping Appointments',
    description: 'Attended your first appointment',
    category: 'appointment',
    threshold: 1,
    level: 'bronze',
    icon: 'Calendar',
    celebrationMessage: 'Showing up for your care matters.',
  },
  {
    id: 'appointment_5',
    title: 'Committed to Care',
    description: 'Attended 5 appointments',
    category: 'appointment',
    threshold: 5,
    level: 'silver',
    icon: 'Calendar',
    celebrationMessage: 'Five appointments attended. You\'re investing in yourself.',
  },
  {
    id: 'checkin_streak_3',
    title: '3-Day Streak',
    description: 'Checked in 3 days in a row',
    category: 'consistency',
    threshold: 3,
    level: 'bronze',
    icon: 'Flame',
    celebrationMessage: 'Three days running. Consistency builds stability.',
  },
  {
    id: 'checkin_streak_7',
    title: '7-Day Streak',
    description: 'Checked in 7 days in a row',
    category: 'consistency',
    threshold: 7,
    level: 'silver',
    icon: 'Flame',
    celebrationMessage: 'A full week without missing a day. Remarkable.',
  },
  {
    id: 'checkin_streak_14',
    title: '14-Day Streak',
    description: 'Checked in 14 days in a row',
    category: 'consistency',
    threshold: 14,
    level: 'gold',
    icon: 'Flame',
    celebrationMessage: 'Two weeks of showing up every single day.',
  },
];
