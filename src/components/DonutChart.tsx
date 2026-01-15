import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { G } from 'react-native-svg';
import { Slice, VictoryContainer, VictoryLabel, VictoryPie } from 'victory-native';
import { colors, typography } from '../theme';

export type DonutDatum = {
  x: string;
  y: number;
  color: string;
};

type Props = {
  data: DonutDatum[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
};

export const DonutChart: React.FC<Props> = ({
  data,
  size = 160,
  thickness = 22,
  centerLabel,
}) => {
  const cleaned = data.length === 0 ? [{ x: 'empty', y: 1, color: colors.ringTrack }] : data;
  return (
    <View style={styles.container}>
      <VictoryPie
        data={cleaned}
        width={size}
        height={size}
        innerRadius={size / 2 - thickness}
        padAngle={2}
        labels={() => null}
        colorScale={cleaned.map((item) => item.color)}
        dataComponent={<Slice />}
        labelComponent={<VictoryLabel />}
        containerComponent={<VictoryContainer />}
        groupComponent={<G />}
      />
      {centerLabel ? <Text style={styles.centerLabel}>{centerLabel}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel: {
    position: 'absolute',
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.lg,
    color: colors.text,
  },
});
