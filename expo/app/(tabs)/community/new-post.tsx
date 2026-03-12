import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  EyeOff,
  Eye,
  AlertTriangle,
  Check,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { CATEGORIES } from '@/constants/community';
import { useCreatePost } from '@/hooks/useCommunityFeed';
import { PostCategory } from '@/types/community';

export default function NewPostScreen() {
  const router = useRouter();
  const { createPost, isCreating } = useCreatePost();

  const [title, setTitle] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [category, setCategory] = useState<PostCategory | null>(null);
  const [isAnonymous, setIsAnonymous] = useState<boolean>(true);
  const [hasContentWarning, setHasContentWarning] = useState<boolean>(false);
  const [contentWarningText, setContentWarningText] = useState<string>('');

  const canSubmit = title.trim().length > 0 && body.trim().length > 0 && category !== null;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !category) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await createPost({
        title: title.trim(),
        body: body.trim(),
        category,
        isAnonymous,
        hasContentWarning,
        contentWarningText: hasContentWarning ? contentWarningText.trim() : undefined,
      });
      console.log('[NewPost] Post created successfully');
      router.back();
    } catch (error) {
      console.error('[NewPost] Failed to create post:', error);
      Alert.alert('Something went wrong', 'Please try again in a moment.');
    }
  }, [canSubmit, category, title, body, isAnonymous, hasContentWarning, contentWarningText, createPost, router]);

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
          <Text style={styles.navTitle}>New Post</Text>
          <TouchableOpacity
            style={[styles.submitBtn, canSubmit && styles.submitBtnActive]}
            onPress={handleSubmit}
            disabled={!canSubmit || isCreating}
            testID="submit-btn"
          >
            {isCreating ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Text style={[styles.submitText, canSubmit && styles.submitTextActive]}>
                Share
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.safeNotice}>
            <Text style={styles.safeNoticeText}>
              This is a safe space. Share what feels right for you.
            </Text>
          </View>

          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggle, isAnonymous && styles.toggleActive]}
              onPress={() => {
                setIsAnonymous((prev) => !prev);
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              testID="anon-toggle"
            >
              {isAnonymous ? (
                <EyeOff size={16} color={Colors.primary} />
              ) : (
                <Eye size={16} color={Colors.textMuted} />
              )}
              <Text style={[styles.toggleText, isAnonymous && styles.toggleTextActive]}>
                {isAnonymous ? 'Posting anonymously' : 'Posting as you'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toggle, hasContentWarning && styles.toggleWarningActive]}
              onPress={() => {
                setHasContentWarning((prev) => !prev);
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              testID="cw-toggle"
            >
              <AlertTriangle
                size={16}
                color={hasContentWarning ? Colors.accent : Colors.textMuted}
              />
              <Text
                style={[
                  styles.toggleText,
                  hasContentWarning && { color: Colors.accent },
                ]}
              >
                CW
              </Text>
            </TouchableOpacity>
          </View>

          {hasContentWarning && (
            <TextInput
              style={styles.cwInput}
              placeholder="What should readers be aware of?"
              placeholderTextColor={Colors.textMuted}
              value={contentWarningText}
              onChangeText={setContentWarningText}
              maxLength={100}
              testID="cw-text-input"
            />
          )}

          <Text style={styles.sectionLabel}>Category</Text>
          <View style={styles.categoriesGrid}>
            {CATEGORIES.map((cat) => {
              const isSelected = category === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryOption,
                    isSelected && {
                      backgroundColor: cat.color + '18',
                      borderColor: cat.color,
                    },
                  ]}
                  onPress={() => {
                    setCategory(cat.id);
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  testID={`category-${cat.id}`}
                >
                  <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                  <Text
                    style={[
                      styles.categoryText,
                      isSelected && { color: cat.color, fontWeight: '600' as const },
                    ]}
                  >
                    {cat.label}
                  </Text>
                  {isSelected && (
                    <View style={[styles.checkBadge, { backgroundColor: cat.color }]}>
                      <Check size={10} color={Colors.white} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.sectionLabel}>Title</Text>
          <TextInput
            style={styles.titleInput}
            placeholder="Give your post a title..."
            placeholderTextColor={Colors.textMuted}
            value={title}
            onChangeText={setTitle}
            maxLength={150}
            testID="title-input"
          />
          <Text style={styles.charCount}>{title.length}/150</Text>

          <Text style={styles.sectionLabel}>Your thoughts</Text>
          <TextInput
            style={styles.bodyInput}
            placeholder="Share what's on your mind. This community understands."
            placeholderTextColor={Colors.textMuted}
            value={body}
            onChangeText={setBody}
            multiline
            textAlignVertical="top"
            maxLength={3000}
            testID="body-input"
          />
          <Text style={styles.charCount}>{body.length}/3000</Text>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
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
  },
  submitBtn: {
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: Colors.surface,
  },
  submitBtnActive: {
    backgroundColor: Colors.primary,
  },
  submitText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textMuted,
  },
  submitTextActive: {
    color: Colors.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  safeNotice: {
    backgroundColor: Colors.warmGlow,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  safeNoticeText: {
    fontSize: 13,
    color: Colors.accent,
    textAlign: 'center',
    fontWeight: '500' as const,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  toggleActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary + '40',
  },
  toggleWarningActive: {
    backgroundColor: Colors.accentLight,
    borderColor: Colors.accent + '40',
  },
  toggleText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  toggleTextActive: {
    color: Colors.primaryDark,
  },
  cwInput: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.text,
    marginBottom: 16,
    ...Platform.select({
      web: { outlineStyle: 'none' } as Record<string, string>,
    }),
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 10,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  categoryEmoji: {
    fontSize: 14,
  },
  categoryText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  checkBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 2,
  },
  titleInput: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 4,
    ...Platform.select({
      web: { outlineStyle: 'none' } as Record<string, string>,
    }),
  },
  charCount: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'right',
    marginBottom: 20,
  },
  bodyInput: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.text,
    minHeight: 160,
    marginBottom: 4,
    lineHeight: 22,
    ...Platform.select({
      web: { outlineStyle: 'none' } as Record<string, string>,
    }),
  },
  bottomSpacer: {
    height: 40,
  },
});
