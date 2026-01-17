import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../components/Screen';
import { Card } from '../components/Card';
import { DonutChart } from '../components/DonutChart';
import { SectionTitle } from '../components/SectionTitle';
import { ColorDot } from '../components/ColorDot';
import { useAppStore } from '../stores/AppStore';
import { RootStackParamList } from '../navigation/types';
import { addDays, toDateKey } from '../utils/date';
import { colors, spacing, typography } from '../theme';

export const CalendarScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { goals, getDailySummary, now } = useAppStore();
  const todayKey = toDateKey(now);
  const [selectedDate, setSelectedDate] = useState(todayKey);

  const goalDates = useMemo(
    () => Array.from(new Set(goals.map((goal) => goal.date))).sort(),
    [goals],
  );

  const currentStreakDates = useMemo(() => {
    const streak: string[] = [];
    let cursor = todayKey;
    while (true) {
      const goalsForDate = goals.filter((goal) => goal.date === cursor);
      if (goalsForDate.length === 0) {
        break;
      }
      const summary = getDailySummary(cursor);
      if (!summary.isComplete) {
        break;
      }
      streak.push(cursor);
      cursor = addDays(cursor, -1);
    }
    return streak;
  }, [getDailySummary, goals, todayKey]);

  const markedDates = useMemo(() => {
    const marks: Record<
      string,
      { marked?: boolean; dotColor?: string; selected?: boolean; selectedColor?: string }
    > = {};
    const streakSet = new Set(currentStreakDates);
    goalDates.forEach((date) => {
      const summary = getDailySummary(date);
      const isStreak = streakSet.has(date);
      marks[date] = {
        marked: true,
        dotColor: summary.isComplete ? (isStreak ? colors.primary : colors.success) : colors.accent,
      };
    });
    marks[selectedDate] = {
      ...(marks[selectedDate] ?? {}),
      selected: true,
      selectedColor: colors.primaryDark,
    };
    return marks;
  }, [currentStreakDates, getDailySummary, goalDates, selectedDate]);

  const summary = getDailySummary(selectedDate);
  const totalRemaining = Math.max(0, summary.totalGoalMinutes - summary.totalWorkedMinutes);
  const totalData = summary.totalGoalMinutes
    ? [
        { x: 'worked', y: summary.totalWorkedMinutes, color: colors.ringWorked },
        { x: 'remaining', y: totalRemaining, color: colors.ringRemaining },
      ]
    : [];

  const breakdownData = summary.activities
    .filter((activity) => activity.workedMinutes > 0)
    .map((activity) => ({
      x: activity.activityName,
      y: activity.workedMinutes,
      color: activity.color ?? colors.primary,
    }));

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SectionTitle title="Calendar" subtitle="Track streaks and patterns" />

        <Card>
          <Calendar
            onDayPress={(day) => setSelectedDate(day.dateString)}
            markedDates={markedDates}
            theme={{
              backgroundColor: 'transparent',
              calendarBackground: 'transparent',
              todayTextColor: colors.primary,
              textDayFontFamily: typography.fontFamily.regular,
              textMonthFontFamily: typography.fontFamily.bold,
              textDayHeaderFontFamily: typography.fontFamily.medium,
              textDayFontSize: 14,
              textMonthFontSize: 18,
              monthTextColor: colors.text,
              dayTextColor: colors.text,
              textDisabledColor: colors.muted,
              arrowColor: colors.primary,
              selectedDayBackgroundColor: colors.primaryDark,
              selectedDayTextColor: colors.card,
            }}
          />
        </Card>

        <SectionTitle title="Day focus" subtitle={selectedDate} />

        <Card style={styles.summaryCard}>
          <View style={styles.chartRow}>
            <DonutChart
              data={totalData}
              size={140}
              thickness={20}
              centerLabel={`${summary.totalWorkedMinutes}/${summary.totalGoalMinutes}m`}
            />
            <View style={styles.summaryText}>
              <Text style={styles.summaryTitle}>Total progress</Text>
              <Text style={styles.summaryValue}>{summary.totalWorkedMinutes} min</Text>
              <Text style={styles.summarySub}>{totalRemaining} min remaining</Text>
            </View>
          </View>

          <View style={styles.breakdownSection}>
            <Text style={styles.summaryTitle}>Breakdown</Text>
            {breakdownData.length === 0 ? (
              <Text style={styles.emptyText}>No tracked time for this day.</Text>
            ) : (
              <View style={styles.breakdownRow}>
                <DonutChart data={breakdownData} size={120} thickness={18} />
                <View style={styles.breakdownLegend}>
                  {breakdownData.map((entry) => (
                    <View key={entry.x} style={styles.legendItem}>
                      <ColorDot color={entry.color} size={10} />
                      <Text style={styles.legendText}>{entry.x}</Text>
                      <Text style={styles.legendValue}>{entry.y}m</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        </Card>

        <SectionTitle title="Activities" subtitle="Daily totals" />
        {summary.activities.length === 0 ? (
          <Card>
            <Text style={styles.emptyText}>No goals or sessions for this day.</Text>
          </Card>
        ) : (
          summary.activities.map((activity) => (
            <Card key={activity.activityId} style={styles.activityRow}>
              <View style={styles.activityHeader}>
                <View style={styles.activityTitleRow}>
                  <ColorDot color={activity.color} size={10} />
                  <Text style={styles.activityTitle}>{activity.activityName}</Text>
                </View>
                <Text style={styles.activityValue}>{activity.workedMinutes} / {activity.goalMinutes} min</Text>
              </View>
              {activity.note ? (
                <>
                  <Text style={styles.noteText} numberOfLines={3}>{activity.note}</Text>
                  <Pressable
                    onPress={() =>
                      navigation.navigate('NoteEditor', {
                        activityId: activity.activityId,
                        date: selectedDate,
                      })
                    }
                  >
                    <Text style={styles.noteLink}>View note</Text>
                  </Pressable>
                </>
              ) : (
                <Pressable
                  onPress={() =>
                    navigation.navigate('NoteEditor', {
                      activityId: activity.activityId,
                      date: selectedDate,
                    })
                  }
                >
                  <Text style={styles.noteLink}>Add note</Text>
                </Pressable>
              )}
            </Card>
          ))
        )}
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  summaryCard: {
    gap: spacing.lg,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  summaryText: {
    flex: 1,
  },
  summaryTitle: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  summaryValue: {
    marginTop: spacing.xs,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.xl,
    color: colors.text,
  },
  summarySub: {
    marginTop: spacing.xs,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.muted,
  },
  breakdownSection: {
    gap: spacing.sm,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  breakdownLegend: {
    flex: 1,
    gap: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  legendText: {
    flex: 1,
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  legendValue: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  activityRow: {
    gap: spacing.xs,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  activityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    color: colors.text,
  },
  activityValue: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  noteText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.muted,
  },
  noteLink: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.primary,
  },
  emptyText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.muted,
  },
});
