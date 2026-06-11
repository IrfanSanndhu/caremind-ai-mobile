import { colors } from '@/constants/colors';
import { cn } from '@/utils/cn';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

type SpinnerSize = 'sm' | 'md' | 'lg';

const sizeMap: Record<SpinnerSize, number> = {
  sm: 16,
  md: 20,
  lg: 28,
};

const borderWidthMap: Record<SpinnerSize, number> = {
  sm: 2,
  md: 2.5,
  lg: 3,
};

export interface SpinnerProps {
  size?: SpinnerSize;
  color?: string;
  className?: string;
}

export function Spinner({ size = 'md', color = colors.primary.DEFAULT, className }: SpinnerProps) {
  const rotation = useSharedValue(0);
  const dimension = sizeMap[size];
  const borderWidth = borderWidthMap[size];

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 800, easing: Easing.linear }),
      -1,
      false,
    );
  }, [rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View className={cn('items-center justify-center', className)}>
      <Animated.View
        style={[
          animatedStyle,
          {
            width: dimension,
            height: dimension,
            borderRadius: dimension / 2,
            borderWidth,
            borderColor: `${color}33`,
            borderTopColor: color,
          },
        ]}
      />
    </View>
  );
}
