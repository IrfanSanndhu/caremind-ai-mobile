import { colors } from '@/constants/colors';
import { cn } from '@/utils/cn';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { View, type ViewProps } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

export interface SkeletonProps extends ViewProps {
  className?: string;
  width?: number | `${number}%`;
  height?: number;
  rounded?: 'sm' | 'md' | 'lg' | 'full' | 'none';
}

const roundedStyles = {
  none: '',
  sm: 'rounded',
  md: 'rounded-md',
  lg: 'rounded-lg',
  full: 'rounded-full',
};

export function Skeleton({
  className,
  width = '100%',
  height = 16,
  rounded = 'md',
  style,
  ...props
}: SkeletonProps) {
  const shimmer = useSharedValue(-1);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.linear }),
      -1,
      false,
    );
  }, [shimmer]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmer.value * 200 }],
  }));

  return (
    <View
      className={cn('overflow-hidden bg-surface', roundedStyles[rounded], className)}
      style={[{ width, height }, style]}
      {...props}
    >
      <Animated.View style={[{ width: '200%', height: '100%' }, shimmerStyle]}>
        <LinearGradient
          colors={[colors.surface, '#EEF2F7', colors.surface]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ flex: 1 }}
        />
      </Animated.View>
    </View>
  );
}
