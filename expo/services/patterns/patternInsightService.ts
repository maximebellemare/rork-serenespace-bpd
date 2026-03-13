import {
  PatternAnalysis,
  TriggerPattern,
  EmotionPattern,
  UrgePattern,
  CopingEffectiveness,
  RelationshipStressSignal,
  GrowthSignal,
} from '@/services/patterns/patternEngine';

export interface PatternInsight {
  id: string;
  narrative: string;
  category: 'trigger' | 'emotion' | 'urge' | 'coping' | 'relationship' | 'growth' | 'overview';
  importance: 'high' | 'medium' | 'low';
  icon: string;
}

export interface PatternInsightReport {
  overview: PatternInsight;
  triggerInsights: PatternInsight[];
  emotionInsights: PatternInsight[];
  urgeInsights: PatternInsight[];
  copingInsights: PatternInsight[];
  relationshipInsights: PatternInsight[];
  growthInsights: PatternInsight[];
  hasEnoughData: boolean;
}

function buildOverview(analysis: PatternAnalysis): PatternInsight {
  const { totalEntries, avgDistress, distressTrend, periodDays } = analysis;

  if (totalEntries < 3) {
    return {
      id: 'overview_empty',
      narrative: 'A few more check-ins will help reveal your emotional patterns. Each one adds clarity.',
      category: 'overview',
      importance: 'medium',
      icon: 'BarChart3',
    };
  }

  const trendText = distressTrend === 'improving'
    ? 'Distress appears to be easing over time.'
    : distressTrend === 'worsening'
      ? 'Intensity seems higher recently. Extra support may help.'
      : distressTrend === 'stable'
        ? 'Your distress levels have stayed fairly steady.'
        : '';

  const topTrigger = analysis.triggers[0];
  const triggerText = topTrigger
    ? ` ${topTrigger.label} appears to be your most common trigger.`
    : '';

  return {
    id: 'overview_main',
    narrative: `Over the past ${periodDays} days, you checked in ${totalEntries} times with an average distress of ${avgDistress}/10. ${trendText}${triggerText}`,
    category: 'overview',
    importance: 'high',
    icon: 'BarChart3',
  };
}

function buildTriggerInsights(triggers: TriggerPattern[]): PatternInsight[] {
  const insights: PatternInsight[] = [];

  for (const trigger of triggers.slice(0, 3)) {
    const emotionText = trigger.relatedEmotions.length > 0
      ? ` It often brings ${trigger.relatedEmotions.slice(0, 2).join(' and ').toLowerCase()}.`
      : '';
    const trendText = trigger.trend === 'increasing'
      ? ' This trigger appears more often recently.'
      : trigger.trend === 'decreasing'
        ? ' This trigger seems less frequent lately.'
        : '';

    insights.push({
      id: `trigger_${trigger.label}`,
      narrative: `${trigger.label} appeared in ${trigger.percentage}% of check-ins with an average intensity of ${trigger.avgIntensity}/10.${emotionText}${trendText}`,
      category: 'trigger',
      importance: trigger.percentage >= 30 ? 'high' : trigger.percentage >= 15 ? 'medium' : 'low',
      icon: 'Zap',
    });
  }

  if (triggers.length >= 2) {
    const relTriggers = triggers.filter(t => t.category === 'relationship');
    if (relTriggers.length >= 2) {
      insights.push({
        id: 'trigger_relationship_cluster',
        narrative: `Relationship-related triggers like ${relTriggers.map(t => t.label.toLowerCase()).slice(0, 2).join(' and ')} appear frequently together.`,
        category: 'trigger',
        importance: 'high',
        icon: 'Heart',
      });
    }
  }

  return insights;
}

function buildEmotionInsights(emotions: EmotionPattern[]): PatternInsight[] {
  const insights: PatternInsight[] = [];

  for (const emotion of emotions.slice(0, 3)) {
    const triggerText = emotion.commonTriggers.length > 0
      ? ` Often triggered by ${emotion.commonTriggers.slice(0, 2).join(' or ').toLowerCase()}.`
      : '';

    insights.push({
      id: `emotion_${emotion.label}`,
      narrative: `${emotion.emoji} ${emotion.label} appeared in ${emotion.percentage}% of check-ins.${triggerText}`,
      category: 'emotion',
      importance: emotion.percentage >= 25 ? 'high' : 'medium',
      icon: 'Heart',
    });
  }

  if (emotions.length >= 2) {
    const highIntensity = emotions.filter(e => e.avgIntensity >= 7);
    if (highIntensity.length >= 2) {
      insights.push({
        id: 'emotion_high_intensity',
        narrative: `${highIntensity.map(e => e.label).join(' and ')} tend to arrive at high intensity. Noticing them early may help with regulation.`,
        category: 'emotion',
        importance: 'high',
        icon: 'Flame',
      });
    }
  }

  return insights;
}

function buildUrgeInsights(urges: UrgePattern[]): PatternInsight[] {
  const insights: PatternInsight[] = [];

  for (const urge of urges.slice(0, 3)) {
    const precursorText = urge.commonPrecursors.length > 0
      ? ` Often preceded by ${urge.commonPrecursors.slice(0, 2).join(' or ').toLowerCase()}.`
      : '';

    insights.push({
      id: `urge_${urge.label}`,
      narrative: `The urge to ${urge.label.toLowerCase()} appeared in ${urge.percentage}% of check-ins.${precursorText}`,
      category: 'urge',
      importance: urge.percentage >= 25 ? 'high' : 'medium',
      icon: 'AlertTriangle',
    });
  }

  return insights;
}

function buildCopingInsights(coping: CopingEffectiveness[]): PatternInsight[] {
  const insights: PatternInsight[] = [];

  const effective = coping.filter(c => c.avgReduction > 0);
  if (effective.length > 0) {
    const best = effective[0];
    insights.push({
      id: `coping_best`,
      narrative: `${best.tool} appears most effective, reducing distress by an average of ${best.avgReduction} points across ${best.timesUsed} uses.`,
      category: 'coping',
      importance: 'high',
      icon: 'Shield',
    });
  }

  for (const tool of effective.slice(1, 3)) {
    insights.push({
      id: `coping_${tool.tool}`,
      narrative: `${tool.tool} reduced distress by about ${tool.avgReduction} points on average.`,
      category: 'coping',
      importance: 'medium',
      icon: 'Shield',
    });
  }

  if (coping.length === 0) {
    insights.push({
      id: 'coping_none',
      narrative: 'Try logging which tools you use after check-ins. This helps reveal what works best for you.',
      category: 'coping',
      importance: 'low',
      icon: 'Shield',
    });
  }

  return insights;
}

function buildRelationshipInsights(signals: RelationshipStressSignal[]): PatternInsight[] {
  const insights: PatternInsight[] = [];

  for (const signal of signals.slice(0, 3)) {
    const emotionText = signal.commonEmotions.length > 0
      ? ` It often brings ${signal.commonEmotions.slice(0, 2).join(' and ').toLowerCase()}.`
      : '';
    const urgeText = signal.commonUrges.length > 0
      ? ` Common urges include ${signal.commonUrges.slice(0, 2).join(' and ').toLowerCase()}.`
      : '';

    insights.push({
      id: `rel_${signal.label}`,
      narrative: `${signal.label} appeared ${signal.frequency} times with average intensity ${signal.avgIntensity}/10.${emotionText}${urgeText}`,
      category: 'relationship',
      importance: signal.frequency >= 3 ? 'high' : 'medium',
      icon: 'Users',
    });
  }

  return insights;
}

function buildGrowthInsights(signals: GrowthSignal[]): PatternInsight[] {
  return signals.map((signal, i) => ({
    id: `growth_${i}`,
    narrative: signal.narrative,
    category: 'growth' as const,
    importance: signal.type === 'positive' ? 'high' as const : 'medium' as const,
    icon: signal.type === 'positive' ? 'TrendingUp' : signal.type === 'emerging' ? 'Sprout' : 'Eye',
  }));
}

export function generatePatternInsights(analysis: PatternAnalysis): PatternInsightReport {
  console.log('[PatternInsightService] Generating insights from analysis');

  const hasEnoughData = analysis.totalEntries >= 3;

  const report: PatternInsightReport = {
    overview: buildOverview(analysis),
    triggerInsights: buildTriggerInsights(analysis.triggers),
    emotionInsights: buildEmotionInsights(analysis.emotions),
    urgeInsights: buildUrgeInsights(analysis.urges),
    copingInsights: buildCopingInsights(analysis.copingEffectiveness),
    relationshipInsights: buildRelationshipInsights(analysis.relationshipSignals),
    growthInsights: buildGrowthInsights(analysis.growthSignals),
    hasEnoughData,
  };

  console.log('[PatternInsightService] Generated insights:', {
    triggers: report.triggerInsights.length,
    emotions: report.emotionInsights.length,
    urges: report.urgeInsights.length,
    coping: report.copingInsights.length,
    relationship: report.relationshipInsights.length,
    growth: report.growthInsights.length,
  });

  return report;
}
