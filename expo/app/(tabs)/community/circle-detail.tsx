import React, { useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Users,
  Clock,
  Check,
  LogOut,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useSupportCircles } from '@/hooks/useCommunityFeed';

function timeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

export default function CircleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { circles, isLoading, joinCircle, leaveCircle, isJoining, isLeaving } = useSupportCircles();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const circle = circles.find((c) => c.id === id);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [fadeAnim]);

  const handleToggleJoin = useCallback(() => {
    if (!circle) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (circle.isJoined) {
      leaveCircle(circle.id);
    } else {
      joinCircle(circle.id);
    }
  }, [circle, joinCircle, leaveCircle]);

  if (isLoading || !circle) {
    return (
      <View style={styles.container}>
        <SafeAreaView edges={['top']} style={styles.safeTop}>
          <View style={styles.navBar}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <ArrowLeft size={20} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.navTitle}>Circle</Text>
            <View style={styles.backBtn} />
          </View>
        </SafeAreaView>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <View style={styles.navBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} testID="back-btn">
            <ArrowLeft size={20} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.navTitle} numberOfLines={1}>{circle.name}</Text>
          <View style={styles.backBtn} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.heroCard, { opacity: fadeAnim, borderColor: circle.color + '30' }]}>
          <View style={[styles.heroEmojiCircle, { backgroundColor: circle.color + '15' }]}>
            <Text style={styles.heroEmoji}>{circle.emoji}</Text>
          </View>
          <Text style={styles.heroName}>{circle.name}</Text>
          <Text style={styles.heroDescription}>{circle.description}</Text>

          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Users size={14} color={Colors.textMuted} />
              <Text style={styles.heroStatText}>{circle.memberCount} members</Text>
            </View>
            <View style={styles.heroStatDot} />
            <View style={styles.heroStat}>
              <Clock size={14} color={Colors.textMuted} />
              <Text style={styles.heroStatText}>Active {timeAgo(circle.recentActivity)}</Text>
            </View>
          </View>

          <View style={styles.tagsRow}>
            {circle.tags.map((tag) => (
              <View key={tag} style={[styles.tag, { backgroundColor: circle.color + '12' }]}>
                <Text style={[styles.tagText, { color: circle.color }]}>{tag}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[
              styles.joinBtn,
              circle.isJoined
                ? { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderLight }
                : { backgroundColor: circle.color },
            ]}
            onPress={handleToggleJoin}
            disabled={isJoining || isLeaving}
            testID="join-btn"
          >
            {isJoining || isLeaving ? (
              <ActivityIndicator size="small" color={circle.isJoined ? Colors.textMuted : Colors.white} />
            ) : circle.isJoined ? (
              <View style={styles.joinBtnContent}>
                <LogOut size={16} color={Colors.textSecondary} />
                <Text style={styles.leaveBtnText}>Leave circle</Text>
              </View>
            ) : (
              <View style={styles.joinBtnContent}>
                <Check size={16} color={Colors.white} />
                <Text style={styles.joinBtnText}>Join circle</Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>

        {circle.isJoined ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Circle discussions</Text>
            </View>

            <View style={styles.emptyDiscussions}>
              <Text style={styles.emptyEmoji}>💬</Text>
              <Text style={styles.emptyTitle}>No discussions yet</Text>
              <Text style={styles.emptyText}>
                Start a conversation by creating a post in this circle's category.
              </Text>
            </View>

            <View style={styles.aboutSection}>
              <Text style={styles.aboutTitle}>About this circle</Text>
              <View style={styles.aboutCard}>
                <Text style={styles.aboutItem}>🤝 A safe space for peer support</Text>
                <Text style={styles.aboutItem}>🔒 Respectful and confidential</Text>
                <Text style={styles.aboutItem}>💛 Focused discussions on shared experiences</Text>
                <Text style={styles.aboutItem}>🫂 Smaller group, deeper connection</Text>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.notJoinedSection}>
            <View style={styles.benefitsCard}>
              <Text style={styles.benefitsTitle}>Why join this circle?</Text>
              <View style={styles.benefitRow}>
                <Text style={styles.benefitEmoji}>🫂</Text>
                <View style={styles.benefitText}>
                  <Text style={styles.benefitLabel}>Smaller, safer space</Text>
                  <Text style={styles.benefitDesc}>Connect with others who share similar experiences in a focused group.</Text>
                </View>
              </View>
              <View style={styles.benefitRow}>
                <Text style={styles.benefitEmoji}>💬</Text>
                <View style={styles.benefitText}>
                  <Text style={styles.benefitLabel}>Focused discussions</Text>
                  <Text style={styles.benefitDesc}>Conversations stay on topic and feel more relevant to your experience.</Text>
                </View>
              </View>
              <View style={styles.benefitRow}>
                <Text style={styles.benefitEmoji}>🌱</Text>
                <View style={styles.benefitText}>
                  <Text style={styles.benefitLabel}>Grow together</Text>
                  <Text style={styles.benefitDesc}>Learn from others who are working through similar challenges.</Text>
                </View>
              </View>
            </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  heroCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    marginBottom: 20,
  },
  heroEmojiCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  heroEmoji: {
    fontSize: 36,
  },
  heroName: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  heroDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  heroStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  heroStatText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  heroStatDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.textMuted,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 18,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  joinBtn: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 24,
    minWidth: 160,
    alignItems: 'center',
  },
  joinBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  joinBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.white,
  },
  leaveBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  emptyDiscussions: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 20,
  },
  emptyEmoji: {
    fontSize: 32,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 19,
  },
  aboutSection: {
    marginBottom: 20,
  },
  aboutTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 10,
  },
  aboutCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 12,
  },
  aboutItem: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  notJoinedSection: {
    marginBottom: 20,
  },
  benefitsCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  benefitsTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 18,
  },
  benefitRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 18,
  },
  benefitEmoji: {
    fontSize: 24,
    marginTop: 2,
  },
  benefitText: {
    flex: 1,
  },
  benefitLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 3,
  },
  benefitDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  bottomSpacer: {
    height: 40,
  },
});
