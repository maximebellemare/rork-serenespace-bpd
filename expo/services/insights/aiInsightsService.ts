import { MemoryProfile } from '@/types/memory';
import { SupportiveInterpretation } from '@/types/ai';

export function generateSupportiveInterpretations(profile: MemoryProfile): SupportiveInterpretation[] {
  const interpretations: SupportiveInterpretation[] = [];

  if (profile.topTriggers.length > 0) {
    const topTrigger = profile.topTriggers[0].label.toLowerCase();

    if (topTrigger.includes('reject') || topTrigger.includes('abandon') || topTrigger.includes('ignor')) {
      interpretations.push({
        id: 'interp-trigger-abandon',
        text: 'You seem to feel most activated when connection feels uncertain. That makes sense \u2014 your need for reassurance is valid.',
        category: 'trigger',
        sentiment: 'gentle',
      });
    } else if (topTrigger.includes('conflict') || topTrigger.includes('criticiz')) {
      interpretations.push({
        id: 'interp-trigger-conflict',
        text: 'Conflict appears to be a strong trigger for you. Remember \u2014 disagreement doesn\'t always mean disconnection.',
        category: 'trigger',
        sentiment: 'gentle',
      });
    } else if (topTrigger.includes('uncertain') || topTrigger.includes('wait') || topTrigger.includes('reply') || topTrigger.includes('silence')) {
      interpretations.push({
        id: 'interp-trigger-uncertainty',
        text: 'Uncertainty in communication appears to be a frequent trigger. Silence can feel loud when your nervous system is watching for danger.',
        category: 'trigger',
        sentiment: 'gentle',
      });
    } else {
      interpretations.push({
        id: 'interp-trigger-general',
        text: `"${profile.topTriggers[0].label}" comes up often in your check-ins. Noticing this pattern is already a form of growth.`,
        category: 'trigger',
        sentiment: 'observational',
      });
    }

    if (profile.topTriggers.length >= 2) {
      const second = profile.topTriggers[1].label.toLowerCase();
      if (second.includes('disconnect') || second.includes('mixed') || second.includes('signal')) {
        interpretations.push({
          id: 'interp-trigger-secondary',
          text: 'You seem especially activated by disconnection or mixed signals. That sensitivity isn\'t a flaw \u2014 it\'s your history speaking.',
          category: 'trigger',
          sentiment: 'gentle',
        });
      }
    }
  }

  if (profile.topEmotions.length > 0) {
    const topEmotion = profile.topEmotions[0].label.toLowerCase();

    if (topEmotion.includes('anxious') || topEmotion.includes('fear') || topEmotion.includes('worry')) {
      interpretations.push({
        id: 'interp-emotion-anxiety',
        text: 'Anxiety appears frequently in your check-ins. Your nervous system is trying to protect you \u2014 grounding exercises may help signal safety.',
        category: 'emotion',
        sentiment: 'gentle',
      });
    } else if (topEmotion.includes('sad') || topEmotion.includes('empty') || topEmotion.includes('lonely')) {
      interpretations.push({
        id: 'interp-emotion-sadness',
        text: 'Sadness has been a recurring feeling. Allowing yourself to feel it \u2014 rather than pushing it away \u2014 is actually a healthy response.',
        category: 'emotion',
        sentiment: 'gentle',
      });
    } else if (topEmotion.includes('anger') || topEmotion.includes('angry') || topEmotion.includes('frustrat')) {
      interpretations.push({
        id: 'interp-emotion-anger',
        text: 'Anger and frustration have been showing up. Often, underneath anger there is a hurt or unmet need trying to be heard.',
        category: 'emotion',
        sentiment: 'gentle',
      });
    } else {
      interpretations.push({
        id: 'interp-emotion-general',
        text: `"${profile.topEmotions[0].label}" is your most frequent emotion. Understanding this gives you power to respond to it more skillfully.`,
        category: 'emotion',
        sentiment: 'observational',
      });
    }

    if (profile.topEmotions.length >= 2) {
      const pair = [profile.topEmotions[0].label.toLowerCase(), profile.topEmotions[1].label.toLowerCase()];
      const hasAnxiety = pair.some(e => e.includes('anxi') || e.includes('fear') || e.includes('worry'));
      const hasHurt = pair.some(e => e.includes('hurt') || e.includes('sad') || e.includes('pain'));
      if (hasAnxiety && hasHurt) {
        interpretations.push({
          id: 'interp-emotion-pair',
          text: `${profile.topEmotions[0].label} and ${profile.topEmotions[1].label} seem to come up together often. That is a common pairing when emotional safety feels uncertain.`,
          category: 'emotion',
          sentiment: 'observational',
        });
      }
    }
  }

  if (profile.topUrges.length > 0) {
    const topUrge = profile.topUrges[0].label.toLowerCase();
    if (topUrge.includes('contact') || topUrge.includes('reach out') || topUrge.includes('text') || topUrge.includes('call')) {
      interpretations.push({
        id: 'interp-urge-contact',
        text: 'There may be a pattern of wanting immediate contact when distress rises. That urge for connection is human \u2014 but pausing first can protect it.',
        category: 'pattern',
        sentiment: 'gentle',
      });
    } else if (topUrge.includes('withdraw') || topUrge.includes('isolat') || topUrge.includes('hide') || topUrge.includes('avoid')) {
      interpretations.push({
        id: 'interp-urge-withdraw',
        text: 'Withdrawal appears more common after high-intensity moments. It\'s okay to need space \u2014 just notice if it becomes avoidance.',
        category: 'pattern',
        sentiment: 'gentle',
      });
    } else {
      interpretations.push({
        id: 'interp-urge-general',
        text: `When distressed, the urge to "${profile.topUrges[0].label}" seems to come up often. Naming urges takes away some of their power.`,
        category: 'pattern',
        sentiment: 'observational',
      });
    }
  }

  if (profile.mostEffectiveCoping) {
    interpretations.push({
      id: 'interp-coping-effective',
      text: `"${profile.mostEffectiveCoping.label}" seems to work well for you. Leaning into what helps is a sign of self-awareness.`,
      category: 'coping',
      sentiment: 'encouraging',
    });
  }

  if (profile.copingToolsUsed.length >= 3) {
    interpretations.push({
      id: 'interp-coping-variety',
      text: 'You\'re building a diverse toolkit of coping strategies. Having options means more resilience in difficult moments.',
      category: 'coping',
      sentiment: 'encouraging',
    });
  }

  if (profile.intensityTrend === 'rising') {
    interpretations.push({
      id: 'interp-trend-rising',
      text: 'Your emotional intensity has been higher recently. This isn\'t a failure \u2014 it may mean you\'re processing something important. Be extra gentle with yourself.',
      category: 'pattern',
      sentiment: 'gentle',
    });
  } else if (profile.intensityTrend === 'falling') {
    interpretations.push({
      id: 'interp-trend-falling',
      text: 'Your distress levels have been trending downward. That\'s real progress, even if it doesn\'t always feel like it.',
      category: 'pattern',
      sentiment: 'encouraging',
    });
  }

  if (profile.messageUsage.totalRewrites > 2) {
    interpretations.push({
      id: 'interp-message-rewrite',
      text: 'You tend to use message support during relationship stress. Choosing to rewrite rather than react is a genuine skill.',
      category: 'coping',
      sentiment: 'encouraging',
    });
  }

  if (profile.messageUsage.totalPauses > 0 && profile.messageUsage.pauseSuccessRate > 40) {
    interpretations.push({
      id: 'interp-message-pause',
      text: 'You are pausing before reacting more often lately. That space between impulse and action is where change happens.',
      category: 'pattern',
      sentiment: 'encouraging',
    });
  }

  if (profile.relationshipPatterns.length > 0) {
    const rp = profile.relationshipPatterns[0];
    interpretations.push({
      id: 'interp-relationship-pattern',
      text: `${rp.pattern} Recognizing this connection can help you respond differently next time.`,
      category: 'relationship',
      sentiment: 'observational',
    });
  }

  if (profile.copingSuccessRate >= 50) {
    interpretations.push({
      id: 'interp-success-rate',
      text: `You're managing your emotions effectively ${profile.copingSuccessRate}% of the time. That resilience is real and earned.`,
      category: 'coping',
      sentiment: 'encouraging',
    });
  }

  if (profile.weeklyCheckInAvg >= 3) {
    interpretations.push({
      id: 'interp-consistency',
      text: 'Your consistent check-ins show genuine commitment to understanding yourself. That takes courage.',
      category: 'pattern',
      sentiment: 'encouraging',
    });
  }

  return interpretations;
}
