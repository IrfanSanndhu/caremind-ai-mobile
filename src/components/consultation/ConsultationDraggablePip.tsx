import {
  type ReactNode,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  PanResponder,
  Pressable,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { SwitchCamera } from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { cn } from '@/utils/cn';

const PIP_MARGIN = 12;
export const PIP_WIDTH = 104;
export const PIP_HEIGHT = PIP_WIDTH * (4 / 3);

interface ConsultationDraggablePipProps {
  children: ReactNode;
  className?: string;
  showSwitchCamera?: boolean;
  onSwitchCamera?: () => void;
}

export function ConsultationDraggablePip({
  children,
  className,
  showSwitchCamera = false,
  onSwitchCamera,
}: ConsultationDraggablePipProps) {
  const boundsSize = useRef({ width: 0, height: 0 });
  const dragOrigin = useRef({ x: 0, y: 0 });
  const movedRef = useRef(false);

  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const positionRef = useRef(position);
  positionRef.current = position;

  const clampPosition = useCallback(
    (x: number, y: number) => {
      const { width, height } = boundsSize.current;
      if (!width || !height) return { x, y };
      return {
        x: Math.min(Math.max(PIP_MARGIN, x), width - PIP_WIDTH - PIP_MARGIN),
        y: Math.min(Math.max(PIP_MARGIN, y), height - PIP_HEIGHT - PIP_MARGIN),
      };
    },
    [],
  );

  const placeDefault = useCallback(() => {
    const { width, height } = boundsSize.current;
    if (!width || !height) return;
    setPosition(
      clampPosition(width - PIP_WIDTH - PIP_MARGIN, height - PIP_HEIGHT - PIP_MARGIN),
    );
  }, [clampPosition]);

  const onBoundsLayout = useCallback(
    (event: LayoutChangeEvent) => {
      boundsSize.current = {
        width: event.nativeEvent.layout.width,
        height: event.nativeEvent.layout.height,
      };
      if (position === null) {
        placeDefault();
      }
    },
    [placeDefault, position],
  );

  useLayoutEffect(() => {
    if (position !== null) return;
    placeDefault();
  }, [placeDefault, position]);

  const clampRef = useRef(clampPosition);
  clampRef.current = clampPosition;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 2 || Math.abs(gesture.dy) > 2,
        onPanResponderGrant: () => {
          dragOrigin.current = positionRef.current ?? { x: PIP_MARGIN, y: PIP_MARGIN };
          movedRef.current = false;
          setDragging(true);
        },
        onPanResponderMove: (_, gesture) => {
          if (Math.abs(gesture.dx) > 2 || Math.abs(gesture.dy) > 2) {
            movedRef.current = true;
          }
          setPosition(
            clampRef.current(
              dragOrigin.current.x + gesture.dx,
              dragOrigin.current.y + gesture.dy,
            ),
          );
        },
        onPanResponderRelease: () => setDragging(false),
        onPanResponderTerminate: () => setDragging(false),
      }),
    [],
  );

  return (
    <View
      className="absolute inset-0"
      pointerEvents="box-none"
      onLayout={onBoundsLayout}
      collapsable={false}
    >
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          left: position?.x ?? PIP_MARGIN,
          top: position?.y ?? PIP_MARGIN,
          width: PIP_WIDTH,
          height: PIP_HEIGHT,
          zIndex: 50,
          elevation: 50,
        }}
        className={cn(
          'overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl',
          dragging && 'border-white/20',
          className,
        )}
        collapsable={false}
      >
        {/* Video must not receive touches — RTCView/SurfaceView crashes on Android */}
        <View
          style={{ width: PIP_WIDTH, height: PIP_HEIGHT }}
          pointerEvents="none"
          collapsable={false}
        >
          {children}
        </View>

        {/* Transparent drag layer over the whole tile — move by touching anywhere */}
        <View
          {...panResponder.panHandlers}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          collapsable={false}
        />

        {/* Switch camera control, above the drag layer so it stays tappable */}
        {showSwitchCamera ? (
          <Pressable
            onPress={() => {
              if (!movedRef.current) onSwitchCamera?.();
            }}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Switch camera"
            style={{ position: 'absolute', top: 5, right: 5, zIndex: 30, elevation: 30 }}
            className="h-7 w-7 items-center justify-center rounded-full border border-white/40 bg-black/65 active:bg-primary"
          >
            <SwitchCamera size={15} color={colors.white} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
