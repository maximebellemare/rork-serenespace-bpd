import { SmartJournalEntry } from '@/types/journalEntry';
import { JournalEntry, MessageDraft } from '@/types';
import { EnhancedMessageOutcome } from '@/types/messageOutcome';

export interface CrossLoopContext {
  recentJournalSummary: string | null;
  recentJournalEmotions: string[];
  recentJournalTriggers: string[];
  recentMessageOutcomes: MessageOutcomeSummary[];
  hasRecentConflictJournal: boolean;
  hasRecentMessageSession: boolean;
  journalToCompanionPrompt: string | null;
  messageToJournalPrompt: string | null;
  messageToCompanionContext: string | null;
  journalToMessageSuggestion: string | null;
}

export interface MessageOutcomeSummary {
  emotionalState: string | null;
  pathUsed: string | null;
  sentStatus: string;
  regretReported: boolean | null;
  timeAgo: string;
}

export interface JournalConnectionSuggestion {
  type: 'discuss_with_companion' | 'use_message_tool' | 'try_skill' | 'write_reflection';
  label: string;
  emoji: string;
  route: string;
  params?: Record<string, string>;
}

export interface CompanionContextEnrichment {
  recentSmartJournalNarrative: string;
  recentMessageOutcomeNarrative: string;
  crossSystemInsights: string[];
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const THREE_DAYS_MS = 3 * ONE_DAY_MS;

export function buildCrossLoopContext(
  smartEntries: SmartJournalEntry[],
  checkInEntries: JournalEntry[],
  messageOutcomes: EnhancedMessageOutcome[],
  messageDrafts: MessageDraft[],
): CrossLoopContext {
  const now = Date.now();

  const recentSmart = smartEntries.filter(e => now - e.timestamp < THREE_DAYS_MS);
  const recentCheckIns = checkInEntries.filter(e => now - e.timestamp < THREE_DAYS_MS);
  const recentOutcomes = messageOutcomes.filter(o => now - o.createdAt < THREE_DAYS_MS);

  const recentJournalEmotions: string[] = [];
  const recentJournalTriggers: string[] = [];

  for (const entry of recentSmart.slice(0, 5)) {
    for (const e of entry.emotions) {
      if (!recentJournalEmotions.includes(e.label)) recentJournalEmotions.push(e.label);
    }
    for (const t of entry.triggers) {
      if (!recentJournalTriggers.includes(t.label)) recentJournalTriggers.push(t.label);
    }
  }

  for (const entry of recentCheckIns.slice(0, 5)) {
    for (const e of entry.checkIn.emotions) {
      if (!recentJournalEmotions.includes(e.label)) recentJournalEmotions.push(e.label);
    }
    for (const t of entry.checkIn.triggers) {
      if (!recentJournalTriggers.includes(t.label)) recentJournalTriggers.push(t.label);
    }
  }

  const hasRecentConflictJournal = recentSmart.some(e =>
    e.format === 'relationship_conflict' ||
    e.triggers.some(t => t.label.toLowerCase().includes('conflict') || t.label.toLowerCase().includes('relationship'))
  ) || recentCheckIns.some(e =>
    e.checkIn.triggers.some(t => t.label.toLowerCase().includes('conflict') || t.label.toLowerCase().includes('relationship'))
  );

  const hasRecentMessageSession = recentOutcomes.length > 0 || messageDrafts.some(d => now - d.timestamp < ONE_DAY_MS);

  let recentJournalSummary: string | null = null;
  if (recentSmart.length > 0) {
    const latest = recentSmart[0];
    const emotionStr = latest.emotions.slice(0, 2).map(e => e.label).join(' and ');
    const timeAgo = formatTimeAgo(latest.timestamp);
    recentJournalSummary = `${timeAgo}, you journaled about ${emotionStr ? emotionStr : 'your thoughts'}${latest.title ? ` ("${latest.title}")` : ''}.`;
  }

  let journalToCompanionPrompt: string | null = null;
  if (recentSmart.length > 0 && recentSmart[0].distressLevel >= 6) {
    journalToCompanionPrompt = `I recently wrote about something difficult in my journal. Can you help me process it?`;
  }

  let messageToJournalPrompt: string | null = null;
  const lastOutcome = recentOutcomes[0];
  if (lastOutcome) {
    if (lastOutcome.regretReported === true) {
      messageToJournalPrompt = 'Reflect on a message I regretted';
    } else if (lastOutcome.sentStatus === 'not_sent' || lastOutcome.sentStatus === 'saved_unsent') {
      messageToJournalPrompt = 'Process the emotions behind a message I chose not to send';
    }
  }

  let messageToCompanionContext: string | null = null;
  if (lastOutcome) {
    const parts: string[] = [];
    if (lastOutcome.emotionalState) parts.push(`feeling ${lastOutcome.emotionalState}`);
    if (lastOutcome.pathTypeSelected) parts.push(`chose the ${lastOutcome.pathTypeSelected} approach`);
    if (lastOutcome.sentStatus === 'not_sent') parts.push('decided not to send');
    if (lastOutcome.regretReported === true) parts.push('reported regret');
    if (parts.length > 0) {
      messageToCompanionContext = `Recent message session: ${parts.join(', ')}.`;
    }
  }

  let journalToMessageSuggestion: string | null = null;
  if (hasRecentConflictJournal && !hasRecentMessageSession) {
    journalToMessageSuggestion = 'You recently journaled about a conflict. The Message Safety tool can help you respond clearly.';
  }

  const recentMessageOutcomes: MessageOutcomeSummary[] = recentOutcomes.slice(0, 3).map(o => ({
    emotionalState: o.emotionalState,
    pathUsed: o.pathTypeSelected,
    sentStatus: o.sentStatus,
    regretReported: o.regretReported,
    timeAgo: formatTimeAgo(o.createdAt),
  }));

  return {
    recentJournalSummary,
    recentJournalEmotions,
    recentJournalTriggers,
    recentMessageOutcomes,
    hasRecentConflictJournal,
    hasRecentMessageSession,
    journalToCompanionPrompt,
    messageToJournalPrompt,
    messageToCompanionContext,
    journalToMessageSuggestion,
  };
}

export function buildCompanionContextEnrichment(
  smartEntries: SmartJournalEntry[],
  messageOutcomes: EnhancedMessageOutcome[],
): CompanionContextEnrichment {
  const now = Date.now();
  const recentSmart = smartEntries.filter(e => now - e.timestamp < THREE_DAYS_MS).slice(0, 5);
  const recentOutcomes = messageOutcomes.filter(o => now - o.createdAt < THREE_DAYS_MS).slice(0, 5);

  let recentSmartJournalNarrative = '';
  if (recentSmart.length > 0) {
    const summaries = recentSmart.slice(0, 3).map(e => {
      const emotions = e.emotions.slice(0, 2).map(em => em.label).join(', ');
      const triggers = e.triggers.slice(0, 2).map(t => t.label).join(', ');
      const distress = e.distressLevel;
      const format = e.format.replace(/_/g, ' ');
      const timeStr = formatTimeAgo(e.timestamp);
      let s = `${timeStr}: ${format}`;
      if (emotions) s += ` about ${emotions}`;
      if (triggers) s += ` (triggered by ${triggers})`;
      s += `, distress ${distress}/10`;
      if (e.aiInsight?.summary) s += `. Insight: ${e.aiInsight.summary.substring(0, 120)}`;
      return s;
    });
    recentSmartJournalNarrative = `[RECENT JOURNAL ENTRIES]\n${summaries.join('\n')}`;
  }

  let recentMessageOutcomeNarrative = '';
  if (recentOutcomes.length > 0) {
    const summaries = recentOutcomes.slice(0, 3).map(o => {
      const parts: string[] = [];
      parts.push(formatTimeAgo(o.createdAt));
      if (o.emotionalState) parts.push(`felt ${o.emotionalState}`);
      if (o.pathTypeSelected) parts.push(`used ${o.pathTypeSelected} path`);
      if (o.sentStatus) parts.push(`status: ${o.sentStatus}`);
      if (o.regretReported === true) parts.push('regretted');
      if (o.regretReported === false) parts.push('no regret');
      if (o.conflictResult) parts.push(`result: ${o.conflictResult}`);
      return parts.join(', ');
    });
    recentMessageOutcomeNarrative = `[RECENT MESSAGE SESSIONS]\n${summaries.join('\n')}`;
  }

  const crossSystemInsights: string[] = [];

  const highDistressJournals = recentSmart.filter(e => e.distressLevel >= 7);
  const regrettedMessages = recentOutcomes.filter(o => o.regretReported === true);

  if (highDistressJournals.length > 0 && regrettedMessages.length > 0) {
    crossSystemInsights.push('The user has both high-distress journal entries and regretted messages recently. They may be in a difficult period. Be extra attentive.');
  }

  if (recentSmart.some(e => e.format === 'relationship_conflict') && recentOutcomes.length > 0) {
    crossSystemInsights.push('The user recently journaled about relationship conflict AND used the message tool. They may still be processing a communication situation.');
  }

  const notSentCount = recentOutcomes.filter(o => o.sentStatus === 'not_sent' || o.sentStatus === 'saved_unsent').length;
  if (notSentCount >= 2) {
    crossSystemInsights.push('The user has chosen not to send multiple messages recently. This shows impulse control growth. Acknowledge this if appropriate.');
  }

  if (recentSmart.some(e => e.format === 'letter_not_sent')) {
    crossSystemInsights.push('The user recently wrote an unsent letter in their journal. They may be processing feelings they cannot express directly.');
  }

  return {
    recentSmartJournalNarrative,
    recentMessageOutcomeNarrative,
    crossSystemInsights,
  };
}

export function getJournalConnectionSuggestions(
  entry: SmartJournalEntry,
): JournalConnectionSuggestion[] {
  const suggestions: JournalConnectionSuggestion[] = [];

  if (entry.distressLevel >= 5) {
    suggestions.push({
      type: 'discuss_with_companion',
      label: 'Discuss with Companion',
      emoji: '✨',
      route: '/companion/chat',
      params: {
        prefill: `I just wrote in my journal about ${entry.emotions[0]?.label ?? 'something difficult'}. Can you help me process this?`,
      },
    });
  }

  const isConflictRelated = entry.format === 'relationship_conflict' ||
    entry.triggers.some(t => t.label.toLowerCase().includes('conflict') || t.label.toLowerCase().includes('communication'));

  if (isConflictRelated) {
    suggestions.push({
      type: 'use_message_tool',
      label: 'Compose a safe response',
      emoji: '💬',
      route: '/(tabs)/messages',
    });
  }

  if (entry.aiInsight?.cognitiveDistortion) {
    suggestions.push({
      type: 'try_skill',
      label: 'Try Check the Facts',
      emoji: '🔍',
      route: '/exercise',
      params: { id: 'c1' },
    });
  }

  if (entry.distressLevel >= 7) {
    suggestions.push({
      type: 'try_skill',
      label: 'Grounding exercise',
      emoji: '🌿',
      route: '/grounding-mode',
    });
  }

  return suggestions;
}

export function getMessageSessionCompanionPrompt(
  outcome: EnhancedMessageOutcome,
): string {
  const parts: string[] = ['I just used the message tool.'];

  if (outcome.emotionalState) {
    parts.push(`I was feeling ${outcome.emotionalState}.`);
  }

  if (outcome.sentStatus === 'not_sent' || outcome.sentStatus === 'saved_unsent') {
    parts.push('I decided not to send the message.');
  } else if (outcome.sentStatus === 'sent_now') {
    parts.push('I sent it.');
  }

  if (outcome.regretReported === true) {
    parts.push("I'm feeling some regret about it.");
  }

  parts.push('Can you help me process what happened?');
  return parts.join(' ');
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}
