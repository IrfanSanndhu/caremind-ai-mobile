import { colors } from '@/constants/colors';
import { cn } from '@/utils/cn';
import { Check, ChevronDown } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { BottomSheet } from './BottomSheet';

export interface SelectOption<T extends string = string> {
  label: string;
  value: T;
  description?: string;
  disabled?: boolean;
}

export interface SelectProps<T extends string = string> {
  label?: string;
  placeholder?: string;
  value?: T | null;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  error?: string;
  hint?: string;
  disabled?: boolean;
  sheetTitle?: string;
  className?: string;
}

export function Select<T extends string = string>({
  label,
  placeholder = 'Select an option',
  value,
  options,
  onChange,
  error,
  hint,
  disabled = false,
  sheetTitle,
  className,
}: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const hasError = Boolean(error);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  );

  const handleSelect = useCallback(
    (option: SelectOption<T>) => {
      if (option.disabled) return;
      onChange(option.value);
      setOpen(false);
    },
    [onChange],
  );

  return (
    <View className={cn('w-full', className)}>
      {label ? (
        <Text className="mb-1.5 text-sm font-inter-medium text-slate-900">{label}</Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={() => setOpen(true)}
        className={cn(
          'h-11 flex-row items-center justify-between rounded-button border bg-white px-3',
          hasError ? 'border-danger' : 'border-border',
          disabled && 'bg-surface opacity-70',
        )}
      >
        <Text
          className={cn(
            'flex-1 text-base',
            selectedOption ? 'text-slate-900' : 'text-slate-400',
          )}
          numberOfLines={1}
        >
          {selectedOption?.label ?? placeholder}
        </Text>
        <ChevronDown size={18} color={colors.slate400} />
      </Pressable>

      {error ? (
        <Text className="mt-1.5 text-xs text-danger">{error}</Text>
      ) : hint ? (
        <Text className="mt-1.5 text-xs text-muted">{hint}</Text>
      ) : null}

      <BottomSheet
        visible={open}
        onClose={() => setOpen(false)}
        title={sheetTitle ?? label ?? 'Select'}
        contentClassName="px-0 pt-2"
      >
        <View className="pb-2">
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                disabled={option.disabled}
                onPress={() => handleSelect(option)}
                className={cn(
                  'flex-row items-center border-b border-border px-5 py-3.5',
                  option.disabled && 'opacity-40',
                  isSelected && 'bg-primary-50/60',
                )}
              >
                <View className="flex-1 pr-3">
                  <Text
                    className={cn(
                      'text-base',
                      isSelected ? 'font-inter-semibold text-primary-700' : 'text-slate-900',
                    )}
                  >
                    {option.label}
                  </Text>
                  {option.description ? (
                    <Text className="mt-0.5 text-xs text-muted">{option.description}</Text>
                  ) : null}
                </View>
                {isSelected ? <Check size={18} color={colors.primary.DEFAULT} /> : null}
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>
    </View>
  );
}
