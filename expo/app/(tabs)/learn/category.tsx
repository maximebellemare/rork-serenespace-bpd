import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import {
  ChevronRight,
  Clock,
  Bookmark,
  CheckCircle,
  BookOpen,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import {
  getCategoryById,
  getLessonsByCategory,
  getLearnState,
  getCategoryProgress,
  toggleBookmark,
} from '@/services/learn/learnService';
import { LearnState } from '@/types/learn';

export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [learnState, setLearnState] = useState<LearnState | null>(null);

  const category = useMemo(() => getCategoryById(id ?? ''), [id]);
  const lessons = useMemo(() => getLessonsByCategory(id ?? ''), [id]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  useEffect(() => {
    void (async () => {
      const state = await getLearnState();
      setLearnState(state);
    })();
  }, []);

  const progress = useMemo(() => {
    if (!learnState) return { completed: 0, total: 0 };
    return getCategoryProgress(id ?? '', learnState);
  }, [learnState, id]);

  const handleLessonPress = useCallback((lessonId: string) => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(`/learn/lesson?id=${lessonId}` as any);
  }, [router]);

  const handleBookmark = useCallback(async (lessonId: string) => {
    if (!learnState) return;
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const newState = await toggleBookmark(lessonId, learnState);
    setLearnState(newState);
  }, [learnState]);

  if (!category) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Category' }} />
        <View style={styles.emptyState}>
          <BookOpen size={40} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>Category not found</Text>
        </View>
      </View>
    );
  }

  const progressPercent = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: category.title, headerShown: true, headerTintColor: Colors.text, headerStyle: { backgroundColor: Colors.background }, headerShadowVisible: false }} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.heroSection, { opacity: fadeAnim }]}>
          <View style={[styles.heroBadge, { backgroundColor: category.color + '18' }]}>
            <Text style={[styles.heroBadgeText, { color: category.color }]}>{category.lessonCount} lessons</Text>
          </View>
          <Text style={styles.heroDesc}>{category.description}</Text>

          {progress.total > 0 && (
            <View style={styles.progressSection}>
              <View style={styles.progressInfo}>
                <Text style={styles.progressLabel}>Progress</Text>
                <Text style={[styles.progressValue, { color: category.color }]}>{progress.completed}/{progress.total}</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${progressPercent}%`, backgroundColor: category.color }]} />
              </View>
            </View>
          )}
        </Animated.View>

        <View style={styles.lessonList}>
          {lessons.map((lesson, index) => {
            const isCompleted = learnState?.progress[lesson.id]?.completed ?? false;
            const isBookmarked = learnState?.bookmarkedIds.includes(lesson.id) ?? false;

            return (
              <Animated.View
                key={lesson.id}
                style={{
                  opacity: fadeAnim,
                  transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
                }}
              >
                <TouchableOpacity
                  style={styles.lessonCard}
                  onPress={() => handleLessonPress(lesson.id)}
                  activeOpacity={0.7}
                  testID={`lesson-${lesson.id}`}
                >
                  <View style={styles.lessonNumber}>
                    {isCompleted ? (
                      <CheckCircle size={20} color={Colors.success} />
                    ) : (
                      <Text style={[styles.lessonNumberText, { color: category.color }]}>{index + 1}</Text>
                    )}
                  </View>

                  <View style={styles.lessonContent}>
                    <Text style={styles.lessonTitle}>{lesson.title}</Text>
                    <Text style={styles.lessonDesc} numberOfLines={2}>{lesson.description}</Text>
                    <View style={styles.lessonMeta}>
                      <Clock size={12} color={Colors.textMuted} />
                      <Text style={styles.lessonTime}>{lesson.readingTime} min read</Text>
                      <View style={styles.tagRow}>
                        {lesson.tags.slice(0, 2).map(tag => (
                          <View key={tag} style={styles.tag}>
                            <Text style={styles.tagText}>{tag}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>

                  <View style={styles.lessonActions}>
                    <TouchableOpacity
                      onPress={() => void handleBookmark(lesson.id)}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                      <Bookmark
                        size={18}
                        color={isBookmarked ? Colors.accent : Colors.textMuted}
                        fill={isBookmarked ? Colors.accent : 'none'}
                      />
                    </TouchableOpacity>
                    <ChevronRight size={16} color={Colors.textMuted} style={{ marginTop: 8 }} />
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
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
  scrollContent: {
    paddingBottom: 40,
  },
  heroSection: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 20,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 10,
  },
  heroBadgeText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  heroDesc: {
    fontSize: 16,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  progressSection: {
    marginTop: 16,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  progressValue: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: Colors.borderLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  lessonList: {
    paddingHorizontal: 24,
    gap: 10,
  },
  lessonCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
    gap: 14,
    alignItems: 'flex-start',
  },
  lessonNumber: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  lessonNumberText: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  lessonContent: {
    flex: 1,
  },
  lessonTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  lessonDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  lessonMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  lessonTime: {
    fontSize: 12,
    color: Colors.textMuted,
    marginRight: 6,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 4,
  },
  tag: {
    backgroundColor: Colors.background,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500' as const,
  },
  lessonActions: {
    alignItems: 'center',
    gap: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
  },
});
