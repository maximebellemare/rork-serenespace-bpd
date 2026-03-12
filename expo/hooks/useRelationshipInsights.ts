import { useMemo } from 'react';
import { useApp } from '@/providers/AppProvider';
import { analyzeRelationshipPatterns } from '@/services/relationships/relationshipInsightsService';
import { RelationshipAnalysis, RelationshipInsight } from '@/types/relationships';

export function useRelationshipInsights(): RelationshipAnalysis & {
  hasData: boolean;
  triggerInsights: RelationshipInsight[];
  emotionInsights: RelationshipInsight[];
  communicationInsights: RelationshipInsight[];
  trendInsights: RelationshipInsight[];
} {
  const { messageDrafts, journalEntries } = useApp();

  return useMemo(() => {
    const analysis = analyzeRelationshipPatterns(messageDrafts, journalEntries);

    const triggerInsights = analysis.insights.filter(i => i.type === 'trigger');
    const emotionInsights = analysis.insights.filter(i => i.type === 'pattern');
    const communicationInsights = analysis.insights.filter(
      i => i.type === 'pattern' && (i.id.startsWith('intent_') || i.id.startsWith('reassurance_'))
    );
    const trendInsights = analysis.insights.filter(i => i.type === 'trend');

    const emotionOnly = emotionInsights.filter(
      i => i.id.startsWith('emotion_') || i.id.startsWith('abandon_')
    );

    return {
      ...analysis,
      hasData: analysis.totalMessagesAnalyzed > 0,
      triggerInsights,
      emotionInsights: emotionOnly,
      communicationInsights,
      trendInsights,
    };
  }, [messageDrafts, journalEntries]);
}
