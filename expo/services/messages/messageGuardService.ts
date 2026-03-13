import {
  MessageTone,
  ToneAnalysis,
  ResponseStyleCard,
  MessageGuardSession,
  TONE_META,
} from '@/types/messageGuard';
import { analyzeTone } from '@/services/messages/messageToneAnalyzer';
import { generateQuickSecureVersion } from '@/services/messages/secureRewriteService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const GUARD_SESSIONS_KEY = 'message_guard_sessions';

function generateAnxiousVersion(original: string): string {
  let text = original.trim();
  text = text.replace(/\./g, '?');
  if (!text.includes('?')) text += '?';
  const prefix = "I need to know where we stand. ";
  return prefix + text + " Are we okay? Please tell me we're okay.";
}

function generateAvoidantVersion(original: string): string {
  const shortened = original.trim().split(/[.!?]/).filter(Boolean)[0] || original.trim();
  return shortened.replace(/!/g, '.').trim() + ". Anyway, it's fine. Forget I said anything.";
}

function generateAngryVersion(original: string): string {
  let text = original.trim();
  text = text.replace(/\./g, '!');
  if (!text.endsWith('!')) text += '!';
  return "You know what? " + text;
}

function generateOverExplainingVersion(original: string): string {
  const text = original.trim();
  const prefix = "What I'm trying to say is — and I know this might not come out right — but I really need you to understand that ";
  const suffix = ". And I don't mean it in a bad way, I just want you to see where I'm coming from. Does that make sense? I hope that makes sense.";
  return prefix + text.charAt(0).toLowerCase() + text.slice(1).replace(/[.!?]*$/, '') + suffix;
}

function getEmotionalImpact(tone: MessageTone): string {
  switch (tone) {
    case 'anxious':
      return "May temporarily ease anxiety but could increase dependency on their response for your sense of safety.";
    case 'avoidant':
      return "May feel self-protective in the moment but could leave your real feelings unexpressed and create distance.";
    case 'angry':
      return "May release pressure but could escalate the situation and leave you feeling regretful afterward.";
    case 'over_explaining':
      return "May feel like you're being thorough, but could overwhelm the other person and weaken your core point.";
    case 'secure':
      return "May feel vulnerable at first, but tends to invite genuine connection and mutual respect.";
  }
}

function getRelationshipImpact(tone: MessageTone): string {
  switch (tone) {
    case 'anxious':
      return "Could put pressure on the other person to manage your emotions, which may create a push-pull dynamic.";
    case 'avoidant':
      return "Could signal that you don't care even when you do, making the other person feel shut out.";
    case 'angry':
      return "Could trigger defensiveness and make the conversation about blame rather than resolution.";
    case 'over_explaining':
      return "Could exhaust the other person and make it harder for them to find the real message underneath.";
    case 'secure':
      return "Tends to create space for honest dialogue and helps both people feel respected.";
  }
}

export function generateResponseStyles(
  originalText: string,
  analysis: ToneAnalysis,
): ResponseStyleCard[] {
  console.log('[MessageGuard] Generating response styles');

  const secureVersion = generateQuickSecureVersion(originalText, analysis);

  const styles: ResponseStyleCard[] = [
    {
      tone: 'anxious',
      label: TONE_META.anxious.label,
      emoji: TONE_META.anxious.emoji,
      color: TONE_META.anxious.color,
      rewrittenMessage: generateAnxiousVersion(originalText),
      emotionalImpact: getEmotionalImpact('anxious'),
      relationshipImpact: getRelationshipImpact('anxious'),
      isRecommended: false,
    },
    {
      tone: 'avoidant',
      label: TONE_META.avoidant.label,
      emoji: TONE_META.avoidant.emoji,
      color: TONE_META.avoidant.color,
      rewrittenMessage: generateAvoidantVersion(originalText),
      emotionalImpact: getEmotionalImpact('avoidant'),
      relationshipImpact: getRelationshipImpact('avoidant'),
      isRecommended: false,
    },
    {
      tone: 'angry',
      label: TONE_META.angry.label,
      emoji: TONE_META.angry.emoji,
      color: TONE_META.angry.color,
      rewrittenMessage: generateAngryVersion(originalText),
      emotionalImpact: getEmotionalImpact('angry'),
      relationshipImpact: getRelationshipImpact('angry'),
      isRecommended: false,
    },
    {
      tone: 'over_explaining',
      label: TONE_META.over_explaining.label,
      emoji: TONE_META.over_explaining.emoji,
      color: TONE_META.over_explaining.color,
      rewrittenMessage: generateOverExplainingVersion(originalText),
      emotionalImpact: getEmotionalImpact('over_explaining'),
      relationshipImpact: getRelationshipImpact('over_explaining'),
      isRecommended: false,
    },
    {
      tone: 'secure',
      label: TONE_META.secure.label,
      emoji: TONE_META.secure.emoji,
      color: TONE_META.secure.color,
      rewrittenMessage: secureVersion,
      emotionalImpact: getEmotionalImpact('secure'),
      relationshipImpact: getRelationshipImpact('secure'),
      isRecommended: true,
    },
  ];

  const detectedIndex = styles.findIndex(s => s.tone === analysis.primaryTone);
  if (detectedIndex > 0) {
    const [detected] = styles.splice(detectedIndex, 1);
    styles.unshift(detected);
  }

  return styles;
}

export async function saveGuardSession(session: MessageGuardSession): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(GUARD_SESSIONS_KEY);
    const sessions: MessageGuardSession[] = stored ? JSON.parse(stored) : [];
    sessions.unshift(session);
    const trimmed = sessions.slice(0, 50);
    await AsyncStorage.setItem(GUARD_SESSIONS_KEY, JSON.stringify(trimmed));
    console.log('[MessageGuard] Session saved:', session.id);
  } catch (err) {
    console.error('[MessageGuard] Error saving session:', err);
  }
}

export async function getGuardSessions(): Promise<MessageGuardSession[]> {
  try {
    const stored = await AsyncStorage.getItem(GUARD_SESSIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (err) {
    console.error('[MessageGuard] Error loading sessions:', err);
    return [];
  }
}

export { analyzeTone };
