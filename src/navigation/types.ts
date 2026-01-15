export type RootStackParamList = {
  RootTabs: undefined;
  ActivityDetails: { activityId: string };
  ActivityForm: { activityId?: string } | undefined;
  NoteEditor: { activityId: string; date: string };
  GoalEditor: { activityId: string; date: string };
};

export type TabParamList = {
  Today: undefined;
  Calendar: undefined;
  Stats: undefined;
  Settings: undefined;
};
