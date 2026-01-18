import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { ProgressBar } from '../components/ProgressBar';
import { SectionTitle } from '../components/SectionTitle';
import { ColorDot } from '../components/ColorDot';
import { DurationSlider } from '../components/DurationSlider';
import { useAppStore } from '../stores/AppStore';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing, typography } from '../theme';
import { formatDuration, secondsFromMs, toDateKey } from '../utils/date';
import { getWorkedMinutesForDate } from '../utils/aggregation';

export const TodayScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    isReady,
    activities,
    goals,
    notes,
    sessions,
    runningSession,
    breakEndsAt,
    now,
    toggleActivityTracking,
    pauseTracking,
    stopTracking,
    startBreak,
    endBreak,
    switchTracking,
    ensureDailyGoalsForDate,
    getDailySummary,
  } = useAppStore();
  const [switchModalOpen, setSwitchModalOpen] = useState(false);
  const [breakModalOpen, setBreakModalOpen] = useState(false);
  const [customBreakMinutes, setCustomBreakMinutes] = useState(10);

  const quickBreakOptions = [5, 15, 30];

  const todayKey = toDateKey(now);

  useEffect(() => {
    if (isReady) {
      ensureDailyGoalsForDate(todayKey);
    }
  }, [ensureDailyGoalsForDate, isReady, todayKey]);

  const goalsByActivity = useMemo(() => {
    const map = new Map<string, number>();
    goals
      .filter((goal) => goal.date === todayKey)
      .forEach((goal) => map.set(goal.activityId, goal.goalMinutes));
    return map;
  }, [goals, todayKey]);

  const notesByActivity = useMemo(() => {
    const map = new Map<string, string>();
    notes
      .filter((note) => note.date === todayKey)
      .forEach((note) => map.set(note.activityId, note.text));
    return map;
  }, [notes, todayKey]);

  const summary = getDailySummary(todayKey);
  const hasGoals = summary.totalGoalMinutes > 0;
  const remainingTotal = Math.max(0, summary.totalGoalMinutes - summary.totalWorkedMinutes);
  const pendingActivityId = useMemo(() => {
    for (const activity of activities) {
      const goalMinutes = goalsByActivity.get(activity.id) ?? 0;
      const workedMinutes = getWorkedMinutesForDate(sessions, todayKey, now, activity.id);
      if (goalMinutes > 0 && workedMinutes < goalMinutes) {
        return activity.id;
      }
    }
    return undefined;
  }, [activities, goalsByActivity, now, sessions, todayKey]);

  const runningActivity = runningSession
    ? activities.find((activity) => activity.id === runningSession.activityId)
    : undefined;
  const runningElapsedSeconds = runningSession
    ? secondsFromMs(now - runningSession.startTs)
    : 0;
  const breakRemainingSeconds = breakEndsAt
    ? Math.max(0, secondsFromMs(breakEndsAt - now))
    : 0;

  const handleStartBreak = async (minutes: number) => {
    if (!minutes || minutes <= 0) {
      return;
    }
    setBreakModalOpen(false);
    await startBreak(minutes);
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SectionTitle title="Today" subtitle={todayKey} />

        {breakEndsAt && breakRemainingSeconds > 0 ? (
          <Card style={styles.breakCard}>
            <View style={styles.breakRow}>
              <View>
                <Text style={styles.breakTitle}>Break in progress</Text>
                <Text style={styles.breakSubtitle}>
                  Ends in {formatDuration(breakRemainingSeconds)}
                </Text>
              </View>
              <Button title="End break" variant="ghost" onPress={endBreak} style={styles.breakAction} />
            </View>
          </Card>
        ) : null}

        {runningSession && runningActivity ? (
          <Card style={styles.stickyCard}>
            <Text style={styles.stickyLabel}>Currently tracking</Text>
            <Text style={styles.stickyTitle}>{runningActivity.name}</Text>
            <Text style={styles.stickyTimer}>{formatDuration(runningElapsedSeconds)}</Text>
            <View style={styles.stickyActions}>
              <Button title="Pause" variant="secondary" onPress={pauseTracking} />
              <Button title="Stop" variant="ghost" onPress={stopTracking} />
              <Button title="Switch" onPress={() => setSwitchModalOpen(true)} />
            </View>
            <Button
              title="Take a break"
              variant="secondary"
              onPress={() => setBreakModalOpen(true)}
              style={styles.breakButton}
            />
          </Card>
        ) : null}

        {hasGoals ? (
          remainingTotal > 0 ? (
            <Card style={styles.banner}>
              <Text style={styles.bannerText}>{remainingTotal} min left to complete today</Text>
              <Button
                title="Jump in"
                onPress={() =>
                  pendingActivityId ? toggleActivityTracking(pendingActivityId) : undefined
                }
                variant="secondary"
              />
            </Card>
          ) : (
            <Card style={styles.bannerDone}>
              <Text style={styles.bannerText}>All goals completed for today 🎉</Text>
            </Card>
          )
        ) : (
          <Card style={styles.bannerDone}>
            <Text style={styles.bannerText}>No goals set for today yet.</Text>
            {activities[0] ? (
              <Button
                title="Set a goal"
                variant="secondary"
                onPress={() =>
                  navigation.navigate('GoalEditor', { activityId: activities[0].id, date: todayKey })
                }
              />
            ) : null}
          </Card>
        )}

        <SectionTitle title="Activities" subtitle="Start or update your focus" />
        {activities.length === 0 ? (
          <Card>
            <Text style={styles.emptyText}>Create your first activity in Settings.</Text>
          </Card>
        ) : (
          activities.map((activity) => {
            const goalMinutes = goalsByActivity.get(activity.id) ?? 0;
            const workedMinutes = getWorkedMinutesForDate(sessions, todayKey, now, activity.id);
            const remaining = Math.max(0, goalMinutes - workedMinutes);
            const progress = goalMinutes > 0 ? workedMinutes / goalMinutes : 0;
            const isRunning = runningSession?.activityId === activity.id;
            const actionLabel = isRunning ? 'Pause' : runningSession ? 'Switch' : 'Start';

            return (
              <Card key={activity.id} style={styles.activityCard}>
                <View style={styles.activityHeader}>
                  <View style={styles.activityTitleRow}>
                    <ColorDot color={activity.color} size={12} />
                    <Text style={styles.activityTitle}>{activity.name}</Text>
                  </View>
                  <Button
                    title={actionLabel}
                    variant={isRunning ? 'secondary' : 'primary'}
                    onPress={() => toggleActivityTracking(activity.id)}
                  />
                </View>

                <View style={styles.metricsRow}>
                  <View>
                    <Text style={styles.metricLabel}>Goal</Text>
                    <Text style={styles.metricValue}>{goalMinutes} min</Text>
                  </View>
                  <View>
                    <Text style={styles.metricLabel}>Worked</Text>
                    <Text style={styles.metricValue}>{workedMinutes} min</Text>
                  </View>
                  <View>
                    <Text style={styles.metricLabel}>Remaining</Text>
                    <Text style={styles.metricValue}>{remaining} min</Text>
                  </View>
                </View>

                <ProgressBar progress={progress} />

                <View style={styles.activityFooter}>
                  <Pressable
                    onPress={() =>
                      navigation.navigate('GoalEditor', { activityId: activity.id, date: todayKey })
                    }
                  >
                    <Text style={styles.link}>Set goal</Text>
                  </Pressable>
                  <Pressable
                    onPress={() =>
                      navigation.navigate('NoteEditor', { activityId: activity.id, date: todayKey })
                    }
                  >
                    <Text style={styles.link}>{notesByActivity.get(activity.id) ? 'Edit note' : 'Add note'}</Text>
                  </Pressable>
                </View>

                {notesByActivity.get(activity.id) ? (
                  <Text style={styles.notePreview} numberOfLines={2}>
                    {notesByActivity.get(activity.id)}
                  </Text>
                ) : null}
              </Card>
            );
          })
        )}
      </ScrollView>

      <Modal animationType="slide" visible={switchModalOpen} transparent>
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard}>
            <Text style={styles.modalTitle}>Switch activity</Text>
            {activities
              .filter((activity) => activity.id !== runningSession?.activityId)
              .map((activity) => (
                <Pressable
                  key={activity.id}
                  style={styles.modalItem}
                  onPress={() => {
                    setSwitchModalOpen(false);
                    switchTracking(activity.id);
                  }}
                >
                  <ColorDot color={activity.color} size={10} />
                  <Text style={styles.modalItemText}>{activity.name}</Text>
                </Pressable>
              ))}
            <Button title="Cancel" variant="ghost" onPress={() => setSwitchModalOpen(false)} />
          </Card>
        </View>
      </Modal>

      <Modal animationType="slide" visible={breakModalOpen} transparent>
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard}>
            <Text style={styles.modalTitle}>Take a break</Text>
            <Text style={styles.modalSubtitle}>Pick a timer or set your own.</Text>

            <View style={styles.breakOptionsRow}>
              {quickBreakOptions.map((minutes) => (
                <Pressable
                  key={minutes}
                  style={({ pressed }) => [
                    styles.breakOption,
                    pressed ? styles.breakOptionPressed : null,
                  ]}
                  onPress={() => handleStartBreak(minutes)}
                >
                  <Text style={styles.breakOptionText}>{minutes} min</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.customBreakSection}>
              <View style={styles.customBreakHeader}>
                <Text style={styles.customBreakLabel}>Custom</Text>
                <Text style={styles.customBreakValue}>{customBreakMinutes} min</Text>
              </View>
              <DurationSlider
                min={1}
                max={60}
                step={1}
                value={customBreakMinutes}
                onChange={setCustomBreakMinutes}
              />
              <Button
                title={`Start ${customBreakMinutes} min break`}
                variant="secondary"
                onPress={() => handleStartBreak(customBreakMinutes)}
              />
            </View>

            <Button title="Cancel" variant="ghost" onPress={() => setBreakModalOpen(false)} />
          </Card>
        </View>
      </Modal>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  stickyCard: {
    backgroundColor: colors.highlight,
  },
  stickyLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.muted,
  },
  stickyTitle: {
    marginTop: spacing.xs,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.xl,
    color: colors.text,
  },
  stickyTimer: {
    marginTop: spacing.xs,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.xxl,
    color: colors.primaryDark,
  },
  stickyActions: {
    marginTop: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  breakCard: {
    backgroundColor: colors.highlight,
    gap: spacing.xs,
  },
  breakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  breakTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    color: colors.text,
  },
  breakSubtitle: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.muted,
  },
  breakAction: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  breakButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  banner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerDone: {
    alignItems: 'center',
  },
  bannerText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.md,
    color: colors.text,
  },
  activityCard: {
    gap: spacing.md,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.lg,
    color: colors.text,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.xs,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  metricValue: {
    marginTop: spacing.xs,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    color: colors.text,
  },
  activityFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  link: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.primary,
  },
  notePreview: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.muted,
  },
  emptyText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.md,
    color: colors.muted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    margin: spacing.lg,
    gap: spacing.sm,
  },
  modalTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.lg,
    color: colors.text,
  },
  modalSubtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.muted,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  modalItemText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.md,
    color: colors.text,
  },
  breakOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  breakOption: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 999,
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  breakOptionPressed: {
    transform: [{ scale: 0.98 }],
    backgroundColor: colors.highlight,
  },
  breakOptionText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  customBreakSection: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  customBreakHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customBreakLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.xs,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  customBreakValue: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    color: colors.text,
  },
});
