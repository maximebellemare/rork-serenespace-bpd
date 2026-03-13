import { useState, useCallback, useRef, useEffect } from 'react';
import {
  MessageGuardStep,
  ToneAnalysis,
  ResponseStyleCard,
  MessageTone,
  SecureRewriteOptions,
  MessageGuardSession,
} from '@/types/messageGuard';
import { analyzeTone } from '@/services/messages/messageToneAnalyzer';
import { buildSecureRewrite } from '@/services/messages/secureRewriteService';
import {
  generateResponseStyles,
  saveGuardSession,
} from '@/services/messages/messageGuardService';

export function useMessageGuard() {
  const [messageText, setMessageText] = useState<string>('');
  const [step, setStep] = useState<MessageGuardStep>('input');
  const [toneAnalysis, setToneAnalysis] = useState<ToneAnalysis | null>(null);
  const [responseStyles, setResponseStyles] = useState<ResponseStyleCard[]>([]);
  const [selectedTone, setSelectedTone] = useState<MessageTone | null>(null);
  const [secureRewrite, setSecureRewrite] = useState<string>('');
  const [rewriteOptions, setRewriteOptions] = useState<SecureRewriteOptions>({
    reduceUrgency: true,
    removeBlame: true,
    addEmotionalClarity: true,
    addBoundaries: false,
  });
  const [delayMinutes, setDelayMinutes] = useState<number | null>(null);
  const [delayRemaining, setDelayRemaining] = useState<number>(0);
  const [isDelaying, setIsDelaying] = useState<boolean>(false);
  const [draftSaved, setDraftSaved] = useState<boolean>(false);

  const delayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (delayTimerRef.current) {
        clearInterval(delayTimerRef.current);
      }
    };
  }, []);

  const analyzeMessage = useCallback(() => {
    if (!messageText.trim()) return;
    console.log('[useMessageGuard] Analyzing message');

    const analysis = analyzeTone(messageText);
    setToneAnalysis(analysis);
    setStep('analysis');

    const styles = generateResponseStyles(messageText, analysis);
    setResponseStyles(styles);

    const secureCard = styles.find(s => s.tone === 'secure');
    if (secureCard) {
      setSecureRewrite(secureCard.rewrittenMessage);
    }
  }, [messageText]);

  const proceedToStyles = useCallback(() => {
    setStep('styles');
  }, []);

  const selectStyle = useCallback((tone: MessageTone) => {
    setSelectedTone(tone);
    if (tone === 'secure' && toneAnalysis) {
      setStep('refine');
    }
  }, [toneAnalysis]);

  const updateRewriteOption = useCallback(<K extends keyof SecureRewriteOptions>(
    key: K,
    value: SecureRewriteOptions[K],
  ) => {
    setRewriteOptions(prev => {
      const updated = { ...prev, [key]: value };
      if (toneAnalysis) {
        const newRewrite = buildSecureRewrite(messageText, toneAnalysis, updated);
        setSecureRewrite(newRewrite);
      }
      return updated;
    });
  }, [messageText, toneAnalysis]);

  const startDelay = useCallback((minutes: number) => {
    setDelayMinutes(minutes);
    setDelayRemaining(minutes * 60);
    setIsDelaying(true);
    setStep('pause');

    if (delayTimerRef.current) {
      clearInterval(delayTimerRef.current);
    }

    delayTimerRef.current = setInterval(() => {
      setDelayRemaining(prev => {
        if (prev <= 1) {
          if (delayTimerRef.current) {
            clearInterval(delayTimerRef.current);
          }
          setIsDelaying(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const skipDelay = useCallback(() => {
    if (delayTimerRef.current) {
      clearInterval(delayTimerRef.current);
    }
    setIsDelaying(false);
    setDelayRemaining(0);
  }, []);

  const saveDraft = useCallback(async () => {
    if (!toneAnalysis) return;

    const session: MessageGuardSession = {
      id: `guard_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      originalMessage: messageText,
      toneAnalysis,
      responseStyles,
      selectedTone,
      secureRewrite: secureRewrite || null,
      delayMinutes,
      savedAsDraft: true,
      timestamp: Date.now(),
    };

    await saveGuardSession(session);
    setDraftSaved(true);
    console.log('[useMessageGuard] Draft saved:', session.id);
  }, [messageText, toneAnalysis, responseStyles, selectedTone, secureRewrite, delayMinutes]);

  const reset = useCallback(() => {
    setMessageText('');
    setStep('input');
    setToneAnalysis(null);
    setResponseStyles([]);
    setSelectedTone(null);
    setSecureRewrite('');
    setRewriteOptions({
      reduceUrgency: true,
      removeBlame: true,
      addEmotionalClarity: true,
      addBoundaries: false,
    });
    setDelayMinutes(null);
    setDelayRemaining(0);
    setIsDelaying(false);
    setDraftSaved(false);
    if (delayTimerRef.current) {
      clearInterval(delayTimerRef.current);
    }
  }, []);

  const goBack = useCallback(() => {
    switch (step) {
      case 'analysis':
        setStep('input');
        break;
      case 'styles':
        setStep('analysis');
        break;
      case 'refine':
        setStep('styles');
        setSelectedTone(null);
        break;
      case 'pause':
        if (delayTimerRef.current) {
          clearInterval(delayTimerRef.current);
        }
        setIsDelaying(false);
        setStep(selectedTone === 'secure' ? 'refine' : 'styles');
        break;
    }
  }, [step, selectedTone]);

  return {
    messageText,
    setMessageText,
    step,
    toneAnalysis,
    responseStyles,
    selectedTone,
    secureRewrite,
    rewriteOptions,
    delayMinutes,
    delayRemaining,
    isDelaying,
    draftSaved,
    analyzeMessage,
    proceedToStyles,
    selectStyle,
    updateRewriteOption,
    startDelay,
    skipDelay,
    saveDraft,
    reset,
    goBack,
  };
}
