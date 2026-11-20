import { Easing, LinearTransition } from 'react-native-reanimated';

export const easeOut = Easing.out(Easing.cubic);

export const layoutEase = LinearTransition.duration(200).easing(easeOut);
