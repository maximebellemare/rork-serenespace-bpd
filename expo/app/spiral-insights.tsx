import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  X,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  Shield,
  Heart,
  Activity,
  ChevronRight,
  Anchor,
  Zap,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAnalytics } from '@/providers/AnalyticsProvider';
import { useSpiralDetection, useSpiralWeeklyInsight } from '@/hooks/useSpiralDetection';
import { SpiralSignal, SpiralSignalType } from '@/types/spiral';

const SIGNAL_CONFIG: Record<SpiralSignalType, { label: string; color: string; icon: React.ComponentType<{ size: number; color: string }> }> = {
  rapid_distress_escalation: { label: 'Distress escalation', color: '#C47878', icon: TrendingUp },
  repeated_rejection_language: { label: 'Rejection themes', color: '#C4956A', icon: Heart },
  relationship_conflict_loop: { label: 'Conflict cycle', color: '#9B8EC4', icon: Activity },
  late_night_spike: { label: 'Late-night intensity', color: '#8EAEC4', icon: Clock },
  emotional_volatility: { label: 'Emotional shifts', color: '#C47878', icon: Zap },
  shame_cascade: { label: 'Shame pattern', color: '#C4956A', icon: Shield },
  urge_intensification: { label: 'Strong urges', color: '#C47878', icon: AlertTriangle },
  coping_abandonment: { label: 'Coping dropped off', color: '#8EAEC4', icon: TrendingDown },
  isolation_pattern: { label: 'Withdrawal', color: '#9B8EC4', icon: Heart },
};

export default function SpiralInsightsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { trackEvent } = useAnalytics();
  const spiralResult = useSpiralDetection();
  const weeklyInsight = useSpiralWeeklyInsight();

  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

  const handleNavigate = useCallback((route: string) => {
    trackEvent('spiral_insight_action', { route });
    router.push(route as never);
  }, [router, trackEvent]);

  const riskColor = useMemo(() => {
    switch (spiralResult.riskLevel) {
      case 'high': return Colors.danger;
      case 'moderate': return Colors.accent;
      default: return Colors.success;
    }
  }, [spiralResult.riskLevel]);

  const riskLabel = useMemo(() => {
    switch (spiralResult.riskLevel) {
      case 'high': return 'High';
      case 'moderate': return 'Moderate';
      default: return 'Low';
    }
  }, [spiralResult.riskLevel]);

  const renderSignalCard = useCallback((signal: SpiralSignal) => {
    const config = SIGNAL_CONFIG[signal.type];
    const IconComp = config.icon;

    return (
      <View key={signal.id} style={styles.signalCard}>
        <View style={[styles.signalIconContainer, { backgroundColor: config.color + '18' }]}>
          <IconComp size={18} color={config.color} />
        </View>
        <View style={styles.signalContent}>
          <Text style={styles.signalLabel}>{config.label}</Text>
          <Text style={styles.signalNarrative} numberOfLines={2}>{signal.narrative}</Text>
        </View>
      </View>
    );
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Spiral Prevention</Text>
          <Text style={styles.headerSubtitle}>Your emotional early warning system</Text>
        </View>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleClose}
          activeOpacity={0.7}
          testID="spiral-insights-close"
        >
          <X size={22} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.riskSection}>
          <View style={[styles.riskCard, { borderColor: riskColor + '30' }]}>
            <View style={styles.riskHeader}>
              <View style={[styles.riskIndicator, { backgroundColor: riskColor }]} />
              <Text style={styles.riskTitle}>Current Risk Level</Text>
            </View>
            <Text style={[styles.riskValue, { color: riskColor }]}>{riskLabel}</Text>
            {spiralResult.narrative && (
              <Text style={styles.riskNarrative}>{spiralResult.narrative}</Text>
            )}
            {spiralResult.riskLevel === 'low' && (
              <Text style={styles.riskNarrative}>
                No concerning patterns detected right now. Keep tracking — awareness is your best tool.
              </Text>
            )}
          </View>
        </View>

        {spiralResult.signals.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Signals</Text>
            <Text style={styles.sectionSubtitle}>Patterns the system is tracking</Text>
            <View style={styles.signalList}>
              {spiralResult.signals.map(renderSignalCard)}
            </View>
          </View>
        )}

        {spiralResult.shouldIntervene && spiralResult.interventions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Suggested Support</Text>
            <Text style={styles.sectionSubtitle}>Tools that may help right now</Text>
            {spiralResult.interventions.slice(0, 4).map((intervention) => (
              <TouchableOpacity
                key={intervention.id}
                style={styles.supportCard}
                onPress={() => handleNavigate(intervention.route)}
                activeOpacity={0.7}
                testID={`spiral-support-${intervention.id}`}
              >
                <View style={[styles.supportIcon, { backgroundColor: Colors.primaryLight }]}>
                  <Anchor size={18} color={Colors.primary} />
                </View>
                <View style={styles.supportText}>
                  <Text style={styles.supportTitle}>{intervention.title}</Text>
                  <Text style={styles.supportDesc}>{intervention.description}</Text>
                </View>
                <ChevronRight size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {weeklyInsight && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Weekly Pattern Summary</Text>
            <Text style={styles.sectionSubtitle}>What the past 7 days show</Text>

            <View style={styles.weeklyCard}>
              <Text style={styles.weeklyNarrative}>{weeklyInsight.narrative}</Text>

              {weeklyInsight.mostCommonSignals.length > 0 && (
                <View style={styles.weeklyRow}>
                  <Text style={styles.weeklyLabel}>Most common patterns</Text>
                  <View style={styles.chipRow}>
                    {weeklyInsight.mostCommonSignals.map((s) => {
                      const config = SIGNAL_CONFIG[s.type];
                      return (
                        <View key={s.type} style={[styles.chip, { backgroundColor: config.color + '15' }]}>
                          <Text style={[styles.chipText, { color: config.color }]}>
                            {config.label} ({s.count}x)
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              {weeklyInsight.spikeTimeOfDay && (
                <View style={styles.weeklyRow}>
                  <Text style={styles.weeklyLabel}>Peak intensity time</Text>
                  <View style={styles.weeklyValueRow}>
                    <Clock size={14} color={Colors.textSecondary} />
                    <Text style={styles.weeklyValue}>{weeklyInsight.spikeTimeOfDay}</Text>
                  </View>
                </View>
              )}

              {weeklyInsight.commonTriggers.length > 0 && (
                <View style={styles.weeklyRow}>
                  <Text style={styles.weeklyLabel}>Common triggers</Text>
                  <View style={styles.chipRow}>
                    {weeklyInsight.commonTriggers.map((t) => (
                      <View key={t} style={[styles.chip, { backgroundColor: Colors.accentLight }]}>
                        <Text style={[styles.chipText, { color: Colors.accent }]}>{t}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {weeklyInsight.relationshipTriggerCount > 0 && (
                <View style={styles.weeklyRow}>
                  <Text style={styles.weeklyLabel}>Relationship-related entries</Text>
                  <Text style={styles.weeklyValue}>{weeklyInsight.relationshipTriggerCount}</Text>
                </View>
              )}

              {weeklyInsight.toolsThatHelped.length > 0 && (
                <View style={styles.weeklyRow}>
                  <Text style={styles.weeklyLabel}>What helped</Text>
                  <View style={styles.chipRow}>
                    {weeklyInsight.toolsThatHelped.map((t) => (
                      <View key={t} style={[styles.chip, { backgroundColor: Colors.successLight }]}>
                        <Text style={[styles.chipText, { color: Colors.success }]}>{t}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How This Works</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: Colors.primaryLight }]}>
                <Activity size={16} color={Colors.primary} />
              </View>
              <Text style={styles.infoText}>
                Analyzes your check-ins, journal entries, and messaging patterns
              </Text>
            </View>
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: Colors.accentLight }]}>
                <AlertTriangle size={16} color={Colors.accent} />
              </View>
              <Text style={styles.infoText}>
                Detects when familiar emotional spirals may be building
              </Text>
            </View>
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: Colors.successLight }]}>
                <Shield size={16} color={Colors.success} />
              </View>
              <Text style={styles.infoText}>
                Suggests supportive actions before things escalate
              </Text>
            </View>
          </View>
          <Text style={styles.disclaimer}>
            This system learns from your patterns over time. The more you track, the more personalized and helpful it becomes.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  riskSection: {
    marginBottom: 24,
  },
  riskCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  riskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  riskIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  riskTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  riskValue: {
    fontSize: 28,
    fontWeight: '800' as const,
    marginBottom: 8,
  },
  riskNarrative: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 14,
  },
  signalList: {
    gap: 10,
  },
  signalCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  signalIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  signalContent: {
    flex: 1,
  },
  signalLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 3,
  },
  signalNarrative: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  supportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  supportIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportText: {
    flex: 1,
  },
  supportTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  supportDesc: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  weeklyCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 18,
    gap: 16,
  },
  weeklyNarrative: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  weeklyRow: {
    gap: 6,
  },
  weeklyLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
  },
  weeklyValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  weeklyValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  infoCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    gap: 14,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  disclaimer: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 17,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
});
