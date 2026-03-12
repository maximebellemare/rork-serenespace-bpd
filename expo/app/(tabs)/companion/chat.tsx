import React, { useCallback, useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Send, Bookmark, BookmarkCheck, Plus, ArrowLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAICompanion, SUGGESTED_PROMPTS } from '@/providers/AICompanionProvider';
import { AIMessage } from '@/types/ai';

function TypingIndicator() {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animateDot = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        ])
      );
    };

    const a1 = animateDot(dot1, 0);
    const a2 = animateDot(dot2, 150);
    const a3 = animateDot(dot3, 300);

    a1.start();
    a2.start();
    a3.start();

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [dot1, dot2, dot3]);

  return (
    <View style={styles.typingContainer}>
      <View style={styles.typingBubble}>
        <Animated.View style={[styles.typingDot, { opacity: dot1 }]} />
        <Animated.View style={[styles.typingDot, { opacity: dot2 }]} />
        <Animated.View style={[styles.typingDot, { opacity: dot3 }]} />
      </View>
    </View>
  );
}

const MessageBubble = React.memo(({ message }: { message: AIMessage }) => {
  const isUser = message.role === 'user';
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const time = new Date(message.timestamp);
  const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <Animated.View
      style={[
        styles.messageBubbleWrapper,
        isUser ? styles.userBubbleWrapper : styles.assistantBubbleWrapper,
        { opacity: fadeAnim },
      ]}
    >
      <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        <Text style={[styles.messageText, isUser ? styles.userText : styles.assistantText]}>
          {message.content}
        </Text>
      </View>
      <Text style={[styles.messageTime, isUser ? styles.userTime : styles.assistantTime]}>
        {timeStr}
      </Text>
    </Animated.View>
  );
});

export default function ChatScreen() {
  const router = useRouter();
  const {
    activeConversation,
    isGenerating,
    sendMessage,
    toggleSaveConversation,
    startNewConversation,
  } = useAICompanion();

  const [inputText, setInputText] = useState<string>('');
  const flatListRef = useRef<FlatList>(null);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isGenerating) return;

    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setInputText('');
    await sendMessage(text);
  }, [inputText, isGenerating, sendMessage]);

  const handleNewChat = useCallback(() => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    startNewConversation();
  }, [startNewConversation]);

  const handleSave = useCallback(() => {
    if (!activeConversation) return;
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    toggleSaveConversation(activeConversation.id);
  }, [activeConversation, toggleSaveConversation]);

  const handlePrompt = useCallback(async (prompt: string) => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await sendMessage(prompt);
  }, [sendMessage]);

  useEffect(() => {
    if (activeConversation?.messages.length) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [activeConversation?.messages.length]);

  const messages = activeConversation?.messages ?? [];
  const isSaved = activeConversation?.saved ?? false;
  const hasMessages = messages.length > 0;

  const renderMessage = useCallback(({ item }: { item: AIMessage }) => {
    return <MessageBubble message={item} />;
  }, []);

  const renderEmpty = useCallback(() => {
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIcon}>
          <Text style={styles.emptyEmoji}>🤲</Text>
        </View>
        <Text style={styles.emptyTitle}>This is your safe space</Text>
        <Text style={styles.emptySubtitle}>
          Share what's on your mind, or choose a prompt below.{'\n'}Everything here stays private.
        </Text>
        <View style={styles.emptyPrompts}>
          {SUGGESTED_PROMPTS.slice(0, 4).map((prompt) => (
            <TouchableOpacity
              key={prompt.id}
              style={styles.emptyPromptChip}
              onPress={() => handlePrompt(prompt.prompt)}
              activeOpacity={0.7}
            >
              <Text style={styles.emptyPromptIcon}>{prompt.icon}</Text>
              <Text style={styles.emptyPromptText}>{prompt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }, [handlePrompt]);

  const keyExtractor = useCallback((item: AIMessage) => item.id, []);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: activeConversation?.title || 'New Chat',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
              <ArrowLeft size={22} color={Colors.text} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={handleNewChat} style={styles.headerBtn}>
                <Plus size={20} color={Colors.primary} />
              </TouchableOpacity>
              {hasMessages && (
                <TouchableOpacity onPress={handleSave} style={styles.headerBtn}>
                  {isSaved ? (
                    <BookmarkCheck size={20} color={Colors.primary} />
                  ) : (
                    <Bookmark size={20} color={Colors.textMuted} />
                  )}
                </TouchableOpacity>
              )}
            </View>
          ),
        }}
      />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={keyExtractor}
          contentContainerStyle={[
            styles.messagesList,
            !hasMessages && styles.messagesListEmpty,
          ]}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => {
            if (hasMessages) {
              flatListRef.current?.scrollToEnd({ animated: true });
            }
          }}
        />

        {isGenerating && <TypingIndicator />}

        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Share what's on your mind..."
            placeholderTextColor={Colors.textMuted}
            multiline
            maxLength={2000}
            testID="chat-input"
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isGenerating) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || isGenerating}
            activeOpacity={0.7}
            testID="send-btn"
          >
            {isGenerating ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Send size={18} color={Colors.white} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerActions: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  headerBtn: {
    padding: 6,
  },
  keyboardView: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  messagesListEmpty: {
    flexGrow: 1,
    justifyContent: 'center' as const,
  },
  messageBubbleWrapper: {
    marginBottom: 16,
    maxWidth: '82%' as const,
  },
  userBubbleWrapper: {
    alignSelf: 'flex-end' as const,
    alignItems: 'flex-end' as const,
  },
  assistantBubbleWrapper: {
    alignSelf: 'flex-start' as const,
    alignItems: 'flex-start' as const,
  },
  messageBubble: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 6,
  },
  assistantBubble: {
    backgroundColor: Colors.card,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: Colors.white,
  },
  assistantText: {
    color: Colors.text,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  userTime: {
    color: Colors.textMuted,
  },
  assistantTime: {
    color: Colors.textMuted,
  },
  typingContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  typingBubble: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 5,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignSelf: 'flex-start' as const,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  inputBar: {
    flexDirection: 'row' as const,
    alignItems: 'flex-end' as const,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    gap: 10,
  },
  textInput: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    backgroundColor: Colors.surface,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'ios' ? 12 : 10,
    paddingBottom: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 15,
    color: Colors.text,
    lineHeight: 20,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.border,
  },
  emptyState: {
    alignItems: 'center' as const,
    paddingHorizontal: 30,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 18,
  },
  emptyEmoji: {
    fontSize: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 21,
    marginBottom: 24,
  },
  emptyPrompts: {
    width: '100%',
    gap: 8,
  },
  emptyPromptChip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    backgroundColor: Colors.card,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  emptyPromptIcon: {
    fontSize: 16,
  },
  emptyPromptText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.text,
  },
});
