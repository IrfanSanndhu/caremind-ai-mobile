import { cn } from '@/utils/cn';
import { Image } from 'expo-image';
import { Text, View } from 'react-native';

type AvatarSize = 'sm' | 'md' | 'lg';

const sizeStyles: Record<AvatarSize, { container: string; text: string; dimension: number }> = {
  sm: { container: 'h-8 w-8', text: 'text-xs', dimension: 32 },
  md: { container: 'h-10 w-10', text: 'text-sm', dimension: 40 },
  lg: { container: 'h-14 w-14', text: 'text-lg', dimension: 56 },
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export interface AvatarProps {
  name?: string;
  source?: string | null;
  size?: AvatarSize;
  className?: string;
}

export function Avatar({ name = '', source, size = 'md', className }: AvatarProps) {
  const styles = sizeStyles[size];
  const initials = getInitials(name);

  if (source) {
    return (
      <Image
        source={{ uri: source }}
        accessibilityLabel={name || 'Avatar'}
        className={cn('rounded-full bg-surface', styles.container, className)}
        style={{ width: styles.dimension, height: styles.dimension }}
        contentFit="cover"
      />
    );
  }

  return (
    <View
      className={cn(
        'items-center justify-center rounded-full border border-primary/15 bg-primary-50',
        styles.container,
        className,
      )}
    >
      <Text className={cn('font-inter-semibold text-primary-700', styles.text)}>
        {initials}
      </Text>
    </View>
  );
}
