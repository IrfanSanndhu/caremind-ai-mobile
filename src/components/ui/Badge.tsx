import { View, Text } from 'react-native';
import { cn } from '@/utils/cn';

export type BadgeVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'purple'
  | 'gray';

export interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  pulse?: boolean;
}

const variantColors: Record<BadgeVariant, { bg: string; text: string; pulse: string }> = {
  default: { bg: '#F1F5F9', text: '#334155', pulse: '#64748B' },
  primary: { bg: '#E0F2FE', text: '#0369A1', pulse: '#0EA5E9' },
  secondary: { bg: '#EEF2FF', text: '#4338CA', pulse: '#6366F1' },
  success: { bg: '#D1FAE5', text: '#047857', pulse: '#10B981' },
  warning: { bg: '#FEF3C7', text: '#B45309', pulse: '#F59E0B' },
  danger: { bg: '#FEE2E2', text: '#B91C1C', pulse: '#EF4444' },
  purple: { bg: '#F3E8FF', text: '#7E22CE', pulse: '#A855F7' },
  gray: { bg: '#F1F5F9', text: '#64748B', pulse: '#94A3B8' },
};

export function Badge({ variant = 'default', children, className, pulse = false }: BadgeProps) {
  const colors = variantColors[variant];

  return (
    <View
      className={cn('flex-row items-center gap-1 self-start rounded-full px-2 py-0.5', className)}
      style={{ backgroundColor: colors.bg }}
    >
      {pulse ? (
        <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: colors.pulse }} />
      ) : null}
      <Text
        className="text-xs font-inter-medium"
        style={{ color: colors.text }}
        numberOfLines={1}
      >
        {children}
      </Text>
    </View>
  );
}
