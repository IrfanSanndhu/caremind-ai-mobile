import { colors } from '@/constants/colors';
import { cn } from '@/utils/cn';
import { type ReactNode, useState } from 'react';
import {
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  trailingIcon?: ReactNode;
  containerClassName?: string;
  inputClassName?: string;
  className?: string;
}

export function Input({
  label,
  error,
  hint,
  trailingIcon,
  containerClassName,
  inputClassName,
  className,
  editable = true,
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const hasError = Boolean(error);

  return (
    <View className={cn('w-full', containerClassName)}>
      {label ? (
        <Text className="mb-1.5 text-sm font-inter-medium text-slate-900">{label}</Text>
      ) : null}

      <View
        className={cn(
          'h-11 flex-row items-center rounded-button border bg-white px-3',
          hasError
            ? 'border-danger'
            : isFocused
              ? 'border-primary'
              : 'border-border',
          !editable && 'bg-surface opacity-70',
        )}
      >
        <TextInput
          editable={editable}
          placeholderTextColor={colors.slate400}
          onFocus={(event) => {
            setIsFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setIsFocused(false);
            onBlur?.(event);
          }}
          className={cn(
            'flex-1 text-base text-slate-900 font-sans',
            inputClassName,
            className,
          )}
          {...props}
        />
        {trailingIcon ? <View className="ml-2">{trailingIcon}</View> : null}
      </View>

      {error ? (
        <Text className="mt-1.5 text-xs text-danger">{error}</Text>
      ) : hint ? (
        <Text className="mt-1.5 text-xs text-muted">{hint}</Text>
      ) : null}
    </View>
  );
}
