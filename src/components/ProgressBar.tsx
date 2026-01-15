import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../theme';

export const ProgressBar: React.FC<{ progress: number }> = ({ progress }) => {
  const width = `${Math.min(100, Math.max(0, progress * 100))}%` as `${number}%`;
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.ringTrack,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
});
