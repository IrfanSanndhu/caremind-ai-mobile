import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { GripHorizontal } from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { cn } from '@/utils/cn';

const PIP_MARGIN = 12;
const BOTTOM_SAFE = 128;
const PIP_WIDTH = 140;

interface ConsultationDraggablePipProps {
  children: ReactNode;
  className?: string;
}

export function ConsultationDraggablePip({ children, className }: ConsultationDraggablePipProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const pipHeight = PIP_WIDTH * (4 / 3);

  const translateX = useSharedValue(screenWidth - PIP_WIDTH - PIP_MARGIN);
  const translateY = useSharedValue(screenHeight - pipHeight - BOTTOM_SAFE);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const [dragging, setDragging] = useState(false);

  const clampPosition = useCallback(
    (x: number, y: number) => ({
      x: Math.min(Math.max(PIP_MARGIN, x), screenWidth - PIP_WIDTH - PIP_MARGIN),
      y: Math.min(Math.max(PIP_MARGIN, y), screenHeight - pipHeight - PIP_MARGIN),
    }),
    [screenWidth, screenHeight, pipHeight],
  );

  useEffect(() => {
    const pos = clampPosition(
      screenWidth - PIP_WIDTH - PIP_MARGIN,
      screenHeight - pipHeight - BOTTOM_SAFE,
    );
    translateX.value = pos.x;
    translateY.value = pos.y;
  }, [screenWidth, screenHeight, pipHeight, clampPosition, translateX, translateY]);

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
    })
    .onStart(() => {
      setDragging(true);
    })
    .onUpdate((event) => {
      const next = clampPosition(
        startX.value + event.translationX,
        startY.value + event.translationY,
      );
      translateX.value = next.x;
      translateY.value = next.y;
    })
    .onEnd(() => {
      setDragging(false);
    })
    .onFinalize(() => {
      setDragging(false);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
  }));

  return (
    <View className="absolute inset-0" pointerEvents="box-none">
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            animatedStyle,
            {
              position: 'absolute',
              width: PIP_WIDTH,
              height: pipHeight,
            },
          ]}
          className={cn(
            'overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl',
            dragging && 'scale-[1.02] border-white/20',
            className,
          )}
        >
          <View className="absolute inset-x-0 top-0 z-10 items-center bg-black/40 py-0.5">
            <GripHorizontal size={18} color={colors.slate400} />
          </View>
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
