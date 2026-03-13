import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  Alert,
  Switch,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Check, ChevronDown, Plus, Minus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useMedications } from '@/providers/MedicationProvider';
import { useAnalytics } from '@/providers/AnalyticsProvider';
import {
  MedicationCategory,
  MedicationSchedule,
  MedicationTime,
  MEDICATION_CATEGORIES,
  MEDICATION_SCHEDULES,
  getDefaultTimesForSchedule,
  formatTime,
} from '@/types/medication';

export default function MedicationAddScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ editId?: string }>();
  const { trackEvent } = useAnalytics();
  const { addMedication, updateMedication, getMedicationById, isAddingMedication } = useMedications();

  const editMed = params.editId ? getMedicationById(params.editId) : null;
  const isEditing = !!editMed;

  const [name, setName] = useState<string>(editMed?.name ?? '');
  const [dosage, setDosage] = useState<string>(editMed?.dosage ?? '');
  const [category, setCategory] = useState<MedicationCategory>(editMed?.category ?? 'other');
  const [schedule, setSchedule] = useState<MedicationSchedule>(editMed?.schedule ?? 'daily');
  const [times, setTimes] = useState<MedicationTime[]>(editMed?.times ?? getDefaultTimesForSchedule('daily'));
  const [purpose, setPurpose] = useState<string>(editMed?.purpose ?? '');
  const [reminderEnabled, setReminderEnabled] = useState<boolean>(editMed?.reminderEnabled ?? true);
  const [sideEffectNotes, setSideEffectNotes] = useState<string>(editMed?.sideEffectNotes ?? '');
  const [generalNotes, setGeneralNotes] = useState<string>(editMed?.generalNotes ?? '');
  const [showCategoryPicker, setShowCategoryPicker] = useState<boolean>(false);
  const [showSchedulePicker, setShowSchedulePicker] = useState<boolean>(false);

  const handleScheduleChange = useCallback((newSchedule: MedicationSchedule) => {
    setSchedule(newSchedule);
    setTimes(getDefaultTimesForSchedule(newSchedule));
    setShowSchedulePicker(false);
  }, []);

  const adjustTimeHour = useCallback((index: number, delta: number) => {
    setTimes(prev => prev.map((t, i) => {
      if (i !== index) return t;
      let newHour = t.hour + delta;
      if (newHour < 0) newHour = 23;
      if (newHour > 23) newHour = 0;
      return { ...t, hour: newHour };
    }));
  }, []);

  const adjustTimeMinute = useCallback((index: number, delta: number) => {
    setTimes(prev => prev.map((t, i) => {
      if (i !== index) return t;
      let newMinute = t.minute + delta;
      if (newMinute < 0) newMinute = 45;
      if (newMinute > 59) newMinute = 0;
      return { ...t, minute: newMinute };
    }));
  }, []);

  const addTimeSlot = useCallback(() => {
    setTimes(prev => [...prev, { hour: 12, minute: 0, label: `Dose ${prev.length + 1}` }]);
  }, []);

  const removeTimeSlot = useCallback((index: number) => {
    setTimes(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter the medication name.');
      return;
    }

    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      if (isEditing && editMed) {
        await updateMedication(editMed.id, {
          name: name.trim(),
          dosage: dosage.trim(),
          category,
          schedule,
          times,
          purpose: purpose.trim(),
          reminderEnabled,
          sideEffectNotes: sideEffectNotes.trim(),
          generalNotes: generalNotes.trim(),
        });
        trackEvent('medication_edited', { category });
      } else {
        await addMedication({
          name: name.trim(),
          dosage: dosage.trim(),
          category,
          schedule,
          times,
          purpose: purpose.trim(),
          startDate: Date.now(),
          active: true,
          reminderEnabled,
          sideEffectNotes: sideEffectNotes.trim(),
          generalNotes: generalNotes.trim(),
        });
        trackEvent('medication_added', { category, schedule });
      }
      router.back();
    } catch (error) {
      console.log('[MedicationAdd] Error saving:', error);
      Alert.alert('Error', 'Could not save medication. Please try again.');
    }
  }, [
    name, dosage, category, schedule, times, purpose, reminderEnabled,
    sideEffectNotes, generalNotes, isEditing, editMed,
    addMedication, updateMedication, trackEvent, router,
  ]);

  const selectedCategory = MEDICATION_CATEGORIES.find(c => c.value === category);
  const selectedSchedule = MEDICATION_SCHEDULES.find(s => s.value === schedule);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
          testID="medication-add-close"
        >
          <X size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Edit Medication' : 'Add Medication'}</Text>
        <TouchableOpacity
          style={[styles.saveButton, !name.trim() && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!name.trim() || isAddingMedication}
          testID="medication-save"
        >
          <Check size={20} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Medication Name</Text>
            <TextInput
              style={styles.textInput}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Lamotrigine, Sertraline..."
              placeholderTextColor={Colors.textMuted}
              testID="medication-name-input"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Dosage</Text>
            <TextInput
              style={styles.textInput}
              value={dosage}
              onChangeText={setDosage}
              placeholder="e.g. 50mg, 100mg..."
              placeholderTextColor={Colors.textMuted}
              testID="medication-dosage-input"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Category</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowCategoryPicker(!showCategoryPicker)}
            >
              <Text style={styles.pickerValue}>{selectedCategory?.label ?? 'Select'}</Text>
              <ChevronDown size={16} color={Colors.textMuted} />
            </TouchableOpacity>
            {showCategoryPicker && (
              <View style={styles.pickerOptions}>
                {MEDICATION_CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat.value}
                    style={[styles.pickerOption, category === cat.value && styles.pickerOptionSelected]}
                    onPress={() => {
                      setCategory(cat.value);
                      setShowCategoryPicker(false);
                    }}
                  >
                    <Text style={[
                      styles.pickerOptionText,
                      category === cat.value && styles.pickerOptionTextSelected,
                    ]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Schedule</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowSchedulePicker(!showSchedulePicker)}
            >
              <View>
                <Text style={styles.pickerValue}>{selectedSchedule?.label ?? 'Select'}</Text>
                <Text style={styles.pickerDesc}>{selectedSchedule?.description}</Text>
              </View>
              <ChevronDown size={16} color={Colors.textMuted} />
            </TouchableOpacity>
            {showSchedulePicker && (
              <View style={styles.pickerOptions}>
                {MEDICATION_SCHEDULES.map(sch => (
                  <TouchableOpacity
                    key={sch.value}
                    style={[styles.pickerOption, schedule === sch.value && styles.pickerOptionSelected]}
                    onPress={() => handleScheduleChange(sch.value)}
                  >
                    <Text style={[
                      styles.pickerOptionText,
                      schedule === sch.value && styles.pickerOptionTextSelected,
                    ]}>
                      {sch.label}
                    </Text>
                    <Text style={styles.pickerOptionDesc}>{sch.description}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {schedule !== 'as_needed' && (
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Times</Text>
              {times.map((time, idx) => (
                <View key={idx} style={styles.timeRow}>
                  <Text style={styles.timeLabel}>{time.label}</Text>
                  <View style={styles.timeAdjuster}>
                    <TouchableOpacity
                      style={styles.timeAdjustBtn}
                      onPress={() => adjustTimeHour(idx, -1)}
                    >
                      <Minus size={14} color={Colors.textSecondary} />
                    </TouchableOpacity>
                    <Text style={styles.timeValue}>{formatTime(time.hour, time.minute)}</Text>
                    <TouchableOpacity
                      style={styles.timeAdjustBtn}
                      onPress={() => adjustTimeHour(idx, 1)}
                    >
                      <Plus size={14} color={Colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.timeAdjuster}>
                    <TouchableOpacity
                      style={styles.timeAdjustBtn}
                      onPress={() => adjustTimeMinute(idx, -15)}
                    >
                      <Minus size={14} color={Colors.textSecondary} />
                    </TouchableOpacity>
                    <Text style={styles.timeMinLabel}>min</Text>
                    <TouchableOpacity
                      style={styles.timeAdjustBtn}
                      onPress={() => adjustTimeMinute(idx, 15)}
                    >
                      <Plus size={14} color={Colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  {times.length > 1 && (
                    <TouchableOpacity
                      style={styles.timeRemoveBtn}
                      onPress={() => removeTimeSlot(idx)}
                    >
                      <X size={14} color={Colors.danger} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              {(schedule === 'custom' || schedule === 'three_times_daily') && (
                <TouchableOpacity style={styles.addTimeBtn} onPress={addTimeSlot}>
                  <Plus size={14} color={Colors.primary} />
                  <Text style={styles.addTimeBtnText}>Add time</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Purpose (optional)</Text>
            <TextInput
              style={styles.textInput}
              value={purpose}
              onChangeText={setPurpose}
              placeholder="e.g. Mood stability, anxiety..."
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchLabel}>Reminders</Text>
              <Text style={styles.switchDesc}>Get notified when it's time</Text>
            </View>
            <Switch
              value={reminderEnabled}
              onValueChange={setReminderEnabled}
              trackColor={{ false: Colors.border, true: Colors.primaryLight }}
              thumbColor={reminderEnabled ? Colors.primary : Colors.textMuted}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Side effects to watch (optional)</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={sideEffectNotes}
              onChangeText={setSideEffectNotes}
              placeholder="Any side effects you want to track..."
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Notes (optional)</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={generalNotes}
              onChangeText={setGeneralNotes}
              placeholder="Any other notes..."
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={3}
            />
          </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center',
  },
  saveButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.4,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 60,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top' as const,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  pickerValue: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  pickerDesc: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  pickerOptions: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
  },
  pickerOption: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  pickerOptionSelected: {
    backgroundColor: Colors.primaryLight,
  },
  pickerOptionText: {
    fontSize: 15,
    color: Colors.text,
  },
  pickerOptionTextSelected: {
    fontWeight: '600' as const,
    color: Colors.primaryDark,
  },
  pickerOptionDesc: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 8,
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    minWidth: 60,
  },
  timeAdjuster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeAdjustBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    minWidth: 70,
    textAlign: 'center',
  },
  timeMinLabel: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  timeRemoveBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTimeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 12,
    justifyContent: 'center',
  },
  addTimeBtnText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.primary,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  switchInfo: {
    flex: 1,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  switchDesc: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
