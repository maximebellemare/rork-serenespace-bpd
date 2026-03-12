import {
  RelationshipSpiralResult,
} from '@/types/relationshipPrediction';

export interface RiskInterpretation {
  id: string;
  headline: string;
  body: string;
  tone: 'gentle' | 'supportive' | 'encouraging';
}

export function interpretRiskSignals(result: RelationshipSpiralResult): RiskInterpretation[] {
  const interpretations: RiskInterpretation[] = [];

  if (result.signals.length === 0) {
    return [{
      id: 'interp_calm',
      headline: 'Things seem steady',
      body: 'No strong relationship spiral signals right now. Keep taking care of yourself.',
      tone: 'encouraging',
    }];
  }

  const hasComm = result.signals.some(s => s.type === 'communication_uncertainty');
  const hasAbandonment = result.signals.some(s => s.type === 'abandonment_cascade');
  const hasConflictShame = result.signals.some(s => s.type === 'conflict_shame_withdrawal');
  const hasReassurance = result.signals.some(s => s.type === 'reassurance_seeking');
  const hasRewriteSurge = result.signals.some(s => s.type === 'rewrite_surge');
  const hasDistressComm = result.signals.some(s => s.type === 'distress_communication');
  const hasMessagingUrge = result.signals.some(s => s.type === 'repeated_messaging_urge');

  if (hasComm) {
    interpretations.push({
      id: 'interp_comm',
      headline: 'Communication uncertainty seems active',
      body: 'When communication feels uncertain, anxiety often rises fast. Slowing down before responding may help you feel more in control.',
      tone: 'gentle',
    });
  }

  if (hasAbandonment) {
    interpretations.push({
      id: 'interp_abandon',
      headline: 'Abandonment fears may be influencing decisions',
      body: 'When abandonment fear is active, urgency to fix things can feel overwhelming. Grounding first may bring more clarity.',
      tone: 'gentle',
    });
  }

  if (hasConflictShame) {
    interpretations.push({
      id: 'interp_shame',
      headline: 'A conflict-shame cycle may be forming',
      body: 'After conflict, shame often makes you want to withdraw or over-apologize. Neither tends to help long-term. A moment of self-compassion may be more effective.',
      tone: 'supportive',
    });
  }

  if (hasReassurance) {
    interpretations.push({
      id: 'interp_reassurance',
      headline: 'Reassurance-seeking is building',
      body: 'The urge to seek reassurance often feels urgent but rarely brings lasting relief. Grounding yourself first may help you reach out from a calmer place.',
      tone: 'gentle',
    });
  }

  if (hasRewriteSurge) {
    interpretations.push({
      id: 'interp_rewrite',
      headline: 'Lots of message reworking recently',
      body: 'Rewriting many messages can signal that you\'re trying hard to get communication right. That effort matters — and a pause may bring more clarity than another rewrite.',
      tone: 'supportive',
    });
  }

  if (hasDistressComm) {
    interpretations.push({
      id: 'interp_distress_comm',
      headline: 'Messaging while distress is high',
      body: 'Sending messages when distress is elevated can lead to regret. Even a 2-minute pause may change what you decide to say.',
      tone: 'gentle',
    });
  }

  if (hasMessagingUrge) {
    interpretations.push({
      id: 'interp_messaging',
      headline: 'Repeated urge to send messages',
      body: 'When the urge to message keeps coming back, it often means something deeper needs attention. Journaling or talking to your AI Companion may help.',
      tone: 'supportive',
    });
  }

  if (result.riskLevel === 'rising' || result.riskLevel === 'urgent') {
    interpretations.push({
      id: 'interp_overall',
      headline: 'Multiple signals are active',
      body: 'When several relationship patterns overlap, spirals can build quickly. This is a good moment to slow everything down — even for just a few minutes.',
      tone: 'gentle',
    });
  }

  return interpretations;
}

export function getQuickMessageIntervention(result: RelationshipSpiralResult): string | null {
  if (result.riskLevel === 'calm') return null;

  if (result.riskLevel === 'urgent') {
    return 'Your recent patterns suggest this may be a moment to pause before sending. A short grounding step could help.';
  }

  if (result.signals.some(s => s.type === 'rewrite_surge')) {
    return 'You\'ve been reworking messages frequently. Would it help to simulate your response first?';
  }

  if (result.signals.some(s => s.type === 'reassurance_seeking')) {
    return 'Reassurance-seeking urges are active. Grounding first may help you communicate more clearly.';
  }

  if (result.riskLevel === 'rising') {
    return 'Relationship stress seems to be building. Taking a pause before responding may protect your peace.';
  }

  return 'Some relationship signals are showing up. Being mindful before sending may help.';
}

export function getCompanionContext(result: RelationshipSpiralResult): string | null {
  if (result.riskLevel === 'calm') return null;

  const signalDescriptions = result.signals.map(s => s.label).join(', ');
  const chainDescriptions = result.chains
    .slice(0, 2)
    .map(c => `${c.trigger} often leads to ${c.emotion} and ${c.urge}`)
    .join('; ');

  let context = `Current relationship spiral risk: ${result.riskLevel}. Active signals: ${signalDescriptions}.`;

  if (chainDescriptions) {
    context += ` Common chains: ${chainDescriptions}.`;
  }

  return context;
}
