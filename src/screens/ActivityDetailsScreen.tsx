import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { G } from 'react-native-svg';
import {
  Background,
  Bar as NativeBar,
  LineSegment,
  VictoryAxis,
  VictoryBar,
  VictoryChart,
  VictoryContainer,
  VictoryLabel,
  VictoryTheme,
} from 'victory-native';
import { Screen } from '../components/Screen';
import { Card } from '../components/Card';
import { SectionTitle } from '../components/SectionTitle';
import { StatPill } from '../components/StatPill';
import { ColorDot } from '../components/ColorDot';
import { useAppStore } from '../stores/AppStore';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing, typography } from '../theme';
import { formatDateShort } from '../utils/date';

export const ActivityDetailsScreen: React.FC = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'ActivityDetails'>>();
  const { activityId } = route.params;
  const { getActivityStats } = useAppStore();
  const stats = getActivityStats(activityId);

  const last7 = stats.dailyMinutes.slice(-7);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SectionTitle title="Activity" subtitle={stats.activity.name} />

        <Card style={styles.headerCard}>
          <View style={styles.headerRow}>
            <ColorDot color={stats.activity.color} size={12} />
            <Text style={styles.activityName}>{stats.activity.name}</Text>
          </View>
          <Text style={styles.subText}>
            Best day: {stats.bestDay ? `${formatDateShort(stats.bestDay.date)} • ${stats.bestDay.minutes} min` : '—'}
          </Text>
        </Card>

        <Card style={styles.summaryCard}>
          <View style={styles.pillRow}>
            <StatPill label="7 Day Total" value={`${stats.totals.last7} min`} />
            <StatPill label="30 Day Total" value={`${stats.totals.last30} min`} />
          </View>
          <View style={styles.pillRow}>
            <StatPill label="All Time" value={`${stats.totals.allTime} min`} />
            <StatPill
              label="Completion"
              value={`${Math.round(stats.completionRate * 100)}%`}
            />
          </View>
          <StatPill label="Avg / tracked day" value={`${stats.averagePerTrackedDay} min`} />
        </Card>

        <SectionTitle title="Last 7 days" subtitle="Daily minutes" />
        <Card>
          {last7.length === 0 ? (
            <Text style={styles.subText}>No activity yet.</Text>
          ) : (
            <VictoryChart
              theme={VictoryTheme.material}
              domainPadding={{ x: 18, y: 10 }}
              height={220}
              containerComponent={<VictoryContainer />}
              groupComponent={<G />}
              backgroundComponent={<Background />}
              prependDefaultAxes={false}
            >
              <VictoryAxis
                tickFormat={(datum) => formatDateShort(datum)}
                axisComponent={<LineSegment />}
                axisLabelComponent={<VictoryLabel />}
                tickLabelComponent={<VictoryLabel />}
                tickComponent={<LineSegment />}
                gridComponent={<LineSegment />}
                containerComponent={<VictoryContainer />}
                groupComponent={<G />}
                style={{
                  axis: { stroke: colors.border },
                  tickLabels: { fill: colors.muted, fontSize: 10, padding: 6 },
                }}
              />
              <VictoryAxis
                dependentAxis
                axisComponent={<LineSegment />}
                axisLabelComponent={<VictoryLabel />}
                tickLabelComponent={<VictoryLabel />}
                tickComponent={<LineSegment />}
                gridComponent={<LineSegment />}
                containerComponent={<VictoryContainer />}
                groupComponent={<G />}
                style={{
                  axis: { stroke: colors.border },
                  grid: { stroke: colors.border },
                  tickLabels: { fill: colors.muted, fontSize: 10, padding: 6 },
                }}
              />
              <VictoryBar
                data={last7.map((entry) => ({ x: entry.date, y: entry.minutes }))}
                style={{ data: { fill: stats.activity.color || colors.primary } }}
                cornerRadius={{ top: 6 }}
                dataComponent={<NativeBar />}
                labelComponent={<VictoryLabel />}
                containerComponent={<VictoryContainer />}
                groupComponent={<G />}
              />
            </VictoryChart>
          )}
        </Card>
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
  headerCard: {
    gap: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityName: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.xl,
    color: colors.text,
  },
  subText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.muted,
  },
  summaryCard: {
    gap: spacing.md,
  },
  pillRow: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
});
