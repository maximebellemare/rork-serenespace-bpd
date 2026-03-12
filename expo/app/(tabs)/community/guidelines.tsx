import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Heart, Shield } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { COMMUNITY_GUIDELINES } from '@/constants/community';

const GUIDE_ICONS = ['💛', '🫧', '🩺', '⚠️', '🚫', '🛡', '🚩', '🙅'];

export default function GuidelinesScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <View style={styles.navBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            testID="back-btn"
          >
            <ArrowLeft size={20} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Community Guidelines</Text>
          <View style={styles.backBtn} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={styles.heroCard}>
            <View style={styles.heroIconRow}>
              <Heart size={22} color={Colors.primary} fill={Colors.primary} />
              <Shield size={22} color={Colors.primary} />
            </View>
            <Text style={styles.heroTitle}>Our shared agreement</Text>
            <Text style={styles.heroText}>
              This community exists because people with BPD deserve a space where they
              feel safe, understood, and never judged. These guidelines help us protect
              that space together.
            </Text>
          </View>

          {COMMUNITY_GUIDELINES.map((guideline, index) => (
            <View key={index} style={styles.guidelineCard}>
              <View style={styles.guidelineHeader}>
                <Text style={styles.guidelineIcon}>{GUIDE_ICONS[index] ?? '✨'}</Text>
                <Text style={styles.guidelineNumber}>{index + 1}</Text>
              </View>
              <Text style={styles.guidelineTitle}>{guideline.title}</Text>
              <Text style={styles.guidelineDesc}>{guideline.description}</Text>
            </View>
          ))}

          <View style={styles.footerCard}>
            <Text style={styles.footerEmoji}>🌿</Text>
            <Text style={styles.footerText}>
              By participating in this community, you agree to uphold these guidelines
              and help create a space where everyone can heal and grow together.
            </Text>
          </View>

          <View style={styles.bottomSpacer} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeTop: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    flex: 1,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  heroCard: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  heroIconRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.primaryDark,
    marginBottom: 10,
    textAlign: 'center',
  },
  heroText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
    textAlign: 'center',
  },
  guidelineCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 18,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  guidelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  guidelineIcon: {
    fontSize: 18,
  },
  guidelineNumber: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    backgroundColor: Colors.surface,
    width: 22,
    height: 22,
    borderRadius: 11,
    textAlign: 'center',
    lineHeight: 22,
    overflow: 'hidden',
  },
  guidelineTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 6,
  },
  guidelineDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 21,
  },
  footerCard: {
    backgroundColor: Colors.warmGlow,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginTop: 10,
  },
  footerEmoji: {
    fontSize: 28,
    marginBottom: 10,
  },
  footerText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 30,
  },
});
