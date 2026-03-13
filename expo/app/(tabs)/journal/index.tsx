import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Clock,
  Plus,
  PenLine,
  BarChart3,
  Star,
  Sparkles,
  BookOpen,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useApp } from '@/providers/AppProvider';
import { useJournal } from '@/providers/JournalProvider';
import { JournalEntry } from '@/types';
import { SmartJournalEntry, FORMAT_CONFIG, JournalEntryFormat } from '@/types/journalEntry';
import { GUIDED_REFLECTION_FLOWS } from '@/data/guidedReflectionFlows';

function formatDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${Math.floor(diffHours)}h ago`;
  if (diffHours < 48) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function PatternSection({ title, data }: { title: string; data: Record<string, number> }) {
  const sorted = useMemo(
    () => Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 5),
    [data]
  );
  const max = sorted.length > 0 ? sorted[0][1] : 1;

  if (sorted.length === 0) return null;

  return (
    <View style={styles.patternSection}>
      <Text style={styles.patternTitle}>{title}</Text>
      {sorted.map(([label, count]) => (
        <View key={label} style={styles.patternRow}>
          <Text style={styles.patternLabel} numberOfLines={1}>{label}</Text>
          <View style={styles.patternBarBg}>
            <View
              style={[
                styles.patternBarFill,
                { width: `${(count / max) * 100}%` },
              ]}
            />
          </View>
          <Text style={styles.patternCount}>{count}</Text>
        </View>
      ))}
    </View>
  );
}

function CheckInEntryCard({ entry }: { entry: JournalEntry }) {
  const [expanded, setExpanded] = useState<boolean>(false);

  const toggle = () => {
    setExpanded(!expanded);
  };

  const intensityColor =
    entry.checkIn.intensityLevel <= 3
      ? Colors.success
      : entry.checkIn.intensityLevel <= 6
      ? Colors.accent
      : Colors.danger;

  return (
    <TouchableOpacity style={styles.entryCard} onPress={toggle} activeOpacity={0.8}>
      <View style={styles.entryHeader}>
        <View style={styles.entryLeft}>
          <View style={[styles.intensityBadge, { backgroundColor: intensityColor }]}>
            <Text style={styles.intensityBadgeText}>{entry.checkIn.intensityLevel}</Text>
          </View>
          <View>
            <Text style={styles.entryTime}>{formatDate(entry.timestamp)}</Text>
            <Text style={styles.entryTimeDetail}>{formatTime(entry.timestamp)}</Text>
          </View>
        </View>
        <View style={styles.entryRight}>
          <View style={styles.checkInBadge}>
            <Text style={styles.checkInBadgeText}>Check-in</Text>
          </View>
          {expanded ? (
            <ChevronUp size={18} color={Colors.textMuted} />
          ) : (
            <ChevronDown size={18} color={Colors.textMuted} />
          )}
        </View>
      </View>

      <View style={styles.entryEmotions}>
        {entry.checkIn.emotions.slice(0, 4).map(e => (
          <View key={e.id} style={styles.emotionTag}>
            <Text style={styles.emotionEmoji}>{e.emoji}</Text>
            <Text style={styles.emotionLabel}>{e.label}</Text>
          </View>
        ))}
        {entry.checkIn.emotions.length > 4 && (
          <Text style={styles.moreText}>+{entry.checkIn.emotions.length - 4}</Text>
        )}
      </View>

      {expanded && (
        <View style={styles.entryDetails}>
          {entry.checkIn.triggers.length > 0 && (
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Triggers</Text>
              <Text style={styles.detailText}>
                {entry.checkIn.triggers.map(t => t.label).join(', ')}
              </Text>
            </View>
          )}
          {entry.checkIn.urges.length > 0 && (
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Urges</Text>
              <Text style={styles.detailText}>
                {entry.checkIn.urges.map(u => u.label).join(', ')}
              </Text>
            </View>
          )}
          {entry.checkIn.bodySensations.length > 0 && (
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Body sensations</Text>
              <Text style={styles.detailText}>
                {entry.checkIn.bodySensations.map(b => b.label).join(', ')}
              </Text>
            </View>
          )}
          {entry.checkIn.notes ? (
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Notes</Text>
              <Text style={styles.detailText}>{entry.checkIn.notes}</Text>
            </View>
          ) : null}
        </View>
      )}
    </TouchableOpacity>
  );
}

const SmartEntryCard = React.memo(function SmartEntryCard({
  entry,
  onPress,
}: {
  entry: SmartJournalEntry;
  onPress: (id: string) => void;
}) {
  const config = FORMAT_CONFIG[entry.format];
  const distressColor = entry.distressLevel <= 3 ? Colors.success : entry.distressLevel <= 6 ? Colors.accent : Colors.danger;

  return (
    <TouchableOpacity
      style={styles.smartEntryCard}
      onPress={() => onPress(entry.id)}
      activeOpacity={0.8}
    >
      <View style={styles.smartEntryHeader}>
        <View style={styles.smartEntryLeft}>
          <View style={[styles.formatBadge, { backgroundColor: distressColor + '18' }]}>
            <Text style={styles.formatEmoji}>{config.emoji}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.smartEntryTitle} numberOfLines={1}>
              {entry.title || config.label}
            </Text>
            <Text style={styles.smartEntryTime}>{formatDate(entry.timestamp)}</Text>
          </View>
        </View>
        <View style={styles.smartEntryMeta}>
          {entry.isImportant && <Star size={14} color={Colors.brandAmber} fill={Colors.brandAmber} />}
          {entry.aiInsight && <Sparkles size={14} color={Colors.brandLilac} />}
          <View style={[styles.distressPill, { backgroundColor: distressColor + '18' }]}>
            <Text style={[styles.distressPillText, { color: distressColor }]}>
              {entry.distressLevel}
            </Text>
          </View>
        </View>
      </View>

      <Text style={styles.smartEntryPreview} numberOfLines={2}>
        {entry.content}
      </Text>

      {entry.emotions.length > 0 && (
        <View style={styles.entryEmotions}>
          {entry.emotions.slice(0, 3).map(e => (
            <View key={e.id} style={styles.emotionTag}>
              <Text style={styles.emotionEmoji}>{e.emoji}</Text>
              <Text style={styles.emotionLabel}>{e.label}</Text>
            </View>
          ))}
          {entry.emotions.length > 3 && (
            <Text style={styles.moreText}>+{entry.emotions.length - 3}</Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
});

const WRITE_FORMATS: { format: JournalEntryFormat; emoji: string; label: string }[] = [
  { format: 'free_writing', emoji: '✍️', label: 'Free Write' },
  { format: 'emotional_event', emoji: '🌊', label: 'Emotional Event' },
  { format: 'relationship_conflict', emoji: '💬', label: 'Conflict' },
  { format: 'letter_not_sent', emoji: '📨', label: 'Letter Not Sent' },
  { format: 'letter_to_future_self', emoji: '🕊️', label: 'Future Self' },
  { format: 'gratitude', emoji: '🙏', label: 'Gratitude' },
  { format: 'breakthrough_insight', emoji: '💡', label: 'Breakthrough' },
];

export default function JournalScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { journalEntries, triggerPatterns } = useApp();
  const { smartEntries, stats } = useJournal();
  const [showPatterns, setShowPatterns] = useState<boolean>(false);
  const [showWriteOptions, setShowWriteOptions] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'all' | 'journal' | 'checkins'>('all');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const hasPatterns =
    Object.keys(triggerPatterns.triggerCounts).length > 0 ||
    Object.keys(triggerPatterns.emotionCounts).length > 0;

  const hasAnyEntries = journalEntries.length > 0 || smartEntries.length > 0;

  const handleSmartEntryPress = useCallback((id: string) => {
    router.push(`/journal-entry-detail?id=${id}` as never);
  }, [router]);

  const handleWriteFormat = useCallback((format: JournalEntryFormat) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowWriteOptions(false);
    router.push(`/journal-write?format=${format}` as never);
  }, [router]);

  const handleGuidedFlow = useCallback((flowId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/journal-guided?flowId=${flowId}` as never);
  }, [router]);

  const allEntries = useMemo(() => {
    type MergedEntry = { type: 'checkin'; data: JournalEntry; timestamp: number } | { type: 'smart'; data: SmartJournalEntry; timestamp: number };
    const merged: MergedEntry[] = [];

    if (activeTab === 'all' || activeTab === 'checkins') {
      journalEntries.forEach(e => merged.push({ type: 'checkin', data: e, timestamp: e.timestamp }));
    }
    if (activeTab === 'all' || activeTab === 'journal') {
      smartEntries.forEach(e => merged.push({ type: 'smart', data: e, timestamp: e.timestamp }));
    }

    return merged.sort((a, b) => b.timestamp - a.timestamp);
  }, [journalEntries, smartEntries, activeTab]);

  const freeFlows = GUIDED_REFLECTION_FLOWS.filter(f => !f.isPremium);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <View style={styles.header}>
          <Text style={styles.title}>Journal</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => router.push('/journal/timeline')}
            >
              <Clock size={18} color={Colors.brandTeal} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => router.push('/journal-insights' as never)}
            >
              <BarChart3 size={18} color={Colors.brandTeal} />
            </TouchableOpacity>
            {hasPatterns && (
              <TouchableOpacity
                style={[styles.patternToggle, showPatterns && styles.patternToggleActive]}
                onPress={() => setShowPatterns(!showPatterns)}
              >
                <TrendingUp size={14} color={showPatterns ? Colors.white : Colors.brandTeal} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {stats.totalEntries > 0 && (
          <View style={styles.statsBar}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.streakDays}</Text>
              <Text style={styles.statLabel}>streak</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.thisWeekEntries}</Text>
              <Text style={styles.statLabel}>this week</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalEntries + journalEntries.length}</Text>
              <Text style={styles.statLabel}>total</Text>
            </View>
          </View>
        )}

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {showWriteOptions && (
            <View style={styles.writeOptionsCard}>
              <Text style={styles.writeOptionsTitle}>What would you like to write?</Text>
              <View style={styles.writeGrid}>
                {WRITE_FORMATS.map(item => (
                  <TouchableOpacity
                    key={item.format}
                    style={styles.writeOption}
                    onPress={() => handleWriteFormat(item.format)}
                  >
                    <Text style={styles.writeOptionEmoji}>{item.emoji}</Text>
                    <Text style={styles.writeOptionLabel}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.guidedTitle}>Guided Reflections</Text>
              {freeFlows.slice(0, 4).map(flow => (
                <TouchableOpacity
                  key={flow.id}
                  style={styles.guidedRow}
                  onPress={() => handleGuidedFlow(flow.id)}
                >
                  <Text style={styles.guidedEmoji}>{flow.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.guidedName}>{flow.title}</Text>
                    <Text style={styles.guidedDesc} numberOfLines={1}>{flow.description}</Text>
                  </View>
                  <Text style={styles.guidedTime}>{flow.estimatedMinutes} min</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {showPatterns && hasPatterns && (
            <View style={styles.patternsCard}>
              <Text style={styles.patternsTitle}>Your patterns</Text>
              <Text style={styles.patternsSubtitle}>
                Based on {journalEntries.length} check-in{journalEntries.length !== 1 ? 's' : ''}
              </Text>
              <PatternSection title="Top triggers" data={triggerPatterns.triggerCounts} />
              <PatternSection title="Most felt emotions" data={triggerPatterns.emotionCounts} />
              <PatternSection title="Common urges" data={triggerPatterns.urgeCounts} />
            </View>
          )}

          {hasAnyEntries && (
            <View style={styles.tabRow}>
              {(['all', 'journal', 'checkins'] as const).map(tab => (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tab, activeTab === tab && styles.tabActive]}
                  onPress={() => setActiveTab(tab)}
                >
                  <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                    {tab === 'all' ? 'All' : tab === 'journal' ? 'Journal' : 'Check-ins'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {!hasAnyEntries ? (
            <View style={styles.emptyState}>
              <BookOpen size={48} color={Colors.border} />
              <Text style={styles.emptyTitle}>Your journal is ready</Text>
              <Text style={styles.emptyDesc}>
                This is your private space to reflect.{'\n'}Write freely, follow guided prompts, or just check in.
              </Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => setShowWriteOptions(true)}
              >
                <PenLine size={16} color={Colors.white} />
                <Text style={styles.emptyBtnText}>Start writing</Text>
              </TouchableOpacity>
            </View>
          ) : (
            allEntries.map(item => {
              if (item.type === 'checkin') {
                return <CheckInEntryCard key={`ci_${item.data.id}`} entry={item.data as JournalEntry} />;
              }
              return (
                <SmartEntryCard
                  key={`sj_${item.data.id}`}
                  entry={item.data as SmartJournalEntry}
                  onPress={handleSmartEntryPress}
                />
              );
            })
          )}
        </ScrollView>

        <TouchableOpacity
          style={[styles.fab, { bottom: insets.bottom + 16 }]}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setShowWriteOptions(!showWriteOptions);
          }}
          activeOpacity={0.85}
        >
          {showWriteOptions ? (
            <ChevronDown size={24} color={Colors.white} />
          ) : (
            <Plus size={24} color={Colors.white} />
          )}
        </TouchableOpacity>
      </Animated.View>
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
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.brandTealSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.brandNavy,
    letterSpacing: -0.5,
  },
  patternToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.brandTealSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  patternToggleActive: {
    backgroundColor: Colors.brandTeal,
  },
  statsBar: {
    flexDirection: 'row',
    marginHorizontal: 22,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 1,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500' as const,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 2,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingBottom: 100,
    paddingTop: 8,
  },
  writeOptionsCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  writeOptionsTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 14,
  },
  writeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
  },
  writeOption: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
    minWidth: 80,
    flex: 1,
  },
  writeOptionEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  writeOptionLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  guidedTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  guidedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  guidedEmoji: {
    fontSize: 20,
  },
  guidedName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  guidedDesc: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 1,
  },
  guidedTime: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500' as const,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
  },
  tabActive: {
    backgroundColor: Colors.brandTeal,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.white,
  },
  patternsCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  patternsTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  patternsSubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
    marginBottom: 16,
  },
  patternSection: {
    marginTop: 12,
  },
  patternTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  patternRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  patternLabel: {
    fontSize: 13,
    color: Colors.text,
    width: 120,
  },
  patternBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.surface,
    borderRadius: 4,
    overflow: 'hidden',
  },
  patternBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  patternCount: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    width: 24,
    textAlign: 'right' as const,
  },
  entryCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 1,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  entryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkInBadge: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  checkInBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.primary,
    textTransform: 'uppercase' as const,
  },
  intensityBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  intensityBadgeText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700' as const,
  },
  entryTime: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  entryTimeDetail: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 1,
  },
  entryEmotions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  emotionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  emotionEmoji: {
    fontSize: 13,
  },
  emotionLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  moreText: {
    fontSize: 12,
    color: Colors.textMuted,
    alignSelf: 'center',
  },
  entryDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    gap: 12,
  },
  detailSection: {},
  detailLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  smartEntryCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 1,
  },
  smartEntryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  smartEntryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  formatBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formatEmoji: {
    fontSize: 16,
  },
  smartEntryTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  smartEntryTime: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 1,
  },
  smartEntryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  distressPill: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  distressPillText: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  smartEntryPreview: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginBottom: 6,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: Colors.text,
    marginTop: 16,
  },
  emptyDesc: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.brandTeal,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  emptyBtnText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  fab: {
    position: 'absolute',
    right: 22,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.brandTeal,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.brandTeal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
});
