import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography } from '../theme';
import { TabParamList, RootStackParamList } from './types';
import { TodayScreen } from '../screens/TodayScreen';
import { CalendarScreen } from '../screens/CalendarScreen';
import { StatsScreen } from '../screens/StatsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ActivityDetailsScreen } from '../screens/ActivityDetailsScreen';
import { ActivityFormScreen } from '../screens/ActivityFormScreen';
import { NoteEditorScreen } from '../screens/NoteEditorScreen';
import { GoalEditorScreen } from '../screens/GoalEditorScreen';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const Tabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarStyle: {
        backgroundColor: colors.card,
        borderTopColor: colors.border,
        height: 64,
      },
      tabBarLabelStyle: {
        fontFamily: typography.fontFamily.medium,
        fontSize: 12,
      },
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.muted,
      tabBarIcon: ({ color, size }) => {
        const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
          Today: 'time-outline',
          Calendar: 'calendar-outline',
          Stats: 'stats-chart-outline',
          Settings: 'settings-outline',
        };
        const name = iconMap[route.name] ?? 'ellipse-outline';
        return <Ionicons name={name} size={size} color={color} />;
      },
    })}
  >
    <Tab.Screen name="Today" component={TodayScreen} />
    <Tab.Screen name="Calendar" component={CalendarScreen} />
    <Tab.Screen name="Stats" component={StatsScreen} />
    <Tab.Screen name="Settings" component={SettingsScreen} />
  </Tab.Navigator>
);

export const AppNavigator = () => (
  <NavigationContainer>
    <Stack.Navigator>
      <Stack.Screen name="RootTabs" component={Tabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="ActivityDetails"
        component={ActivityDetailsScreen}
        options={{ title: 'Activity' }}
      />
      <Stack.Screen
        name="ActivityForm"
        component={ActivityFormScreen}
        options={{ presentation: 'modal', title: 'Activity' }}
      />
      <Stack.Screen
        name="GoalEditor"
        component={GoalEditorScreen}
        options={{ presentation: 'modal', title: 'Set Goal' }}
      />
      <Stack.Screen
        name="NoteEditor"
        component={NoteEditorScreen}
        options={{ presentation: 'modal', title: 'Daily Note' }}
      />
    </Stack.Navigator>
  </NavigationContainer>
);
