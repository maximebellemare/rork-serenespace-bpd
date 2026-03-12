import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  X,
  HeartCrack,
  ChevronRight,
  Timer,
  Anchor,
  Zap,
  BookOpen,
  Sparkles,
  Wind,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  Link2,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useRelationshipSpiral } from '@/hooks/useRelationshipSpiral';
import { SpiralRiskLevel, SpiralIntervention, SpiralChain, SpiralSignal } from '@/types/relationshipPrediction';
import { RiskInterpretation } from '@/services/prediction/relationshipRiskInterpreter';

const RISK_THEME: Record<SpiralRiskLevel, { bg: string; accent: string; label: string; icon: string }> = {
  calm: { bg: Colors.primaryLight, accent: Colors.primary, label: 'Calm', icon: '🌿' },
  watchful: { bg: '#FFF9F0', accent: '#C8975A', label: 'Watchful', icon: '👀' },
  rising: { bg: '#FFF5EE', accent: '#D4764E', label: 'Rising', icon: '🌊' },
  urgent: { bg: '#FFF0ED', accent: '#C94438', label: 'Needs Attention', icon: '⚡' },
};

const INTERVENTION_ICONS: Record<string, typeof Timer> = {
  Timer,
  Anchor,
  Zap,
  BookOpen,
  Sparkles,
  Wind,
};

export default function RelationshipSpiralScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const spiral = useRelationshipSpiral();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleClose = useCallback(() => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  }, [router]);

  const handleIntervention = useCallback((route: string) => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push(route as never);
  }, [router]);

  const theme = RISK_THEME[spiral.riskLevel];
  const hasData = spiral.signals.length > 0 || spiral.chains.length > 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerHandle} />
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleClose}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <X size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <View style={[styles.heroSection, { backgroundColor: theme.bg }]}>
            <View style={styles.heroIconRow}>
              <View style={[styles.heroIcon, { backgroundColor: theme.accent + '14' }]}>
                <HeartCrack size={28} color={theme.accent} />
              </View>
            </View>
            <Text style={styles.heroTitle}>Relationship Risk Signals</Text>
            <Text style={styles.heroSubtitle}>
              Patterns that may indicate a relationship spiral is building
            </Text>

            <View style={[styles.riskIndicator, { backgroundColor: theme.accent + '12' }]}>
              <Text style={styles.riskEmoji}>{theme.icon}</Text>
              <View style={styles.riskTextWrap}>
                <Text style={[styles.riskLabel, { color: theme.accent }]}>
                  Current Level: {theme.label}
                </Text>
                <Text style={styles.riskScore}>
                  {spiral.score > 0 ? `${spiral.signals.length} active signal${spiral.signals.length !== 1 ? 's' : ''}` : 'No signals detected'}
                </Text>
              </View>
            </View>
          </View>

          {spiral.message && (
            <View style={styles.messageCard}>
              <ShieldCheck size={16} color={theme.accent} />
              <Text style={styles.messageText}>{spiral.message}</Text>
            </View>
          )}

          {spiral.supportMessage && (
            <View style={styles.supportCard}>
              <Text style={styles.supportText}>{spiral.supportMessage}</Text>
            </View>
          )}

          {spiral.interventions.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>What may help right now</Text>
              {spiral.interventions.map(intervention => (
                <InterventionCard
                  key={intervention.id}
                  intervention={intervention}
                  onPress={() => handleIntervention(intervention.route)}
                />
              ))}
            </View>
          )}

          {spiral.signals.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <TrendingUp size={16} color={Colors.textMuted} />
                <Text style={styles.sectionTitle}>Active Signals</Text>
              </View>
              {spiral.signals.map(signal => (
                <SignalCard key={signal.id} signal={signal} accentColor={theme.accent} />
              ))}
            </View>
          )}

          {spiral.chains.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Link2 size={16} color={Colors.textMuted} />
                <Text style={styles.sectionTitle}>Common Spiral Chains</Text>
              </View>
              <Text style={styles.sectionHint}>
                Patterns that tend to appear together in your data
              </Text>
              {spiral.chains.map(chain => (
                <ChainCard key={chain.id} chain={chain} />
              ))}
            </View>
          )}

          {spiral.interpretations.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>What this means</Text>
              {spiral.interpretations.map(interp => (
                <InterpretationCard key={interp.id} interpretation={interp} />
              ))}
            </View>
          )}

          {!hasData && (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <ShieldCheck size={32} color={Colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>No signals right now</Text>
              <Text style={styles.emptyDesc}>
                As you use the app more, this screen will show relationship patterns and early signals to help you stay grounded.
              </Text>
            </View>
          )}

          <View style={styles.disclaimer}>
            <AlertTriangle size={13} color={Colors.textMuted} />
            <Text style={styles.disclaimerText}>
              This is based on your recent patterns and is not a diagnosis. These signals are designed to help you pause and reflect, not to judge your behavior.
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function InterventionCard({ intervention, onPress }: { intervention: SpiralIntervention; onPress: () => void }) {
  const IconComp = INTERVENTION_ICONS[intervention.icon] ?? Wind;

  return (
    <TouchableOpacity
      style={styles.interventionCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.interventionIconWrap}>
        <IconComp size={18} color={Colors.primary} />
      </View>
      <View style={styles.interventionContent}>
        <Text style={styles.interventionTitle}>{intervention.title}</Text>
        <Text style={styles.interventionDesc}>{intervention.description}</Text>
      </View>
      <ChevronRight size={16} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

function SignalCard({ signal, accentColor }: { signal: SpiralSignal; accentColor: string }) {
  return (
    <View style={styles.signalCard}>
      <View style={styles.signalHeader}>
        <View style={[styles.signalStrength, { backgroundColor: accentColor + '18' }]}>
          {Array.from({ length: 5 }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.strengthDot,
                { backgroundColor: i < signal.strength ? accentColor : accentColor + '25' },
              ]}
            />
          ))}
        </View>
      </View>
      <Text style={styles.signalLabel}>{signal.label}</Text>
      <Text style={styles.signalDesc}>{signal.description}</Text>
      {signal.relatedTriggers.length > 0 && (
        <View style={styles.triggerRow}>
          {signal.relatedTriggers.slice(0, 3).map((trigger, i) => (
            <View key={i} style={styles.triggerChip}>
              <Text style={styles.triggerChipText}>{trigger}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function ChainCard({ chain }: { chain: SpiralChain }) {
  return (
    <View style={styles.chainCard}>
      <View style={styles.chainFlow}>
        <View style={styles.chainNode}>
          <Text style={styles.chainNodeLabel}>Trigger</Text>
          <Text style={styles.chainNodeValue}>{chain.trigger}</Text>
        </View>
        <ArrowRight size={14} color={Colors.textMuted} />
        <View style={styles.chainNode}>
          <Text style={styles.chainNodeLabel}>Emotion</Text>
          <Text style={styles.chainNodeValue}>{chain.emotion}</Text>
        </View>
        <ArrowRight size={14} color={Colors.textMuted} />
        <View style={styles.chainNode}>
          <Text style={styles.chainNodeLabel}>Urge</Text>
          <Text style={styles.chainNodeValue}>{chain.urge}</Text>
        </View>
      </View>
      <View style={styles.chainFooter}>
        <Text style={styles.chainFrequency}>
          {chain.frequencyThisWeek}x this week
        </Text>
        <View style={styles.chainHelpRow}>
          <Sparkles size={12} color={Colors.primary} />
          <Text style={styles.chainHelp}>{chain.whatHelps}</Text>
        </View>
      </View>
    </View>
  );
}

function InterpretationCard({ interpretation }: { interpretation: RiskInterpretation }) {
  const accentColor = interpretation.tone === 'gentle'
    ? Colors.accent
    : interpretation.tone === 'encouraging'
      ? Colors.success
      : Colors.primary;

  return (
    <View style={styles.interpretationCard}>
      <View style={[styles.interpretationAccent, { backgroundColor: accentColor }]} />
      <View style={styles.interpretationContent}>
        <Text style={styles.interpretationHeadline}>{interpretation.headline}</Text>
        <Text style={styles.interpretationBody}>{interpretation.body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
    paddingHorizontal: 20,
  },
  headerHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    marginBottom: 8,
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    top: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  heroSection: {
    borderRadius: 24,
    padding: 24,
    marginTop: 12,
    alignItems: 'center',
  },
  heroIconRow: {
    marginBottom: 16,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  riskIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    gap: 12,
    alignSelf: 'stretch',
  },
  riskEmoji: {
    fontSize: 24,
  },
  riskTextWrap: {
    flex: 1,
  },
  riskLabel: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  riskScore: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  messageCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 18,
    marginTop: 16,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  messageText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 21,
  },
  supportCard: {
    backgroundColor: Colors.warmGlow,
    borderRadius: 14,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.accentLight,
  },
  supportText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    fontStyle: 'italic',
  },
  section: {
    marginTop: 28,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  sectionHint: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: -8,
    marginBottom: 14,
    lineHeight: 18,
  },
  interventionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
    gap: 14,
  },
  interventionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  interventionContent: {
    flex: 1,
  },
  interventionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  interventionDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  signalCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  signalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  signalStrength: {
    flexDirection: 'row',
    gap: 3,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  strengthDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  signalLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  signalDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  triggerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  triggerChip: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  triggerChipText: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  chainCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  chainFlow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  chainNode: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  chainNodeLabel: {
    fontSize: 9,
    fontWeight: '600' as const,
    color: Colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  chainNodeValue: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.text,
    textAlign: 'center',
  },
  chainFooter: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 10,
  },
  chainFrequency: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.accent,
    marginBottom: 6,
  },
  chainHelpRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  chainHelp: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  interpretationCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    paddingLeft: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    position: 'relative',
    overflow: 'hidden',
  },
  interpretationAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  interpretationContent: {
    flex: 1,
  },
  interpretationHeadline: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  interpretationBody: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginTop: 24,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 17,
    fontStyle: 'italic',
  },
});
