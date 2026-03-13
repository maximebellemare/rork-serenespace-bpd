import { NotificationCategory } from '@/types/notifications';
import { ExperimentId } from '@/types/notificationExperiment';
import { notificationExperimentService, EXPERIMENT_DEFINITIONS } from './notificationExperimentService';
import { getRandomTemplate } from './notificationTemplates';

export interface ResolvedVariant {
  title: string;
  body: string;
  experimentId: ExperimentId | null;
  variantId: string | null;
  timingDelayOverride: number | null;
}

class NotificationVariantResolver {
  resolve(
    category: NotificationCategory,
    fallbackCopy?: { title: string; body: string },
  ): ResolvedVariant {
    const experiment = EXPERIMENT_DEFINITIONS.find(d => d.category === category);

    if (!experiment) {
      const fb = fallbackCopy ?? getRandomTemplate(category);
      return {
        title: fb.title,
        body: fb.body,
        experimentId: null,
        variantId: null,
        timingDelayOverride: null,
      };
    }

    const variantId = notificationExperimentService.getAssignment(experiment.id);
    const variant = experiment.variants.find(v => v.id === variantId) ?? experiment.variants[0];

    const copy = variant.copy ?? fallbackCopy ?? getRandomTemplate(category);

    console.log('[VariantResolver] Resolved', category, '→', experiment.id, variantId);

    return {
      title: copy.title,
      body: copy.body,
      experimentId: experiment.id,
      variantId,
      timingDelayOverride: variant.timingDelaySeconds ?? null,
    };
  }

  resolveForExperiment(
    experimentId: ExperimentId,
    fallbackCopy?: { title: string; body: string },
  ): ResolvedVariant {
    const experiment = notificationExperimentService.getDefinition(experimentId);

    if (!experiment) {
      const fb = fallbackCopy ?? { title: 'BPD Companion', body: 'Support is here for you.' };
      return {
        title: fb.title,
        body: fb.body,
        experimentId: null,
        variantId: null,
        timingDelayOverride: null,
      };
    }

    const variantId = notificationExperimentService.getAssignment(experimentId);
    const variant = experiment.variants.find(v => v.id === variantId) ?? experiment.variants[0];
    const copy = variant.copy ?? fallbackCopy ?? getRandomTemplate(experiment.category);

    return {
      title: copy.title,
      body: copy.body,
      experimentId,
      variantId,
      timingDelayOverride: variant.timingDelaySeconds ?? null,
    };
  }

  async trackSent(category: NotificationCategory): Promise<void> {
    const experiment = EXPERIMENT_DEFINITIONS.find(d => d.category === category);
    if (experiment) {
      await notificationExperimentService.recordEvent(experiment.id, 'sent');
    }
  }

  async trackOpened(category: NotificationCategory): Promise<void> {
    const experiment = EXPERIMENT_DEFINITIONS.find(d => d.category === category);
    if (experiment) {
      await notificationExperimentService.recordEvent(experiment.id, 'opened');
    }
  }

  async trackFlowStarted(category: NotificationCategory): Promise<void> {
    const experiment = EXPERIMENT_DEFINITIONS.find(d => d.category === category);
    if (experiment) {
      await notificationExperimentService.recordEvent(experiment.id, 'flow_started');
    }
  }

  async trackFlowCompleted(category: NotificationCategory): Promise<void> {
    const experiment = EXPERIMENT_DEFINITIONS.find(d => d.category === category);
    if (experiment) {
      await notificationExperimentService.recordEvent(experiment.id, 'flow_completed');
    }
  }

  async trackBounced(category: NotificationCategory): Promise<void> {
    const experiment = EXPERIMENT_DEFINITIONS.find(d => d.category === category);
    if (experiment) {
      await notificationExperimentService.recordEvent(experiment.id, 'bounced');
    }
  }
}

export const notificationVariantResolver = new NotificationVariantResolver();
