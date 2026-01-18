import React, { useCallback, useMemo, useState } from 'react';
import { LayoutChangeEvent, PanResponder, StyleSheet, View } from 'react-native';
import { colors } from '../theme';

type Props = {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const DurationSlider: React.FC<Props> = ({ value, min, max, step = 1, onChange }) => {
  const [trackWidth, setTrackWidth] = useState(0);
  const range = max - min || 1;
  const percent = clamp((value - min) / range, 0, 1);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  }, []);

  const updateValue = useCallback(
    (locationX: number) => {
      if (trackWidth <= 0) {
        return;
      }
      const boundedX = clamp(locationX, 0, trackWidth);
      const raw = min + (boundedX / trackWidth) * range;
      const snapped =
        step > 0
          ? Math.round((raw - min) / step) * step + min
          : raw;
      const nextValue = clamp(Math.round(snapped), min, max);
      if (nextValue !== value) {
        onChange(nextValue);
      }
    },
    [max, min, onChange, range, step, trackWidth, value],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => updateValue(event.nativeEvent.locationX),
        onPanResponderMove: (event) => updateValue(event.nativeEvent.locationX),
      }),
    [updateValue],
  );

  const fillWidth = trackWidth * percent;
  const thumbX = Math.max(0, Math.min(trackWidth - THUMB_SIZE, fillWidth - THUMB_SIZE / 2));

  return (
    <View style={styles.container} onLayout={handleLayout} {...panResponder.panHandlers}>
      <View style={styles.track} />
      <View style={[styles.fill, { width: fillWidth }]} />
      <View style={[styles.thumb, { left: thumbX }]} />
    </View>
  );
};

const TRACK_HEIGHT = 8;
const SLIDER_HEIGHT = 28;
const THUMB_SIZE = 20;

const styles = StyleSheet.create({
  container: {
    height: SLIDER_HEIGHT,
    justifyContent: 'center',
  },
  track: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: TRACK_HEIGHT,
    borderRadius: 999,
    backgroundColor: colors.ringTrack,
    top: (SLIDER_HEIGHT - TRACK_HEIGHT) / 2,
  },
  fill: {
    position: 'absolute',
    left: 0,
    height: TRACK_HEIGHT,
    borderRadius: 999,
    backgroundColor: colors.primary,
    top: (SLIDER_HEIGHT - TRACK_HEIGHT) / 2,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.primaryDark,
    top: (SLIDER_HEIGHT - THUMB_SIZE) / 2,
    shadowColor: colors.shadow,
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
});
