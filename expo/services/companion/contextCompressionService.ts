import { estimateTokens } from '@/services/ai/tokenBudgetService';

export interface CompressedConversation {
  recentMessages: Array<{ role: string; content: string }>;
  summary: string | null;
  originalMessageCount: number;
  compressedMessageCount: number;
  tokensSaved: number;
}

const MAX_RECENT_MESSAGES = 8;
const SUMMARY_TRIGGER_THRESHOLD = 6;

export function compressConversationHistory(
  messages: Array<{ role: string; content: string }>,
): CompressedConversation {
  const originalTokens = messages.reduce((s, m) => s + estimateTokens(m.content), 0);

  if (messages.length <= SUMMARY_TRIGGER_THRESHOLD) {
    return {
      recentMessages: messages,
      summary: null,
      originalMessageCount: messages.length,
      compressedMessageCount: messages.length,
      tokensSaved: 0,
    };
  }

  const cutoff = messages.length - MAX_RECENT_MESSAGES;
  const olderMessages = messages.slice(0, cutoff);
  const recentMessages = messages.slice(cutoff);

  const summary = summarizeOlderMessages(olderMessages);
  const compressedTokens = recentMessages.reduce((s, m) => s + estimateTokens(m.content), 0) + estimateTokens(summary);

  console.log('[ContextCompression] Compressed conversation:', {
    original: messages.length,
    kept: recentMessages.length,
    summarized: olderMessages.length,
    tokensSaved: originalTokens - compressedTokens,
  });

  return {
    recentMessages,
    summary,
    originalMessageCount: messages.length,
    compressedMessageCount: recentMessages.length,
    tokensSaved: Math.max(0, originalTokens - compressedTokens),
  };
}

function summarizeOlderMessages(messages: Array<{ role: string; content: string }>): string {
  const userMessages = messages.filter(m => m.role === 'user');
  const assistantMessages = messages.filter(m => m.role === 'assistant');

  const topics: string[] = [];
  const emotions: string[] = [];
  const keyPoints: string[] = [];

  const emotionWords: Record<string, string> = {
    'angry': 'anger', 'rage': 'rage', 'sad': 'sadness', 'anxious': 'anxiety',
    'scared': 'fear', 'ashamed': 'shame', 'guilt': 'guilt', 'overwhelm': 'overwhelm',
    'abandon': 'abandonment fear', 'reject': 'rejection', 'lonely': 'loneliness',
    'empty': 'emptiness', 'panic': 'panic', 'jealous': 'jealousy',
  };

  const topicWords: Record<string, string> = {
    'relationship': 'relationship', 'partner': 'relationship', 'friend': 'friendship',
    'work': 'work', 'family': 'family', 'therapy': 'therapy',
    'medication': 'medication', 'text': 'communication', 'message': 'communication',
    'conflict': 'conflict', 'argument': 'conflict',
  };

  for (const msg of userMessages) {
    const lower = msg.content.toLowerCase();

    for (const [keyword, emotion] of Object.entries(emotionWords)) {
      if (lower.includes(keyword) && !emotions.includes(emotion)) {
        emotions.push(emotion);
      }
    }

    for (const [keyword, topic] of Object.entries(topicWords)) {
      if (lower.includes(keyword) && !topics.includes(topic)) {
        topics.push(topic);
      }
    }

    if (msg.content.length > 50) {
      const condensed = condenseMessage(msg.content);
      if (condensed && !keyPoints.includes(condensed)) {
        keyPoints.push(condensed);
      }
    }
  }

  for (const msg of assistantMessages) {
    const insightMatch = extractInsightFromAssistant(msg.content);
    if (insightMatch && !keyPoints.includes(insightMatch)) {
      keyPoints.push(insightMatch);
    }
  }

  const parts: string[] = ['[Earlier in this conversation]'];

  if (topics.length > 0) {
    parts.push(`Topics discussed: ${topics.slice(0, 3).join(', ')}`);
  }
  if (emotions.length > 0) {
    parts.push(`Emotions present: ${emotions.slice(0, 3).join(', ')}`);
  }
  if (keyPoints.length > 0) {
    parts.push(`Key points: ${keyPoints.slice(0, 3).join('; ')}`);
  }

  return parts.join('\n');
}

function condenseMessage(content: string): string | null {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 15);
  if (sentences.length === 0) return null;

  const first = sentences[0].trim();
  if (first.length > 100) {
    return first.substring(0, 97) + '...';
  }
  return first;
}

function extractInsightFromAssistant(content: string): string | null {
  const insightPhrases = [
    'underneath', 'pattern', 'seems like', 'often when', 'this connects to',
    'what might be happening', 'the real need', 'familiar pattern',
  ];

  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();
    if (insightPhrases.some(p => lower.includes(p))) {
      const trimmed = sentence.trim();
      return trimmed.length > 120 ? trimmed.substring(0, 117) + '...' : trimmed;
    }
  }

  return null;
}

export function compressLongMessage(content: string, maxTokens: number): string {
  const currentTokens = estimateTokens(content);
  if (currentTokens <= maxTokens) return content;

  const maxChars = maxTokens * 4;
  const sentences = content.split(/(?<=[.!?])\s+/);
  let result = '';

  for (const sentence of sentences) {
    if ((result + sentence).length > maxChars) break;
    result += (result ? ' ' : '') + sentence;
  }

  return result || content.substring(0, maxChars);
}
