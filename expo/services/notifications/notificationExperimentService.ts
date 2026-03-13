import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ExperimentId,
  VariantId,
  ExperimentDefinition,
  ExperimentAssignment,
  ExperimentEvent,
  ExperimentSummary,
  VariantPerformance,
} from '@/types/notificationExperiment';
import { NotificationCategory } from '@/types/notifications';

const ASSIGNMENTS_KEY = 'bpd_experiment_assignments';
const EVENTS_KEY = 'bpd_experiment_events';
const MAX_EVENTS = 500;

export const EXPERIMENT_DEFINITIONS: ExperimentDefinition[] = [
  {
    id: 'daily_checkin_copy',
    label: 'Daily Check-in Copy',
    category: 'daily_checkin',
    description: 'Testing warmer vs direct check-in reminder wording',
    safetyExempt: false,
    variants: [
      {
        id: 'A',
        label: 'Warm / reflective',
        copy: { title: 'A moment for you', body: 'Take a moment to check in with yourself.' },
      },
      {
        id: 'B',
        label: 'Direct / simple',
        copy: { title: 'How are you today?', body: 'A quick check-in can bring clarity to your day.' },
      },
    ],
  },
  {
    id: 'weekly_reflection_copy',
    label: 'Weekly Reflection Copy',
    category: 'weekly_reflection',
    description: 'Testing narrative vs straightforward reflection reminder',
    safetyExempt: false,
    variants: [
      {
        id: 'A',
        label: 'Narrative',
        copy: { title: 'Your week has a story', body: 'Take a moment to notice it with compassion.' },
      },
      {
        id: 'B',
        label: 'Straightforward',
        copy: { title: 'Weekly reflection is ready', body: 'A calm look back at your emotional week is waiting.' },
      },
    ],
  },
  {
    id: 'calm_followup_timing',
    label: 'Calm Follow-up Timing',
    category: 'calm_followup',
    description: 'Testing 2-hour vs 4-hour delay after distress',
    safetyExempt: false,
    variants: [
      {
        id: 'A',
        label: '2-hour delay',
        timingDelaySeconds: 2 * 60 * 60,
        copy: { title: 'How are you now?', body: 'Things felt intense earlier. A calmer space is here when you need it.' },
      },
      {
        id: 'B',
        label: '4-hour delay',
        timingDelaySeconds: 4 * 60 * 60,
        copy: { title: 'Checking in with you', body: 'You showed up for yourself earlier. How are things now?' },
      },
    ],
  },
  {
    id: 'relationship_support_tone',
    label: 'Relationship Support Tone',
    category: 'relationship_support',
    description: 'Testing gentle pause vs protective framing',
    safetyExempt: false,
    variants: [
      {
        id: 'A',
        label: 'Gentle pause',
        copy: { title: 'A gentle pause', body: 'You might benefit from slowing down before responding.' },
      },
      {
        id: 'B',
        label: 'Protective framing',
        copy: { title: 'Before you respond', body: 'A short pause may help protect what matters to you right now.' },
      },
    ],
  },
  {
    id: 'premium_reminder_tone',
    label: 'Premium Reminder Tone',
    category: 'premium_reflection',
    description: 'Testing insight-focused vs benefit-focused premium copy',
    safetyExempt: true,
    variants: [
      {
        id: 'A',
        label: 'Insight-focused',
        copy: { title: 'New insight available', body: 'A deeper look at your emotional patterns is ready.' },
      },
      {
        id: 'B',
        label: 'Benefit-focused',
        copy: { title: 'Understand yourself better', body: 'Your emotional data reveals something worth noticing.' },
      },
    ],
  },
  {
    id: 'ritual_reminder_copy',
    label: 'Ritual Reminder Copy',
    category: 'ritual_reminder',
    description: 'Testing reset framing vs rhythm framing',
    safetyExempt: false,
    variants: [
      {
        id: 'A',
        label: 'Reset framing',
        copy: { title: 'Your daily ritual', body: 'A small reset could help right now.' },
      },
      {
        id: 'B',
        label: 'Rhythm framing',
        copy: { title: 'Keep your rhythm', body: 'One minute for your ritual can ground your whole day.' },
      },
    ],
  },
  {
    id: 'reengagement_copy',
    label: 'Re-engagement Copy',
    category: 'reengagement',
    description: 'Testing welcoming vs space-available framing',
    safetyExempt: false,
    variants: [
      {
        id: 'A',
        label: 'Space available',
        copy: { title: 'A calmer space is here', body: 'Whenever you need it, this space is waiting for you.' },
      },
      {
        id: 'B',
        label: 'Welcome back',
        copy: { title: 'Welcome back', body: 'No pressure. Just a reminder that support is here.' },
      },
    ],
  },
];

class NotificationExperimentService {
  private assignments: Map<ExperimentId, ExperimentAssignment> = new Map();
  private events: ExperimentEvent[] = [];
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    try {
      const [storedAssignments, storedEvents] = await Promise.all([
        AsyncStorage.getItem(ASSIGNMENTS_KEY),
        AsyncStorage.getItem(EVENTS_KEY),
      ]);

      if (storedAssignments) {
        const parsed: ExperimentAssignment[] = JSON.parse(storedAssignments);
        for (const a of parsed) {
          this.assignments.set(a.experimentId, a);
        }
      }

      if (storedEvents) {
        this.events = JSON.parse(storedEvents);
      }

      this.initialized = true;
      console.log('[NotificationExperiment] Initialized with', this.assignments.size, 'assignments,', this.events.length, 'events');
    } catch (error) {
      console.error('[NotificationExperiment] Init error:', error);
      this.initialized = true;
    }
  }

  getAssignment(experimentId: ExperimentId): VariantId {
    const existing = this.assignments.get(experimentId);
    if (existing) return existing.variantId;

    const variantId: VariantId = Math.random() < 0.5 ? 'A' : 'B';
    const assignment: ExperimentAssignment = {
      experimentId,
      variantId,
      assignedAt: Date.now(),
    };
    this.assignments.set(experimentId, assignment);
    void this.persistAssignments();
    console.log('[NotificationExperiment] Assigned', experimentId, '→', variantId);
    return variantId;
  }

  getDefinition(experimentId: ExperimentId): ExperimentDefinition | undefined {
    return EXPERIMENT_DEFINITIONS.find(d => d.id === experimentId);
  }

  getDefinitionForCategory(category: NotificationCategory): ExperimentDefinition | undefined {
    return EXPERIMENT_DEFINITIONS.find(d => d.category === category);
  }

  async recordEvent(
    experimentId: ExperimentId,
    eventType: ExperimentEvent['eventType'],
    metadata?: Record<string, string | number | boolean>,
  ): Promise<void> {
    const variantId = this.getAssignment(experimentId);
    const definition = this.getDefinition(experimentId);

    const event: ExperimentEvent = {
      experimentId,
      variantId,
      category: definition?.category ?? 'daily_checkin',
      eventType,
      timestamp: Date.now(),
      metadata,
    };

    this.events.push(event);
    if (this.events.length > MAX_EVENTS) {
      this.events = this.events.slice(-MAX_EVENTS);
    }

    void this.persistEvents();
    console.log('[NotificationExperiment] Event:', experimentId, variantId, eventType);
  }

  getExperimentSummary(experimentId: ExperimentId): ExperimentSummary | null {
    const definition = this.getDefinition(experimentId);
    if (!definition) return null;

    const experimentEvents = this.events.filter(e => e.experimentId === experimentId);

    const buildVariantPerf = (vId: VariantId): VariantPerformance => {
      const vEvents = experimentEvents.filter(e => e.variantId === vId);
      const sent = vEvents.filter(e => e.eventType === 'sent').length;
      const opened = vEvents.filter(e => e.eventType === 'opened').length;
      const flowStarted = vEvents.filter(e => e.eventType === 'flow_started').length;
      const flowCompleted = vEvents.filter(e => e.eventType === 'flow_completed').length;
      const bounced = vEvents.filter(e => e.eventType === 'bounced').length;

      return {
        variantId: vId,
        sentCount: sent,
        openedCount: opened,
        flowStartedCount: flowStarted,
        flowCompletedCount: flowCompleted,
        bouncedCount: bounced,
        openRate: sent > 0 ? opened / sent : 0,
        completionRate: opened > 0 ? flowCompleted / opened : 0,
      };
    };

    const perfA = buildVariantPerf('A');
    const perfB = buildVariantPerf('B');

    const totalSent = perfA.sentCount + perfB.sentCount;
    let confidence: 'low' | 'medium' | 'high' = 'low';
    if (totalSent >= 30) confidence = 'high';
    else if (totalSent >= 10) confidence = 'medium';

    let winningVariant: VariantId | null = null;
    if (totalSent >= 5) {
      if (perfA.openRate > perfB.openRate && perfA.completionRate >= perfB.completionRate) {
        winningVariant = 'A';
      } else if (perfB.openRate > perfA.openRate && perfB.completionRate >= perfA.completionRate) {
        winningVariant = 'B';
      }
    }

    return {
      experimentId,
      label: definition.label,
      category: definition.category,
      totalEvents: experimentEvents.length,
      variants: [perfA, perfB],
      winningVariant,
      confidence,
    };
  }

  getAllSummaries(): ExperimentSummary[] {
    const summaries: ExperimentSummary[] = [];
    for (const def of EXPERIMENT_DEFINITIONS) {
      const summary = this.getExperimentSummary(def.id);
      if (summary) summaries.push(summary);
    }
    return summaries;
  }

  getAllAssignments(): ExperimentAssignment[] {
    return Array.from(this.assignments.values());
  }

  getRecentEvents(limit: number = 30): ExperimentEvent[] {
    return [...this.events].sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
  }

  async resetAll(): Promise<void> {
    this.assignments.clear();
    this.events = [];
    await Promise.all([
      AsyncStorage.removeItem(ASSIGNMENTS_KEY),
      AsyncStorage.removeItem(EVENTS_KEY),
    ]);
    console.log('[NotificationExperiment] Reset all experiments');
  }

  async resetExperiment(experimentId: ExperimentId): Promise<void> {
    this.assignments.delete(experimentId);
    this.events = this.events.filter(e => e.experimentId !== experimentId);
    await Promise.all([
      this.persistAssignments(),
      this.persistEvents(),
    ]);
    console.log('[NotificationExperiment] Reset experiment:', experimentId);
  }

  private async persistAssignments(): Promise<void> {
    try {
      const arr = Array.from(this.assignments.values());
      await AsyncStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(arr));
    } catch (error) {
      console.error('[NotificationExperiment] Persist assignments error:', error);
    }
  }

  private async persistEvents(): Promise<void> {
    try {
      await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(this.events));
    } catch (error) {
      console.error('[NotificationExperiment] Persist events error:', error);
    }
  }
}

export const notificationExperimentService = new NotificationExperimentService();
