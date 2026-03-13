import { AnalyticsEvent, AnalyticsFlowState, AnalyticsProviderInterface, AnalyticsUserProperties, RegulationOutcome } from '@/types/analytics';
import { localEventStore } from './localEventStore';

function generateId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function generateSessionId(): string {
  return `ses_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

class AnalyticsEngine {
  private providers: AnalyticsProviderInterface[] = [];
  private sessionId: string = generateSessionId();
  private activeFlows: Map<string, AnalyticsFlowState> = new Map();
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    await localEventStore.initialize();

    for (const provider of this.providers) {
      try {
        await provider.initialize();
        console.log(`[AnalyticsEngine] Provider "${provider.name}" initialized`);
      } catch (error) {
        console.log(`[AnalyticsEngine] Provider "${provider.name}" init failed:`, error);
      }
    }

    this.initialized = true;
    console.log('[AnalyticsEngine] Initialized with', this.providers.length, 'providers');
  }

  registerProvider(provider: AnalyticsProviderInterface): void {
    this.providers.push(provider);
    console.log(`[AnalyticsEngine] Provider "${provider.name}" registered`);
  }

  async trackEvent(
    name: string,
    properties?: Record<string, string | number | boolean>,
  ): Promise<void> {
    const event: AnalyticsEvent = {
      id: generateId(),
      name,
      properties,
      timestamp: Date.now(),
      sessionId: this.sessionId,
    };

    console.log('[Analytics]', name, properties ?? '');

    await localEventStore.addEvent(event);

    for (const provider of this.providers) {
      try {
        await provider.trackEvent(name, properties);
      } catch (error) {
        console.log(`[AnalyticsEngine] Provider "${provider.name}" trackEvent error:`, error);
      }
    }
  }

  async trackScreen(screenName: string): Promise<void> {
    await this.trackEvent('screen_view', { screen: screenName });

    for (const provider of this.providers) {
      try {
        await provider.trackScreen(screenName);
      } catch (error) {
        console.log(`[AnalyticsEngine] Provider "${provider.name}" trackScreen error:`, error);
      }
    }
  }

  async trackFlowStart(flowName: string): Promise<void> {
    const flow: AnalyticsFlowState = {
      flowName,
      startedAt: Date.now(),
      steps: [],
      currentStep: 'started',
      completed: false,
    };
    this.activeFlows.set(flowName, flow);
    await this.trackEvent('flow_start', { flow: flowName });
  }

  async trackFlowStep(flowName: string, stepName: string): Promise<void> {
    const flow = this.activeFlows.get(flowName);
    if (flow) {
      flow.steps.push(stepName);
      flow.currentStep = stepName;
    }
    await this.trackEvent('flow_step', { flow: flowName, step: stepName });
  }

  async trackFlowComplete(flowName: string, properties?: Record<string, string | number | boolean>): Promise<void> {
    const flow = this.activeFlows.get(flowName);
    const duration = flow ? Date.now() - flow.startedAt : 0;
    if (flow) {
      flow.completed = true;
      this.activeFlows.delete(flowName);
    }
    await this.trackEvent('flow_complete', {
      flow: flowName,
      duration_ms: duration,
      step_count: flow?.steps.length ?? 0,
      ...properties,
    });
  }

  async trackRegulationOutcome(outcome: RegulationOutcome): Promise<void> {
    await this.trackEvent('regulation_effectiveness', {
      tool: outcome.tool,
      distress_before: outcome.distressBefore,
      distress_after: outcome.distressAfter,
      distress_change: outcome.distressBefore - outcome.distressAfter,
      ...(outcome.urgeBefore !== undefined ? { urge_before: outcome.urgeBefore } : {}),
      ...(outcome.urgeAfter !== undefined ? { urge_after: outcome.urgeAfter } : {}),
    });
  }

  async setUserProperties(properties: AnalyticsUserProperties): Promise<void> {
    for (const provider of this.providers) {
      try {
        await provider.setUserProperties(properties);
      } catch (error) {
        console.log(`[AnalyticsEngine] Provider "${provider.name}" setUserProperties error:`, error);
      }
    }
  }

  async flush(): Promise<void> {
    await localEventStore.persist();
    for (const provider of this.providers) {
      try {
        await provider.flush();
      } catch (error) {
        console.log(`[AnalyticsEngine] Provider "${provider.name}" flush error:`, error);
      }
    }
  }

  getActiveFlows(): AnalyticsFlowState[] {
    return Array.from(this.activeFlows.values());
  }

  getSessionId(): string {
    return this.sessionId;
  }

  startNewSession(): void {
    this.sessionId = generateSessionId();
    this.activeFlows.clear();
    console.log('[AnalyticsEngine] New session started:', this.sessionId);
  }
}

export const analyticsEngine = new AnalyticsEngine();
