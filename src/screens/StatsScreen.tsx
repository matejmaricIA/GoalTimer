import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { Card } from '../components/Card';
import { SectionTitle } from '../components/SectionTitle';
import { StatPill } from '../components/StatPill';
import { ColorDot } from '../components/ColorDot';
import { useAppStore } from '../stores/AppStore';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing, typography } from '../theme';

export const StatsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { activities, getOverallStats, getActivityStats } = useAppStore();

  const overall = getOverallStats();
  const activityTotals = useMemo(
    () =>
      activities.map((activity) => {
        const stats = getActivityStats(activity.id);
        return { activity, last7: stats.totals.last7 };
      }),
    [activities, getActivityStats],
  );

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SectionTitle title="Stats" subtitle="Momentum and streaks" />

        <Card style={styles.summaryCard}>
          <View style={styles.pillRow}>
            <StatPill label="Current Streak" value={`${overall.currentStreak} days`} />
            <StatPill label="Best Streak" value={`${overall.bestStreak} days`} />
          </View>
          <View style={styles.pillRow}>
            <StatPill label="Last 7 Days" value={`${overall.last7Total} min`} />
            <StatPill label="Last 30 Days" value={`${overall.last30Total} min`} />
          </View>
        </Card>

        <SectionTitle title="Activities" subtitle="Tap for details" />
        {activityTotals.length === 0 ? (
          <Card>
            <Text style={styles.emptyText}>No activities yet.</Text>
          </Card>
        ) : (
          activityTotals.map(({ activity, last7 }) => (
            <Pressable
              key={activity.id}
              onPress={() => navigation.navigate('ActivityDetails', { activityId: activity.id })}
            >
              <Card style={styles.activityCard}>
                <View style={styles.activityRow}>
                  <View style={styles.activityTitleRow}>
                    <ColorDot color={activity.color} size={10} />
                    <Text style={styles.activityTitle}>{activity.name}</Text>
                  </View>
                  <Text style={styles.activityValue}>{last7} min</Text>
                </View>
                <Text style={styles.activitySub}>Last 7 days</Text>
              </Card>
            </Pressable>
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
    gap: spacing.md,
  },
  pillRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  activityCard: {
    gap: spacing.xs,
  },
  activityRow: {
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
    fontSize: typography.size.md,
    color: colors.text,
  },
  activityValue: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    color: colors.text,
  },
  activitySub: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.muted,
  },
  emptyText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.muted,
  },
});
