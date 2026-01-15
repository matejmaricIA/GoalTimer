import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../theme';

export const ColorDot: React.FC<{ color?: string | null; size?: number }> = ({
  color,
  size = 10,
}) => (
  <View
    style={[
      styles.dot,
      {
        backgroundColor: color || colors.primary,
        width: size,
        height: size,
        borderRadius: size / 2,
      },
    ]}
  />
);

const styles = StyleSheet.create({
  dot: {
    marginRight: 8,
  },
});
