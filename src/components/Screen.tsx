import React from 'react';
import { SafeAreaView, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme';

export const Screen: React.FC<{ children: React.ReactNode; style?: ViewStyle }> = ({
  children,
  style,
}) => (
  <LinearGradient colors={[colors.background, colors.backgroundAlt]} style={styles.gradient}>
    <SafeAreaView style={[styles.safeArea, style]}>{children}</SafeAreaView>
  </LinearGradient>
);

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
});
