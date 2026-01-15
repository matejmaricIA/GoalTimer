import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { ColorDot } from '../components/ColorDot';
import { useAppStore } from '../stores/AppStore';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing, typography } from '../theme';

const palette = ['#2A9D8F', '#E76F51', '#264653', '#E9C46A', '#457B9D', '#9A6B4A'];

export const ActivityFormScreen: React.FC = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'ActivityForm'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { activities, createActivity, updateActivity } = useAppStore();

  const activity = useMemo(
    () => activities.find((item) => item.id === route.params?.activityId),
    [activities, route.params?.activityId],
  );

  const [name, setName] = useState(activity?.name ?? '');
  const [color, setColor] = useState(activity?.color ?? palette[0]);
  const [defaultGoal, setDefaultGoal] = useState(
    activity?.defaultGoalMinutes?.toString() ?? '',
  );

  const handleSave = async () => {
    const goalMinutes = defaultGoal ? Number(defaultGoal) : null;
    if (activity) {
      await updateActivity(activity.id, {
        name,
        color,
        defaultGoalMinutes: goalMinutes ?? null,
      });
    } else {
      await createActivity({ name, color, defaultGoalMinutes: goalMinutes ?? null });
    }
    navigation.goBack();
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card>
          <TextField
            label="Activity name"
            value={name}
            onChangeText={setName}
            placeholder="e.g., Thesis"
          />

          <Text style={styles.label}>Color</Text>
          <View style={styles.colorRow}>
            {palette.map((swatch) => (
              <Pressable key={swatch} onPress={() => setColor(swatch)} style={styles.colorOption}>
                <ColorDot color={swatch} size={16} />
                {color === swatch ? <View style={styles.selectedRing} /> : null}
              </Pressable>
            ))}
          </View>

          <TextField
            label="Default daily goal (minutes)"
            value={defaultGoal}
            onChangeText={(value) => setDefaultGoal(value.replace(/[^0-9]/g, ''))}
            placeholder="60"
            keyboardType="numeric"
          />

          <Button
            title={activity ? 'Save changes' : 'Create activity'}
            onPress={handleSave}
            disabled={!name.trim()}
          />
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
  label: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.muted,
    marginBottom: spacing.xs,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  colorOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundAlt,
  },
  selectedRing: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primaryDark,
  },
});
