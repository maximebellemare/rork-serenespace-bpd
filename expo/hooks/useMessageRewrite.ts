import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  MessageContext,
  RewriteResult,
  TriggerSuggestion,
  MessageOutcome,
} from '@/types/messages';
import { generateRewrites, generateTriggerSuggestions } from '@/services/messages/messageRewriteService';
import { buildMemoryProfile } from '@/services/memory/memoryProfileService';
import { useApp } from '@/providers/AppProvider';
import { MemoryProfile } from '@/types/memory';

export type MessageFlowStep = 'input' | 'context' | 'pause' | 'rewrites' | 'result';

export function useMessageRewrite() {
  const { journalEntries, triggerPatterns, addMessageDraft, updateMessageDraft } = useApp();
  const [lastDraftId, setLastDraftId] = useState<string | null>(null);

  const [inputText, setInputText] = useState<string>('');
  const [step, setStep] = useState<MessageFlowStep>('input');
  const [context, setContext] = useState<MessageContext>({
    relationship: null,
    emotionalState: null,
    intent: null,
    desiredOutcome: null,
  });
  const [rewrites, setRewrites] = useState<RewriteResult[]>([]);
  const [selectedRewrite, setSelectedRewrite] = useState<RewriteResult | null>(null);
  const [pauseSeconds, setPauseSeconds] = useState<number>(0);
  const [pauseRemaining, setPauseRemaining] = useState<number>(0);
  const [isPausing, setIsPausing] = useState<boolean>(false);

  const pauseTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const memoryProfile = useMemo<MemoryProfile | null>(() => {
    if (journalEntries.length === 0) return null;
    return buildMemoryProfile(
      journalEntries,
      triggerPatterns.triggerCounts,
      triggerPatterns.emotionCounts,
      triggerPatterns.urgeCounts,
    );
  }, [journalEntries, triggerPatterns]);

  const triggerSuggestions = useMemo<TriggerSuggestion[]>(() => {
    return generateTriggerSuggestions(memoryProfile);
  }, [memoryProfile]);

  useEffect(() => {
    return () => {
      if (pauseTimerRef.current) {
        clearInterval(pauseTimerRef.current);
      }
    };
  }, []);

  const updateContext = useCallback(<K extends keyof MessageContext>(
    key: K,
    value: MessageContext[K],
  ) => {
    setContext(prev => ({ ...prev, [key]: value }));
  }, []);

  const proceedToContext = useCallback(() => {
    if (!inputText.trim()) return;
    setStep('context');
  }, [inputText]);

  const proceedToRewrites = useCallback(() => {
    const results = generateRewrites(inputText, context);
    setRewrites(results);
    setStep('rewrites');
  }, [inputText, context]);

  const startPause = useCallback((seconds: number) => {
    setPauseSeconds(seconds);
    setPauseRemaining(seconds);
    setIsPausing(true);
    setStep('pause');

    if (pauseTimerRef.current) {
      clearInterval(pauseTimerRef.current);
    }

    pauseTimerRef.current = setInterval(() => {
      setPauseRemaining(prev => {
        if (prev <= 1) {
          if (pauseTimerRef.current) {
            clearInterval(pauseTimerRef.current);
          }
          setIsPausing(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const skipPause = useCallback(() => {
    if (pauseTimerRef.current) {
      clearInterval(pauseTimerRef.current);
    }
    setIsPausing(false);
    setPauseRemaining(0);
    proceedToRewrites();
  }, [proceedToRewrites]);

  const finishPause = useCallback(() => {
    proceedToRewrites();
  }, [proceedToRewrites]);

  const selectRewrite = useCallback((rewrite: RewriteResult) => {
    setSelectedRewrite(rewrite);
    setStep('result');

    const draftId = `m_${Date.now()}`;
    setLastDraftId(draftId);
    addMessageDraft({
      id: draftId,
      timestamp: Date.now(),
      originalText: inputText,
      rewrittenText: rewrite.text,
      rewriteType: rewrite.style,
      sent: false,
      paused: rewrite.style === 'delay' || rewrite.style === 'nosend',
    });
  }, [inputText, addMessageDraft]);

  const recordOutcome = useCallback((outcome: MessageOutcome) => {
    if (!lastDraftId) return;
    updateMessageDraft(lastDraftId, {
      outcome,
      outcomeTimestamp: Date.now(),
      sent: outcome === 'sent' || outcome === 'helped',
    });
  }, [lastDraftId, updateMessageDraft]);

  const reset = useCallback(() => {
    setInputText('');
    setStep('input');
    setContext({
      relationship: null,
      emotionalState: null,
      intent: null,
      desiredOutcome: null,
    });
    setRewrites([]);
    setSelectedRewrite(null);
    setPauseSeconds(0);
    setPauseRemaining(0);
    setIsPausing(false);
    setLastDraftId(null);
    if (pauseTimerRef.current) {
      clearInterval(pauseTimerRef.current);
    }
  }, []);

  const goBack = useCallback(() => {
    switch (step) {
      case 'context':
        setStep('input');
        break;
      case 'pause':
        if (pauseTimerRef.current) {
          clearInterval(pauseTimerRef.current);
        }
        setIsPausing(false);
        setStep('context');
        break;
      case 'rewrites':
        setStep('context');
        break;
      case 'result':
        setStep('rewrites');
        break;
    }
  }, [step]);

  return {
    inputText,
    setInputText,
    step,
    context,
    updateContext,
    rewrites,
    selectedRewrite,
    pauseSeconds,
    pauseRemaining,
    isPausing,
    memoryProfile,
    triggerSuggestions,
    proceedToContext,
    proceedToRewrites,
    startPause,
    skipPause,
    finishPause,
    selectRewrite,
    recordOutcome,
    reset,
    goBack,
  };
}
