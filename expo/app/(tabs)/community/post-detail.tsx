import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Shield,
  Send,
  Pin,
  Eye,
  EyeOff,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { CATEGORIES, REACTION_LABELS } from '@/constants/community';
import { usePostDetail } from '@/hooks/useCommunityFeed';
import { PostReply, SupportiveReaction } from '@/types/community';

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

function ReactionBar({
  reactions,
  onToggle,
}: {
  reactions: SupportiveReaction[];
  onToggle: (type: string) => void;
}) {
  return (
    <View style={styles.reactionBar}>
      {reactions.map((reaction) => {
        const info = REACTION_LABELS[reaction.type];
        if (!info) return null;
        return (
          <TouchableOpacity
            key={reaction.type}
            style={[
              styles.reactionBtn,
              reaction.userReacted && styles.reactionBtnActive,
            ]}
            onPress={() => onToggle(reaction.type)}
            activeOpacity={0.7}
          >
            <Text style={styles.reactionEmoji}>{info.emoji}</Text>
            <Text
              style={[
                styles.reactionCount,
                reaction.userReacted && styles.reactionCountActive,
              ]}
            >
              {reaction.count}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function ReplyCard({
  reply,
  onReaction,
}: {
  reply: PostReply;
  onReaction: (replyId: string, type: string) => void;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return (
    <Animated.View style={[styles.replyCard, { opacity: fadeAnim }]}>
      <View style={styles.replyHeader}>
        <Text style={styles.replyAuthor}>
          {reply.author.isAnonymous ? '🫧 Anonymous' : reply.author.displayName}
        </Text>
        <Text style={styles.replyTime}>{timeAgo(reply.createdAt)}</Text>
      </View>
      <Text style={styles.replyBody}>{reply.body}</Text>
      <View style={styles.replyReactions}>
        {reply.reactions.map((reaction) => {
          const info = REACTION_LABELS[reaction.type];
          if (!info) return null;
          return (
            <TouchableOpacity
              key={reaction.type}
              style={[
                styles.replyReactionBtn,
                reaction.userReacted && styles.replyReactionActive,
              ]}
              onPress={() => onReaction(reply.id, reaction.type)}
            >
              <Text style={styles.replyReactionEmoji}>{info.emoji}</Text>
              {reaction.count > 0 && (
                <Text style={styles.replyReactionCount}>{reaction.count}</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </Animated.View>
  );
}

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const {
    post,
    replies,
    isLoading,
    addReply,
    isAddingReply,
    toggleReaction,
  } = usePostDetail(id ?? '');

  const [replyText, setReplyText] = useState<string>('');
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const [showCW, setShowCW] = useState<boolean>(false);
  const scrollRef = useRef<ScrollView>(null);

  const category = post ? CATEGORIES.find((c) => c.id === post.category) : null;

  const handleSendReply = useCallback(() => {
    if (!replyText.trim() || !id) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addReply({
      postId: id,
      body: replyText.trim(),
      isAnonymous,
    });
    setReplyText('');
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 500);
  }, [replyText, id, isAnonymous, addReply]);

  const handleTogglePostReaction = useCallback(
    (type: string) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      toggleReaction({ reactionType: type });
    },
    [toggleReaction]
  );

  const handleToggleReplyReaction = useCallback(
    (replyId: string, type: string) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      toggleReaction({ reactionType: type, replyId });
    },
    [toggleReaction]
  );

  if (isLoading || !post) {
    return (
      <View style={styles.container}>
        <SafeAreaView edges={['top']} style={styles.safeTop}>
          <View style={styles.navBar}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <ArrowLeft size={20} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.navTitle}>Post</Text>
            <View style={styles.backBtn} />
          </View>
        </SafeAreaView>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

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
          <Text style={styles.navTitle} numberOfLines={1}>
            {category?.emoji} {category?.label}
          </Text>
          <View style={styles.backBtn} />
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.postContainer}>
            <View style={styles.postHeader}>
              {post.isPinned && (
                <View style={styles.pinnedBadge}>
                  <Pin size={10} color={Colors.primary} />
                  <Text style={styles.pinnedText}>Pinned</Text>
                </View>
              )}
              {category && (
                <View style={[styles.categoryChip, { backgroundColor: category.color + '18' }]}>
                  <Text style={styles.categoryEmoji}>{category.emoji}</Text>
                  <Text style={[styles.categoryLabel, { color: category.color }]}>
                    {category.label}
                  </Text>
                </View>
              )}
            </View>

            <Text style={styles.postTitle}>{post.title}</Text>

            <View style={styles.postMeta}>
              <Text style={styles.postAuthor}>
                {post.author.isAnonymous ? '🫧 Anonymous' : post.author.displayName}
              </Text>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.postTime}>{timeAgo(post.createdAt)}</Text>
            </View>

            {post.hasContentWarning && !showCW && (
              <TouchableOpacity
                style={styles.cwOverlay}
                onPress={() => setShowCW(true)}
                activeOpacity={0.8}
              >
                <Shield size={20} color={Colors.accent} />
                <Text style={styles.cwTitle}>Content Warning</Text>
                {post.contentWarningText && (
                  <Text style={styles.cwDesc}>{post.contentWarningText}</Text>
                )}
                <Text style={styles.cwAction}>Tap to reveal</Text>
              </TouchableOpacity>
            )}

            {(!post.hasContentWarning || showCW) && (
              <Text style={styles.postBody}>{post.body}</Text>
            )}

            <ReactionBar
              reactions={post.reactions}
              onToggle={handleTogglePostReaction}
            />
          </View>

          <View style={styles.repliesSection}>
            <Text style={styles.repliesTitle}>
              {replies.length > 0
                ? `${replies.length} ${replies.length === 1 ? 'Reply' : 'Replies'}`
                : 'No replies yet'}
            </Text>

            {replies.length === 0 && (
              <View style={styles.emptyReplies}>
                <Text style={styles.emptyRepliesEmoji}>💬</Text>
                <Text style={styles.emptyRepliesText}>
                  Be the first to share some support
                </Text>
              </View>
            )}

            {replies.map((reply) => (
              <ReplyCard
                key={reply.id}
                reply={reply}
                onReaction={handleToggleReplyReaction}
              />
            ))}
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>

        <SafeAreaView edges={['bottom']} style={styles.composerSafe}>
          <View style={styles.composer}>
            <TouchableOpacity
              style={[styles.anonToggle, isAnonymous && styles.anonToggleActive]}
              onPress={() => setIsAnonymous((prev) => !prev)}
              testID="anon-toggle"
            >
              {isAnonymous ? (
                <EyeOff size={16} color={Colors.primary} />
              ) : (
                <Eye size={16} color={Colors.textMuted} />
              )}
            </TouchableOpacity>
            <TextInput
              style={styles.composerInput}
              placeholder={isAnonymous ? 'Reply anonymously...' : 'Write a supportive reply...'}
              placeholderTextColor={Colors.textMuted}
              value={replyText}
              onChangeText={setReplyText}
              multiline
              maxLength={1000}
              testID="reply-input"
            />
            <TouchableOpacity
              style={[
                styles.sendBtn,
                replyText.trim().length > 0 && styles.sendBtnActive,
              ]}
              onPress={handleSendReply}
              disabled={replyText.trim().length === 0 || isAddingReply}
              testID="send-reply-btn"
            >
              {isAddingReply ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Send size={16} color={replyText.trim().length > 0 ? Colors.white : Colors.textMuted} />
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
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
    flex: 1,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  postContainer: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  pinnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  pinnedText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 5,
  },
  categoryEmoji: {
    fontSize: 12,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  postTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    lineHeight: 26,
    marginBottom: 8,
  },
  postMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  postAuthor: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '500' as const,
  },
  metaDot: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  postTime: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  cwOverlay: {
    backgroundColor: Colors.accentLight,
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  cwTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.accent,
  },
  cwDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  cwAction: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
  },
  postBody: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 24,
    marginBottom: 16,
  },
  reactionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 14,
    flexWrap: 'wrap',
  },
  reactionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  reactionBtnActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary + '40',
  },
  reactionEmoji: {
    fontSize: 15,
  },
  reactionCount: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  reactionCountActive: {
    color: Colors.primaryDark,
  },
  repliesSection: {
    marginTop: 20,
  },
  repliesTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 14,
  },
  emptyReplies: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyRepliesEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  emptyRepliesText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  replyCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  replyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  replyAuthor: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  replyTime: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  replyBody: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 21,
    marginBottom: 10,
  },
  replyReactions: {
    flexDirection: 'row',
    gap: 6,
  },
  replyReactionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  replyReactionActive: {
    backgroundColor: Colors.primaryLight,
  },
  replyReactionEmoji: {
    fontSize: 12,
  },
  replyReactionCount: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  bottomSpacer: {
    height: 20,
  },
  composerSafe: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  anonToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  anonToggleActive: {
    backgroundColor: Colors.primaryLight,
  },
  composerInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text,
    maxHeight: 100,
    ...Platform.select({
      web: { outlineStyle: 'none' } as Record<string, string>,
    }),
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  sendBtnActive: {
    backgroundColor: Colors.primary,
  },
});
