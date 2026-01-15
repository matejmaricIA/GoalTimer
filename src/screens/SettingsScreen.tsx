import React from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { SectionTitle } from '../components/SectionTitle';
import { ColorDot } from '../components/ColorDot';
import { useAppStore } from '../stores/AppStore';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing, typography } from '../theme';

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { activities, deleteActivity, exportData } = useAppStore();

  const handleDelete = (activityId: string, activityName: string) => {
    Alert.alert('Delete activity', `Delete ${activityName} and all related data?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteActivity(activityId),
      },
    ]);
  };

  const handleExport = async () => {
    const payload = await exportData();
    await Share.share({ message: payload, title: 'GoalTimer export' });
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SectionTitle title="Settings" subtitle="Manage your setup" />

        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Activities</Text>
            <Button
              title="Add"
              variant="primary"
              onPress={() => navigation.navigate('ActivityForm')}
            />
          </View>
          {activities.length === 0 ? (
            <Text style={styles.emptyText}>No activities yet.</Text>
          ) : (
            activities.map((activity) => (
              <View key={activity.id} style={styles.activityRow}>
                <View style={styles.activityTitleRow}>
                  <ColorDot color={activity.color} size={10} />
                  <Text style={styles.activityTitle}>{activity.name}</Text>
                </View>
                <View style={styles.activityActions}>
                  <Pressable onPress={() => navigation.navigate('ActivityForm', { activityId: activity.id })}>
                    <Text style={styles.link}>Edit</Text>
                  </Pressable>
                  <Pressable onPress={() => handleDelete(activity.id, activity.name)}>
                    <Text style={styles.linkDanger}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </Card>

        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Data</Text>
          <Text style={styles.subText}>Export a JSON snapshot of your activity history.</Text>
          <Button title="Export JSON" variant="secondary" onPress={handleExport} />
          <Button
            title="Import JSON (coming soon)"
            variant="ghost"
            onPress={() => undefined}
            disabled
          />
        </Card>

        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Future Sync</Text>
          <Text style={styles.subText}>
            Google sync is coming later. Your data stays local for now.
          </Text>
          <View style={styles.syncRow}>
            <Text style={styles.syncLabel}>Enable Google sync</Text>
            <Switch value={false} disabled trackColor={{ false: colors.border, true: colors.primary }} />
          </View>
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
  sectionCard: {
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.lg,
    color: colors.text,
  },
  subText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.muted,
  },
  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  activityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityTitle: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.md,
    color: colors.text,
  },
  activityActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  link: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.primary,
  },
  linkDanger: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.danger,
  },
  emptyText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.muted,
  },
  syncRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  syncLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.md,
    color: colors.text,
  },
});
