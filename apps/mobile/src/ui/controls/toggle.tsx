import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { shadow } from '@/theme/elevation';
import { colors } from '@/theme/colors';
import { easeOut } from '@/ui/motion/easing';
import { haptic } from '@/ui/motion/haptics';

const TRACK_W = 52;
const TRACK_H = 32;
const THUMB = 26;
const INSET = (TRACK_H - THUMB) / 2;
const TRAVEL = TRACK_W - THUMB - INSET * 2;

/**
 * Interrupteur du projet. Le `Switch` de Tamagui 3 se dessine en simple trait sous Android (taille non résolue) :
 * piste et pastille sont dessinées ici, avec une zone tactile de 44 px.
 */
export function Toggle({
  value,
  onChange,
  disabled,
  label,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  const on = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    on.value = withTiming(value ? 1 : 0, { duration: 180, easing: easeOut });
  }, [value, on]);

  const track = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(on.value, [0, 1], [colors.borderControl, colors.primary]),
  }));
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: on.value * TRAVEL }] }));

  return (
    <Pressable
      onPress={() => {
        haptic.select();
        onChange(!value);
      }}
      disabled={disabled}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={label}
      style={{ opacity: disabled ? 0.45 : 1 }}
    >
      <Animated.View style={[styles.track, track]}>
        <Animated.View style={[styles.thumb, thumb]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { width: TRACK_W, height: TRACK_H, borderRadius: TRACK_H / 2, padding: INSET },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: colors.surface,
    boxShadow: shadow.sm,
  },
});
