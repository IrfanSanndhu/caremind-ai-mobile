import { colors } from '@/constants/colors';
import { cn } from '@/utils/cn';
import { useState } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';

export interface TextareaProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  minHeight?: number;
  containerClassName?: string;
  inputClassName?: string;
  className?: string;
}

export function Textarea({
  label,
  error,
  hint,
  minHeight = 120,
  containerClassName,
  inputClassName,
  className,
  editable = true,
  style,
  onFocus,
  onBlur,
  ...props
}: TextareaProps) {
  const [isFocused, setIsFocused] = useState(false);
  const hasError = Boolean(error);

  return (
    <View className={cn('w-full', containerClassName)}>
      {label ? (
        <Text className="mb-1.5 text-sm font-inter-medium text-slate-900">{label}</Text>
      ) : null}

      <View
        className={cn(
          'rounded-button border bg-white px-3 py-3',
          hasError
            ? 'border-danger'
            : isFocused
              ? 'border-primary'
              : 'border-border',
          !editable && 'bg-surface opacity-70',
        )}
        style={{ minHeight }}
      >
        <TextInput
          multiline
          textAlignVertical="top"
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
          style={[{ minHeight: Math.max(minHeight - 24, 20), color: colors.slate900 }, style]}
          {...props}
        />
      </View>

      {error ? (
        <Text className="mt-1.5 text-xs text-danger">{error}</Text>
      ) : hint ? (
        <Text className="mt-1.5 text-xs text-muted">{hint}</Text>
      ) : null}
    </View>
  );
}
