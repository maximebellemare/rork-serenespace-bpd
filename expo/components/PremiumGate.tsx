import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Crown, Lock, ArrowRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { PremiumFeature } from '@/types/subscription';

interface PremiumGateProps {
  feature: PremiumFeature;
  title?: string;
  description?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  softPrompt?: boolean;
}

export default function PremiumGate({
  feature,
  title,
  description,
  children,
  fallback,
  softPrompt = true,
}: PremiumGateProps) {
  const { canAccessFeature } = useSubscription();
  const router = useRouter();

  if (canAccessFeature(feature)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!softPrompt) {
    return null;
  }

  return (
    <PremiumPromptCard
      title={title ?? 'Premium Feature'}
      description={description ?? 'Upgrade to unlock this feature and deeper support.'}
      onUpgrade={() => router.push('/upgrade')}
    />
  );
}

interface PremiumPromptCardProps {
  title: string;
  description: string;
  onUpgrade: () => void;
}

function PremiumPromptCard({ title, description, onUpgrade }: PremiumPromptCardProps) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 3000, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 3000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmerAnim]);

  const handlePress = useCallback(() => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onUpgrade();
  }, [onUpgrade]);

  const bgOpacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1],
  });

  return (
    <Animated.View style={[styles.gateCard, { opacity: bgOpacity }]}>
      <TouchableOpacity
        style={styles.gateInner}
        onPress={handlePress}
        activeOpacity={0.8}
        testID="premium-gate-card"
      >
        <View style={styles.gateIconRow}>
          <View style={styles.lockBadge}>
            <Lock size={14} color="#D4956A" />
          </View>
          <View style={styles.crownBadge}>
            <Crown size={16} color="#D4956A" />
          </View>
        </View>
        <Text style={styles.gateTitle}>{title}</Text>
        <Text style={styles.gateDesc}>{description}</Text>
        <View style={styles.gateButton}>
          <Text style={styles.gateButtonText}>Unlock with Premium</Text>
          <ArrowRight size={14} color={Colors.white} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

interface PremiumInlinePromptProps {
  feature: PremiumFeature;
  message?: string;
  compact?: boolean;
}

export function PremiumInlinePrompt({
  feature,
  message,
  compact = false,
}: PremiumInlinePromptProps) {
  const { canAccessFeature } = useSubscription();
  const router = useRouter();

  if (canAccessFeature(feature)) return null;

  const handlePress = useCallback(() => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push('/upgrade');
  }, [router]);

  if (compact) {
    return (
      <TouchableOpacity
        style={styles.inlineCompact}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <Crown size={12} color="#D4956A" />
        <Text style={styles.inlineCompactText}>
          {message ?? 'Premium'}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={styles.inlineBanner}
      onPress={handlePress}
      activeOpacity={0.7}
      testID="premium-inline-prompt"
    >
      <View style={styles.inlineLeft}>
        <View style={styles.inlineIcon}>
          <Crown size={14} color="#D4956A" />
        </View>
        <Text style={styles.inlineText}>
          {message ?? 'Upgrade for full access to this feature.'}
        </Text>
      </View>
      <ArrowRight size={14} color="#D4956A" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  gateCard: {
    marginVertical: 12,
  },
  gateInner: {
    backgroundColor: '#FFF8F2',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: '#F5E0CC',
  },
  gateIconRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 14,
  },
  lockBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FFF0E3',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  crownBadge: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#FFF0E3',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1.5,
    borderColor: '#F5E0CC',
  },
  gateTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 6,
    textAlign: 'center' as const,
  },
  gateDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 20,
    marginBottom: 18,
    maxWidth: 280,
  },
  gateButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    backgroundColor: '#D4956A',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
  },
  gateButtonText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  inlineBanner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: '#FFF8F2',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F5E0CC',
    marginVertical: 8,
  },
  inlineLeft: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  inlineIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#FFF0E3',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  inlineText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  inlineCompact: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    backgroundColor: '#FFF0E3',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  inlineCompactText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#D4956A',
  },
});
