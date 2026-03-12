import { useMemo } from 'react';
import { useApp } from '@/providers/AppProvider';
import { detectRelationshipSpiral } from '@/services/prediction/relationshipSpiralService';
import { interpretRiskSignals, getQuickMessageIntervention, getCompanionContext, RiskInterpretation } from '@/services/prediction/relationshipRiskInterpreter';
import { RelationshipSpiralResult } from '@/types/relationshipPrediction';

export interface UseRelationshipSpiralResult extends RelationshipSpiralResult {
  interpretations: RiskInterpretation[];
  messageIntervention: string | null;
  companionContext: string | null;
  isActive: boolean;
}

export function useRelationshipSpiral(): UseRelationshipSpiralResult {
  const { journalEntries, messageDrafts } = useApp();

  return useMemo(() => {
    const result = detectRelationshipSpiral(journalEntries, messageDrafts);
    const interpretations = interpretRiskSignals(result);
    const messageIntervention = getQuickMessageIntervention(result);
    const companionContext = getCompanionContext(result);
    const isActive = result.riskLevel !== 'calm';

    return {
      ...result,
      interpretations,
      messageIntervention,
      companionContext,
      isActive,
    };
  }, [journalEntries, messageDrafts]);
}
