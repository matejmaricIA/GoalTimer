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

export const NoteEditorScreen: React.FC = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'NoteEditor'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { activityId, date } = route.params;
  const { activities, notes, upsertNote, deleteNote } = useAppStore();

  const activity = useMemo(
    () => activities.find((item) => item.id === activityId),
    [activities, activityId],
  );
  const existingNote = notes.find((note) => note.activityId === activityId && note.date === date);

  const [text, setText] = useState(existingNote?.text ?? '');

  const handleSave = async () => {
    if (text.trim().length === 0) {
      if (existingNote) {
        await deleteNote(activityId, date);
      }
    } else {
      await upsertNote(activityId, date, text.trim());
    }
    navigation.goBack();
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card>
          <Text style={styles.title}>{activity?.name ?? 'Activity'} • {date}</Text>
          <TextField
            label="What did you do today?"
            value={text}
            onChangeText={setText}
            placeholder="Progress notes"
            multiline
          />
          <Button title="Save note" onPress={handleSave} />
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
