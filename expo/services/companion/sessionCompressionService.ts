import { SessionSummary } from '@/types/companionMemory';
import { estimateTokens } from '@/services/ai/tokenBudgetService';

export interface CompressedSessionContext {
  narrative: string;
  sessionCount: number;
  tokensUsed: number;
}

const MAX_SESSION_TOKENS = 300;
const MAX_SESSIONS_FOR_CONTEXT = 3;

export function compressSessionsForContext(
  sessions: SessionSummary[],
  maxTokens: number = MAX_SESSION_TOKENS,
): CompressedSessionContext {
  if (sessions.length === 0) {
    return { narrative: '', sessionCount: 0, tokensUsed: 0 };
  }

  const recentSessions = sessions.slice(0, MAX_SESSIONS_FOR_CONTEXT);
  const parts: string[] = [];

  for (const session of recentSessions) {
    const sessionLine = buildSessionLine(session);
    const currentTokens = estimateTokens(parts.join('\n'));
    if (currentTokens + estimateTokens(sessionLine) > maxTokens) break;
    parts.push(sessionLine);
  }

  const narrative = parts.length > 0
    ? `[Recent sessions]\n${parts.join('\n')}`
    : '';

  const tokensUsed = estimateTokens(narrative);

  console.log('[SessionCompression] Compressed', recentSessions.length, 'sessions to', tokensUsed, 'tokens');

  return {
    narrative,
    sessionCount: parts.length,
    tokensUsed,
  };
}

function buildSessionLine(session: SessionSummary): string {
  const parts: string[] = [];
  const timeAgo = formatRelativeTime(session.timestamp);

  if (session.trigger && session.emotion) {
    parts.push(`${timeAgo}: "${session.trigger}" → ${session.emotion}`);
  } else if (session.trigger) {
    parts.push(`${timeAgo}: discussed "${session.trigger}"`);
  } else {
    parts.push(`${timeAgo}: support session`);
  }

  if (session.insight) {
    const shortInsight = session.insight.length > 80
      ? session.insight.substring(0, 77) + '...'
      : session.insight;
    parts.push(`insight: "${shortInsight}"`);
  }

  if (session.skillsPracticed.length > 0) {
    parts.push(`practiced: ${session.skillsPracticed.slice(0, 2).join(', ')}`);
  }

  return `- ${parts.join(' | ')}`;
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const hours = Math.floor(diff / (60 * 60 * 1000));
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));

  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

export function shouldCompressSession(
  messages: Array<{ role: string; content: string }>,
): boolean {
  return messages.length >= 6;
}

export function buildCompressedSessionSummary(
  messages: Array<{ role: string; content: string }>,
): string | null {
  if (messages.length < 4) return null;

  const userMessages = messages.filter(m => m.role === 'user');
  if (userMessages.length < 2) return null;

  const topics = new Set<string>();
  const emotions = new Set<string>();

  const topicMap: Record<string, string> = {
    'relationship': 'relationship', 'partner': 'relationship', 'text': 'communication',
    'message': 'communication', 'conflict': 'conflict', 'work': 'work',
    'family': 'family', 'friend': 'friendship', 'therapy': 'therapy',
  };

  const emotionMap: Record<string, string> = {
    'angry': 'anger', 'sad': 'sadness', 'anxious': 'anxiety', 'scared': 'fear',
    'shame': 'shame', 'overwhelm': 'overwhelm', 'abandon': 'abandonment',
    'reject': 'rejection', 'lonely': 'loneliness', 'panic': 'panic',
  };

  for (const msg of userMessages) {
    const lower = msg.content.toLowerCase();
    for (const [kw, topic] of Object.entries(topicMap)) {
      if (lower.includes(kw)) topics.add(topic);
    }
    for (const [kw, emotion] of Object.entries(emotionMap)) {
      if (lower.includes(kw)) emotions.add(emotion);
    }
  }

  const parts: string[] = [];
  if (topics.size > 0) parts.push(`about ${[...topics].slice(0, 2).join(' and ')}`);
  if (emotions.size > 0) parts.push(`feeling ${[...emotions].slice(0, 2).join(', ')}`);

  return parts.length > 0
    ? `Previous session: ${parts.join(', ')}`
    : `Previous session: ${userMessages.length} exchanges`;
}
