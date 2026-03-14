import {
  ResponsePath,
  ResponsePathSimulation,
  SimulationContext,
  SimulationResult,
  RESPONSE_PATH_META,
  PathImpactScore,
} from '@/types/messageSimulation';
import { classifyMessageSafety, extractCoreEmotion, extractCoreSituation } from '@/services/messages/messageSafetyClassifier';

function generateUrgentVersion(draft: string, isSafe: boolean): string {
  if (!isSafe) {
    const situation = extractCoreSituation(draft);
    return `I need you to hear this right now. I'm really upset about ${situation}. Why aren't you responding?!`;
  }
  let text = draft.trim();
  text = text.replace(/\./g, '!');
  if (!text.endsWith('!')) text += '!';
  return "I need you to hear this right now. " + text + " Why aren't you responding?";
}

function generateAvoidantVersion(draft: string, isSafe: boolean): string {
  if (!isSafe) {
    return "Whatever. It's fine. Forget I said anything.";
  }
  const firstSentence = draft.trim().split(/[.!?]/).filter(Boolean)[0] || draft.trim();
  return firstSentence.replace(/!/g, '.').trim() + ". Actually, forget it. It's fine.";
}

function generateSoftVersion(draft: string, context: SimulationContext, isSafe: boolean): string {
  if (!isSafe) {
    const emotion = extractCoreEmotion(draft);
    const situation = extractCoreSituation(draft);
    const opener = context.desiredOutcome === 'reconnect'
      ? "I care about us, and I want to share something gently."
      : "This is hard for me to say, and I hope you'll hear me.";
    return `${opener} I'm feeling ${emotion} because of ${situation}. I want us to be okay.`;
  }
  let text = draft.trim();
  text = text.replace(/!/g, '.');
  text = text.replace(/you always/gi, 'sometimes I notice');
  text = text.replace(/you never/gi, 'I wish I could see more of');
  const opener = context.desiredOutcome === 'reconnect'
    ? "I care about us, and I want to share something gently."
    : "This is hard for me to say, and I hope you'll hear me.";
  return `${opener} ${text}`;
}

function generateBoundaryVersion(draft: string, context: SimulationContext, isSafe: boolean): string {
  if (!isSafe) {
    const situation = extractCoreSituation(draft);
    const emotion = extractCoreEmotion(draft);
    if (context.desiredOutcome === 'protect_dignity') {
      return `I feel ${emotion} about ${situation}. This doesn't work for me, and I'm choosing to step back.`;
    }
    return `I need to be honest. I feel ${emotion} about ${situation}, and this doesn't work for me. I'm stepping back to protect my wellbeing.`;
  }
  let text = draft.trim();
  text = text.replace(/!/g, '.');
  text = text.replace(/you always/gi, 'When this happens,');
  text = text.replace(/you never/gi, 'I need');
  if (context.desiredOutcome === 'protect_dignity') {
    return `${text} This doesn't work for me, and I'm stepping back.`;
  }
  return `I need to be honest about something important. ${text} This boundary is about protecting my wellbeing.`;
}

function generateSecureVersion(draft: string, context: SimulationContext, isSafe: boolean): string {
  if (!isSafe) {
    const emotion = extractCoreEmotion(draft);
    const situation = extractCoreSituation(draft);

    if (context.desiredOutcome === 'get_clarity') {
      return `I'm feeling ${emotion} about ${situation}. I'd rather talk about this when there's more clarity between us.`;
    }
    if (context.desiredOutcome === 'reconnect') {
      return `I've taken a moment to think about what I want to say. I feel ${emotion} about ${situation}, and I want to address this honestly rather than react.`;
    }
    if (context.emotionalState === 'rejected') {
      return `I'm feeling vulnerable right now. I'm ${emotion} about ${situation}. I'm not going to keep chasing this conversation.`;
    }
    if (context.emotionalState === 'anxious') {
      return `I notice my anxiety is speaking, so I want to be intentional. I feel ${emotion} about ${situation}. I trust we can handle this.`;
    }
    return `I've taken a moment to think about what I actually want to say. I feel ${emotion} about ${situation}. I want to address this clearly rather than react.`;
  }
  let text = draft.trim();
  text = text.replace(/!/g, '.');
  text = text.replace(/you always/gi, 'I notice that sometimes');
  text = text.replace(/you never/gi, "I'd appreciate seeing more");
  text = text.replace(/don't leave me/gi, "I hope we can stay connected");

  const opener = context.emotionalState === 'rejected'
    ? "I'm feeling vulnerable right now, and I want to be open with you."
    : context.emotionalState === 'anxious'
      ? "I notice my anxiety is speaking, so I want to be intentional."
      : "I've taken a moment to think about what I actually want to say.";

  return `${opener} ${text} I trust we can handle this.`;
}

function selectRelevantPaths(context: SimulationContext, riskLevel: string): ResponsePath[] {
  console.log('[MessageSimulation] Selecting paths for risk:', riskLevel, 'outcome:', context.desiredOutcome);

  if (riskLevel === 'severe' || riskLevel === 'high') {
    return ['urgent', 'boundary', 'secure', 'do_not_send'];
  }

  if (context.desiredOutcome === 'reconnect') {
    return ['urgent', 'soft', 'secure', 'do_not_send'];
  }

  if (context.desiredOutcome === 'protect_dignity') {
    return ['urgent', 'boundary', 'secure', 'do_not_send'];
  }

  if (context.desiredOutcome === 'get_clarity') {
    return ['urgent', 'avoidant', 'secure', 'do_not_send'];
  }

  if (context.desiredOutcome === 'avoid_conflict' || context.desiredOutcome === 'not_make_worse') {
    return ['urgent', 'soft', 'boundary', 'secure', 'do_not_send'];
  }

  if (context.emotionalState === 'angry' || context.urge === 'attack') {
    return ['urgent', 'boundary', 'secure', 'do_not_send'];
  }

  if (context.emotionalState === 'anxious' || context.urge === 'ask_reassurance') {
    return ['urgent', 'soft', 'secure', 'do_not_send'];
  }

  return ['urgent', 'avoidant', 'soft', 'boundary', 'secure', 'do_not_send'];
}

function selectRecommendedPath(context: SimulationContext, riskLevel: string): ResponsePath {
  if (riskLevel === 'severe') return 'do_not_send';
  if (riskLevel === 'high') return 'do_not_send';

  if (context.emotionalState === 'angry' && context.urge === 'attack') return 'do_not_send';
  if (context.urge === 'demand_clarity') return 'secure';
  if (context.desiredOutcome === 'protect_dignity') return 'boundary';
  if (context.desiredOutcome === 'reconnect') return 'secure';
  if (context.desiredOutcome === 'get_clarity') return 'secure';
  if (context.desiredOutcome === 'avoid_conflict') return 'secure';

  return 'secure';
}

function buildRecommendationReason(recommendedPath: ResponsePath, riskLevel: string, context: SimulationContext): string {
  if (recommendedPath === 'do_not_send') {
    if (riskLevel === 'severe') return 'This draft has very high escalation risk. Not sending right now is the strongest move you can make.';
    if (riskLevel === 'high') return 'Strong emotions are present. Pausing now protects both you and the relationship.';
    return 'Given the emotional intensity, waiting may lead to the best outcome.';
  }
  if (recommendedPath === 'boundary') {
    return 'A clear boundary protects your dignity and gives the most clarity here.';
  }
  if (recommendedPath === 'secure') {
    if (context.desiredOutcome === 'reconnect') return 'The secure path balances emotional honesty with self-respect — best for reconnection.';
    if (context.desiredOutcome === 'get_clarity') return 'The secure path asks for clarity without creating pressure.';
    return 'The secure path gives clarity and self-respect with the lowest regret risk.';
  }
  return 'This path balances your needs with relationship safety.';
}

function buildPathImpact(path: ResponsePath, riskLevel: string): PathImpactScore {
  const impactMap: Record<ResponsePath, PathImpactScore> = {
    urgent: {
      regretRisk: riskLevel === 'severe' || riskLevel === 'high' ? 'high' : 'high',
      dignityProtection: 'low',
      clarityLevel: 'low',
      escalationRisk: 'high',
      selfRespect: 'low',
    },
    avoidant: {
      regretRisk: 'moderate',
      dignityProtection: 'moderate',
      clarityLevel: 'low',
      escalationRisk: 'low',
      selfRespect: 'low',
    },
    soft: {
      regretRisk: 'low',
      dignityProtection: 'moderate',
      clarityLevel: 'moderate',
      escalationRisk: 'low',
      selfRespect: 'moderate',
    },
    boundary: {
      regretRisk: 'low',
      dignityProtection: 'high',
      clarityLevel: 'high',
      escalationRisk: 'low',
      selfRespect: 'high',
    },
    secure: {
      regretRisk: 'low',
      dignityProtection: 'high',
      clarityLevel: 'high',
      escalationRisk: 'low',
      selfRespect: 'high',
    },
    do_not_send: {
      regretRisk: 'low',
      dignityProtection: 'high',
      clarityLevel: 'moderate',
      escalationRisk: 'low',
      selfRespect: 'high',
    },
  };
  return impactMap[path];
}

function buildSelfEffect(path: ResponsePath, context: SimulationContext): string {
  const effects: Record<ResponsePath, string> = {
    urgent: 'May feel like release in the moment, but often followed by shame or regret.',
    avoidant: 'May protect you from conflict, but your real feelings stay unexpressed.',
    soft: 'May feel vulnerable but caring. Opens space for understanding.',
    boundary: 'May feel empowering. You protect your space while staying honest.',
    secure: 'May feel calmer and more grounded. Aligns with your healthiest self.',
    do_not_send: 'Gives your nervous system time to settle. Highest chance of clear thinking.',
  };

  if (path === 'do_not_send' && (context.emotionalState === 'angry' || context.emotionalState === 'overwhelmed')) {
    return 'When emotions are this high, pausing is the most self-respecting choice. Clarity comes after regulation.';
  }

  return effects[path];
}

function buildShortTermEffect(path: ResponsePath, isSafe: boolean): string {
  if (path === 'urgent') {
    return !isSafe
      ? 'This version would almost certainly escalate the situation and lead to significant regret.'
      : 'May give momentary relief from anxiety, but often increases tension and regret.';
  }
  if (path === 'avoidant') return 'Feels self-protective in the moment, but leaves real feelings unexpressed.';
  if (path === 'soft') return 'Feels vulnerable but caring. May ease the emotional charge of the conversation.';
  if (path === 'boundary') return 'May feel uncomfortable but empowering. Protects your emotional space.';
  if (path === 'secure') return 'May feel slower, but creates more clarity and self-respect.';
  if (path === 'do_not_send') return 'No immediate resolution, but the highest chance of avoiding regret.';
  return '';
}

function buildRelationshipEffect(path: ResponsePath, isSafe: boolean): string {
  if (path === 'urgent') {
    return !isSafe
      ? 'Very likely to cause lasting damage and shut down any possibility of resolution.'
      : 'Likely to create pressure, trigger defensiveness, or push the other person away.';
  }
  if (path === 'avoidant') return 'May signal indifference when you actually care deeply. Creates emotional distance.';
  if (path === 'soft') return 'Invites understanding rather than defensiveness. Shows emotional maturity.';
  if (path === 'boundary') return 'Healthy boundaries strengthen relationships long-term, even if they create short-term friction.';
  if (path === 'secure') return 'Invites genuine connection. Shows self-awareness without demanding the other person fix your feelings.';
  if (path === 'do_not_send') return 'Avoids potential damage. You can always send something later — you can never unsend.';
  return '';
}

function buildRecommendationNote(path: ResponsePath, isRecommended: boolean, riskLevel: string): string {
  if (!isRecommended) {
    if (path === 'urgent') return 'This path has the highest regret and escalation risk.';
    if (path === 'avoidant') return 'This path avoids conflict but also avoids resolution.';
    if (path === 'soft') return 'Gentle approach — works well when connection is the priority.';
    if (path === 'boundary') return 'Strong option when you need distance with dignity.';
    if (path === 'secure') return 'Balanced and self-respecting — works in most situations.';
    if (path === 'do_not_send') return 'The safest option when emotions are high.';
  }

  if (path === 'do_not_send') {
    if (riskLevel === 'severe') return 'Best option right now. This draft is very likely to cause regret.';
    return 'Recommended: pausing now gives you the best chance of a good outcome.';
  }
  if (path === 'secure') return 'Most balanced option: clear, self-respecting, low escalation.';
  if (path === 'boundary') return 'Most self-respecting option: protects dignity with clarity.';
  return 'Recommended based on your situation and goals.';
}

function buildActionLabel(path: ResponsePath): string {
  if (path === 'urgent') return 'Not recommended';
  if (path === 'avoidant') return 'Use this version';
  if (path === 'soft') return 'Use this version';
  if (path === 'boundary') return 'Rewrite as boundary';
  if (path === 'secure') return 'Open secure rewrite';
  if (path === 'do_not_send') return 'Save & pause';
  return 'Use this version';
}

function buildActionType(path: ResponsePath): ResponsePathSimulation['actionType'] {
  if (path === 'secure') return 'secure_rewrite';
  if (path === 'do_not_send') return 'pause';
  if (path === 'boundary') return 'use_rewrite';
  return 'use_rewrite';
}

export function simulateResponsePaths(
  draft: string,
  context: SimulationContext,
): SimulationResult {
  console.log('[MessageSimulation] Generating response paths for draft length:', draft.length);

  const classification = classifyMessageSafety(draft);
  const isSafe = classification.preserveWordingAllowed;
  const riskLevel = classification.riskLevel;
  console.log('[MessageSimulation] Safety:', riskLevel, 'Preserve allowed:', isSafe);

  const selectedPaths = selectRelevantPaths(context, riskLevel);
  const recommendedPathType = selectRecommendedPath(context, riskLevel);

  const generators: Record<ResponsePath, () => string> = {
    urgent: () => generateUrgentVersion(draft, isSafe),
    avoidant: () => generateAvoidantVersion(draft, isSafe),
    soft: () => generateSoftVersion(draft, context, isSafe),
    boundary: () => generateBoundaryVersion(draft, context, isSafe),
    secure: () => generateSecureVersion(draft, context, isSafe),
    do_not_send: () => '',
  };

  const paths: ResponsePathSimulation[] = selectedPaths.map(pathType => {
    const meta = RESPONSE_PATH_META[pathType];
    const isRecommended = pathType === recommendedPathType;
    const message = generators[pathType]();

    return {
      path: pathType,
      label: meta.label,
      emoji: meta.emoji,
      color: meta.color,
      exampleMessage: message,
      shortTermEffect: buildShortTermEffect(pathType, isSafe),
      relationshipEffect: buildRelationshipEffect(pathType, isSafe),
      selfEffect: buildSelfEffect(pathType, context),
      impact: buildPathImpact(pathType, riskLevel),
      isRecommended,
      recommendationNote: buildRecommendationNote(pathType, isRecommended, riskLevel),
      actionLabel: buildActionLabel(pathType),
      actionType: buildActionType(pathType),
    };
  });

  const sortedPaths = paths.sort((a, b) => {
    if (a.isRecommended) return -1;
    if (b.isRecommended) return 1;
    const order: ResponsePath[] = ['secure', 'boundary', 'do_not_send', 'soft', 'avoidant', 'urgent'];
    return order.indexOf(a.path) - order.indexOf(b.path);
  });

  const result: SimulationResult = {
    id: `sim_${Date.now()}`,
    timestamp: Date.now(),
    context,
    paths: sortedPaths,
    recommendedPathType,
    recommendationReason: buildRecommendationReason(recommendedPathType, riskLevel, context),
  };

  console.log('[MessageSimulation] Generated', sortedPaths.length, 'paths. Recommended:', recommendedPathType);
  return result;
}
