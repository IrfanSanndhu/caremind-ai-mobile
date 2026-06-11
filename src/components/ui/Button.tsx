import { colors } from '@/constants/colors';
import { cn } from '@/utils/cn';
import * as Haptics from 'expo-haptics';
import { type ReactNode } from 'react';
import { Pressable, Text, type PressableProps } from 'react-native';
import { Spinner } from './Spinner';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

const variantStyles: Record<ButtonVariant, { container: string; text: string; spinner: string }> = {
  primary: {
    container: 'bg-primary border border-primary',
    text: 'text-white font-inter-semibold',
    spinner: colors.white,
  },
  secondary: {
    container: 'bg-secondary border border-secondary',
    text: 'text-white font-inter-semibold',
    spinner: colors.white,
  },
  outline: {
    container: 'bg-white border border-border',
    text: 'text-slate-900 font-inter-semibold',
    spinner: colors.primary.DEFAULT,
  },
  ghost: {
    container: 'bg-transparent border border-transparent',
    text: 'text-primary font-inter-semibold',
    spinner: colors.primary.DEFAULT,
  },
  danger: {
    container: 'bg-danger border border-danger',
    text: 'text-white font-inter-semibold',
    spinner: colors.white,
  },
};

const sizeStyles: Record<ButtonSize, { container: string; text: string }> = {
  sm: { container: 'px-3 min-h-[36px]', text: 'text-sm' },
  md: { container: 'px-4 min-h-[44px]', text: 'text-base' },
  lg: { container: 'px-6 min-h-[52px]', text: 'text-md' },
};

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  className?: string;
  textClassName?: string;
  haptic?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  className,
  textClassName,
  haptic = true,
  disabled,
  onPress,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const styles = variantStyles[variant];
  const sizes = sizeStyles[size];

  const handlePress: PressableProps['onPress'] = (event) => {
    if (isDisabled) return;
    if (haptic) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.(event);
  };

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={handlePress}
      className={cn(
        'flex-row items-center justify-center rounded-button active:opacity-90',
        sizes.container,
        styles.container,
        isDisabled && 'opacity-50',
        className,
      )}
      {...props}
    >
      {loading ? (
        <Spinner size={size === 'lg' ? 'md' : 'sm'} color={styles.spinner} />
      ) : (
        <>
          {leftIcon}
          <Text
            className={cn(
              styles.text,
              sizes.text,
              leftIcon ? 'ml-2' : undefined,
              rightIcon ? 'mr-2' : undefined,
              textClassName,
            )}
          >
            {children}
          </Text>
          {rightIcon}
        </>
      )}
    </Pressable>
  );
}
