import {
  SafeRewrite,
  SafeRewriteType,
  SAFE_REWRITE_META,
  DoNotSendRecommendation,
  DO_NOT_SEND_OPTIONS,
} from '@/types/messageRisk';
import {
  MessageSafetyClassification,
} from '@/types/messageRisk';
import {
  classifyMessageSafety,
  extractCoreEmotion,
  extractCoreSituation,
} from '@/services/messages/messageSafetyClassifier';
import { EnhancedMessageContext } from '@/types/messageHealth';

function generateSecureReplacement(draft: string, _context: EnhancedMessageContext): string {
  const emotion = extractCoreEmotion(draft);
  const situation = extractCoreSituation(draft);

  const openers = [
    `I'm feeling ${emotion} right now, and I want to be honest about that.`,
    `I need to tell you something difficult. I'm feeling ${emotion}.`,
    `I've been sitting with some hard feelings about ${situation}, and I want to share them clearly.`,
  ];

  const bodies: string[] = [];

  if (situation.includes('silence') || situation.includes('response') || situation.includes('ignored')) {
    bodies.push(
      `The silence is hard for me. I notice I'm making up stories about what it means, and I'd rather just be honest with you about how I feel.`,
      `Not hearing from you has been difficult. I want to understand what's going on rather than assume the worst.`,
    );
  } else {
    bodies.push(
      `I want to talk about what happened because it matters to me. I'm trying to express this without making things worse.`,
      `What happened affected me, and I want to address it clearly rather than let it build.`,
    );
  }

  const closers = [
    `I trust we can work through this.`,
    `I care about this relationship, and I want to handle this well.`,
    `I'm sharing this because this matters to me, not to start a fight.`,
  ];

  const opener = openers[Math.floor(draft.length % openers.length)];
  const body = bodies[Math.floor(draft.length % bodies.length)];
  const closer = closers[Math.floor(draft.length % closers.length)];

  return `${opener} ${body} ${closer}`;
}

function generateCalmBoundary(draft: string, _context: EnhancedMessageContext): string {
  const emotion = extractCoreEmotion(draft);
  const situation = extractCoreSituation(draft);

  if (situation.includes('silence') || situation.includes('response') || situation.includes('ignored')) {
    const variants = [
      `I'm upset that I haven't heard from you. This lack of response doesn't work for me. I'm going to step back and take care of myself.`,
      `The silence is affecting me, and I need to be honest about that. I deserve communication, and I'm choosing to protect my peace until we can talk.`,
      `I feel hurt by ${situation}. I'm not going to chase this — but I want you to know it matters to me.`,
    ];
    return variants[Math.floor(draft.length % variants.length)];
  }

  const variants = [
    `I'm feeling ${emotion}, and I need to set a limit here. This situation isn't okay with me, and I'm choosing to address it calmly rather than react.`,
    `What happened affected me. I'm not going to pretend otherwise, but I also want to handle this in a way I can be proud of. I need some space to process.`,
    `I feel ${emotion} and frustrated by what happened. I'm setting a boundary here because I care about my own wellbeing. I hope we can talk about this when things are calmer.`,
  ];

  return variants[Math.floor(draft.length % variants.length)];
}

function generateShortBoundary(draft: string): string {
  const situation = extractCoreSituation(draft);

  if (situation.includes('silence') || situation.includes('response') || situation.includes('ignored')) {
    const variants = [
      `This silence isn't working for me. I'm stepping back.`,
      `I need a response to feel okay about this. Until then, I'm going to take care of myself.`,
      `I'm hurt by the lack of response. I'm choosing to step back rather than keep reaching out.`,
    ];
    return variants[Math.floor(draft.length % variants.length)];
  }

  const variants = [
    `This doesn't work for me. I need to step back.`,
    `I'm not okay with this, and I'm choosing not to engage further right now.`,
    `I need space to process this. I'll reach out when I'm ready.`,
  ];
  return variants[Math.floor(draft.length % variants.length)];
}

function generateNoSendVersion(draft: string): string {
  return `[Written, not sent]\n\n${draft.trim()}\n\n---\nYou wrote this to process your feelings. That took awareness. The emotion is valid — this version just isn't the one to send.`;
}

function generateJournalVersion(draft: string): string {
  const emotion = extractCoreEmotion(draft);
  return `[Journal reflection]\n\nI'm feeling ${emotion} right now. What I wanted to say was:\n\n"${draft.trim()}"\n\nWhat I actually need is...\n\n[Write what you truly need here]`;
}

function generateSaveForLater(draft: string): string {
  return `[Saved for review]\n\n${draft.trim()}\n\n---\nSaved at ${new Date().toLocaleTimeString()}. Come back to this when the intensity has passed. Your future self will know what to do.`;
}

export function generateSafeRewrites(
  draft: string,
  classification: MessageSafetyClassification,
  context: EnhancedMessageContext,
): SafeRewrite[] {
  console.log('[RiskScoring] Generating safe rewrites for risk:', classification.riskLevel);

  const generators: Record<SafeRewriteType, () => { text: string; whyThisHelps: string }> = {
    secure: () => ({
      text: generateSecureReplacement(draft, context),
      whyThisHelps: 'This version names your feelings clearly without attacking. It invites conversation rather than conflict, and protects your dignity.',
    }),
    calm_boundary: () => ({
      text: generateCalmBoundary(draft, context),
      whyThisHelps: 'A calm boundary communicates your limit without escalating. It shows self-respect and gives the relationship space to recover.',
    }),
    short_boundary: () => ({
      text: generateShortBoundary(draft),
      whyThisHelps: 'Sometimes less is more. A short, clear boundary is harder to argue with and shows emotional control.',
    }),
    no_send: () => ({
      text: generateNoSendVersion(draft),
      whyThisHelps: 'Writing it out without sending activates the same emotional processing. You get the release without the risk. This is a powerful skill.',
    }),
    save_for_later: () => ({
      text: generateSaveForLater(draft),
      whyThisHelps: 'Research shows that waiting even 10 minutes before sending an emotional message dramatically reduces regret. Save it and revisit later.',
    }),
    journal_instead: () => ({
      text: generateJournalVersion(draft),
      whyThisHelps: 'Journaling helps you separate what you feel from what you want to communicate. It often reveals what you actually need.',
    }),
  };

  return classification.safeRewriteTypes.map((type, index) => {
    const meta = SAFE_REWRITE_META[type];
    const generated = generators[type]();
    return {
      type,
      label: meta.label,
      emoji: meta.emoji,
      color: meta.color,
      text: generated.text,
      whyThisHelps: generated.whyThisHelps,
      isRecommended: index === 0,
    };
  });
}

export function buildDoNotSendRecommendation(
  classification: MessageSafetyClassification,
): DoNotSendRecommendation {
  if (classification.riskLevel !== 'severe' && classification.riskLevel !== 'high') {
    return {
      active: false,
      reason: '',
      likelyConsequence: '',
      options: [],
    };
  }

  const hasProfanity = classification.flaggedContent.some(f => f.reason === 'Profanity directed at person');
  const hasInsults = classification.flaggedContent.some(f => f.reason === 'Insult');
  const hasContempt = classification.flaggedContent.some(f => f.reason === 'Contemptuous language');
  const hasRevenge = classification.flaggedContent.some(f => f.reason === 'Revenge language');

  let reason: string;
  let likelyConsequence: string;

  if (hasProfanity || hasInsults) {
    reason = 'This draft contains language directed at the other person that is very likely to cause harm and escalate conflict. The feelings behind it are real — but this version will almost certainly make things worse.';
    likelyConsequence = 'Sending this is likely to trigger a defensive or retaliatory response, damage the relationship further, and lead to regret.';
  } else if (hasContempt) {
    reason = 'This draft expresses contempt, which relationship research identifies as the most damaging communication pattern. Your pain is valid, but contempt rarely leads to the outcome you want.';
    likelyConsequence = 'Contemptuous messages tend to shut down communication entirely and leave lasting emotional damage.';
  } else if (hasRevenge) {
    reason = 'This draft contains threatening or retaliatory language that could cause significant harm. Acting on revenge impulses almost always leads to regret.';
    likelyConsequence = 'Threats and revenge language can permanently damage relationships and often escalate conflicts beyond repair.';
  } else {
    reason = 'This draft carries a very high risk of escalation and regret. The emotional intensity is understandable, but sending this version is unlikely to help.';
    likelyConsequence = 'High-intensity messages sent during emotional activation tend to create more conflict rather than resolution.';
  }

  return {
    active: true,
    reason,
    likelyConsequence,
    options: DO_NOT_SEND_OPTIONS,
  };
}

export function getFullSafetyAnalysis(draft: string, context: EnhancedMessageContext) {
  const classification = classifyMessageSafety(draft);
  const safeRewrites = generateSafeRewrites(draft, classification, context);
  const doNotSend = buildDoNotSendRecommendation(classification);

  return {
    classification,
    safeRewrites,
    doNotSend,
  };
}
