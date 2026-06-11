import { colors } from '@/constants/colors';
import { cn } from '@/utils/cn';
import { type LucideIcon } from 'lucide-react-native';
import { type ReactNode } from 'react';
import { Text, View } from 'react-native';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <View className={cn('items-center justify-center px-6 py-10', className)}>
      {Icon ? (
        <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-primary-50">
          <Icon size={28} color={colors.primary.DEFAULT} strokeWidth={1.75} />
        </View>
      ) : null}

      <Text className="text-center text-lg font-inter-semibold text-slate-900">{title}</Text>

      {description ? (
        <Text className="mt-2 max-w-xs text-center text-sm leading-5 text-muted">
          {description}
        </Text>
      ) : null}

      {action ? <View className="mt-5 w-full max-w-xs">{action}</View> : null}
    </View>
  );
}
