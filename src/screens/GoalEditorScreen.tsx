import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { useAppStore } from '../stores/AppStore';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing, typography } from '../theme';

export const GoalEditorScreen: React.FC = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'GoalEditor'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { activityId, date } = route.params;
  const { activities, goals, setGoal } = useAppStore();

  const activity = useMemo(
    () => activities.find((item) => item.id === activityId),
    [activities, activityId],
  );
  const existingGoal = goals.find((goal) => goal.activityId === activityId && goal.date === date);

  const [minutes, setMinutes] = useState(existingGoal?.goalMinutes.toString() ?? '');

  const handleSave = async () => {
    const value = minutes ? Number(minutes) : 0;
    await setGoal(activityId, date, value);
    navigation.goBack();
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card>
          <Text style={styles.title}>{activity?.name ?? 'Activity'} • {date}</Text>
          <TextField
            label="Daily goal (minutes)"
            value={minutes}
            onChangeText={(value) => setMinutes(value.replace(/[^0-9]/g, ''))}
            placeholder="60"
            keyboardType="numeric"
            helper="Set to 0 to remove the goal for this day."
          />
          <Button title="Save goal" onPress={handleSave} />
        </Card>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.lg,
    color: colors.text,
    marginBottom: spacing.sm,
  },
});
