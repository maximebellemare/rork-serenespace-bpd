import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
} from 'react-native';
import { Stack } from 'expo-router';
import { TrendingUp, TrendingDown, Minus, Zap, Heart, AlertTriangle, Shield, Layers } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAICompanion } from '@/providers/AICompanionProvider';
import { InsightCard } from '@/types/memory';

const ICON_MAP: Record<string, React.ReactNode> = {
  trigger: <Zap size={18} color={Colors.accent} />,
  emotion: <Heart size={18} color="#E17055" />,
  urge: <AlertTriangle size={18} color="#FDCB6E" />,
  coping: <Shield size={18} color={Colors.primary} />,
  pattern: <Layers size={18} color="#6C5CE7" />,
};

const BG_MAP: Record<string, string> = {
  trigger: Colors.accentLight,
  emotion: '#FDE8E3',
  urge: '#FFF8E1',
  coping: Colors.primaryLight,
  pattern: '#EDE7F6',
};

function TrendIcon({ trend }: { trend?: 'up' | 'down' | 'stable' }) {
  if (trend === 'up') return <TrendingUp size={14} color={Colors.danger} />;
  if (trend === 'down') return <TrendingDown size={14} color={Colors.success} />;
  return <Minus size={14} color={Colors.textMuted} />;
}

function InsightCardView({ card, index }: { card: InsightCard; index: number }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, index]);

  return (
    <Animated.View
      style={[
        styles.insightCard,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={styles.insightCardHeader}>
        <View style={[styles.insightIconWrap, { backgroundColor: BG_MAP[card.type] || Colors.primaryLight }]}>
          {ICON_MAP[card.type] || ICON_MAP.pattern}
        </View>
        <Text style={styles.insightCardTitle}>{card.title}</Text>
        {card.trend && <TrendIcon trend={card.trend} />}
      </View>
      <Text style={styles.insightCardDesc}>{card.description}</Text>
    </Animated.View>
  );
}

export default function InsightsScreen() {
  const { insightCards, memoryProfile } = useAICompanion();

  const hasData = memoryProfile.recentCheckInCount > 0;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Your Insights' }} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{memoryProfile.recentCheckInCount}</Text>
            <Text style={styles.summaryLabel}>Check-ins</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>
              {memoryProfile.averageIntensity > 0 ? memoryProfile.averageIntensity : '—'}
            </Text>
            <Text style={styles.summaryLabel}>Avg Intensity</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>
              {memoryProfile.intensityTrend === 'unknown' ? '—' :
                memoryProfile.intensityTrend === 'falling' ? '↓' :
                  memoryProfile.intensityTrend === 'rising' ? '↑' : '→'}
            </Text>
            <Text style={styles.summaryLabel}>Trend</Text>
          </View>
        </View>

        {hasData ? (
          <View style={styles.cardsSection}>
            {insightCards.map((card, i) => (
              <InsightCardView key={card.id} card={card} index={i} />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📊</Text>
            <Text style={styles.emptyTitle}>No insights yet</Text>
            <Text style={styles.emptySubtitle}>
              Complete a few check-ins and your patterns will start appearing here. Every check-in helps build a clearer picture.
            </Text>
          </View>
        )}

        {memoryProfile.topTriggers.length > 0 && (
          <View style={styles.barSection}>
            <Text style={styles.barSectionTitle}>Trigger Frequency</Text>
            {memoryProfile.topTriggers.map((item) => (
              <View key={item.label} style={styles.barRow}>
                <Text style={styles.barLabel} numberOfLines={1}>{item.label}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${Math.max(item.percentage, 8)}%` }]} />
                </View>
                <Text style={styles.barValue}>{item.percentage}%</Text>
              </View>
            ))}
          </View>
        )}

        {memoryProfile.topEmotions.length > 0 && (
          <View style={styles.barSection}>
            <Text style={styles.barSectionTitle}>Emotion Frequency</Text>
            {memoryProfile.topEmotions.map((item) => (
              <View key={item.label} style={styles.barRow}>
                <Text style={styles.barLabel} numberOfLines={1}>{item.label}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, styles.barFillEmotion, { width: `${Math.max(item.percentage, 8)}%` }]} />
                </View>
                <Text style={styles.barValue}>{item.percentage}%</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  summaryRow: {
    flexDirection: 'row' as const,
    gap: 10,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.primary,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  cardsSection: {
    gap: 12,
    marginBottom: 28,
  },
  insightCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  insightCardHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    marginBottom: 10,
  },
  insightIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  insightCardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  insightCardDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 21,
  },
  barSection: {
    marginBottom: 24,
  },
  barSectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 14,
  },
  barRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 10,
    gap: 10,
  },
  barLabel: {
    width: 110,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surface,
    overflow: 'hidden' as const,
  },
  barFill: {
    height: '100%' as const,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  barFillEmotion: {
    backgroundColor: Colors.accent,
  },
  barValue: {
    width: 36,
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textMuted,
    textAlign: 'right' as const,
  },
  emptyState: {
    alignItems: 'center' as const,
    paddingVertical: 48,
    paddingHorizontal: 30,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 21,
  },
  bottomSpacer: {
    height: 30,
  },
});
