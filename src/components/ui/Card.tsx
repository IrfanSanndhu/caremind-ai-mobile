import { cn } from '@/utils/cn';
import { type ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';

export interface CardProps extends ViewProps {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}

export function Card({ children, className, padded = true, ...props }: CardProps) {
  return (
    <View
      className={cn(
        'rounded-card border border-border bg-white',
        'shadow-sm shadow-black/5',
        padded && 'p-4',
        className,
      )}
      style={[
        {
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 2,
        },
        props.style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}
