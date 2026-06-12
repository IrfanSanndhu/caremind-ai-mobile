import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { Input } from '@/components/ui/Input';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { colors } from '@/constants/colors';
import {
  filterTimezoneOptions,
  findTimezoneOption,
  type TimezoneOption,
} from '@/utils/timezone-options';
import { cn } from '@/utils/cn';

interface TimezoneSelectProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  helperText?: string;
  disabled?: boolean;
}

export function TimezoneSelect({
  value,
  onChange,
  label = 'Timezone',
  helperText = 'Used for appointment times in emails and notifications.',
  disabled = false,
}: TimezoneSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = useMemo(
    () => findTimezoneOption(value) ?? { value, label: value, offsetHours: 0, keywords: '' },
    [value],
  );

  const filtered = useMemo(() => {
    const list = filterTimezoneOptions(query);
    if (value && !list.some((o) => o.value === value)) {
      return [selected, ...list];
    }
    return list;
  }, [query, selected, value]);

  const pick = (option: TimezoneOption) => {
    onChange(option.value);
    setOpen(false);
    setQuery('');
  };

  return (
    <View>
      {label ? (
        <Text className="mb-1.5 text-sm font-inter-medium text-slate-700">{label}</Text>
      ) : null}
      <Pressable
        disabled={disabled}
        onPress={() => setOpen(true)}
        className={cn(
          'rounded-xl border border-border bg-white px-4 py-3 active:bg-surface',
          disabled && 'opacity-50',
        )}
      >
        <Text className="text-sm text-slate-900" numberOfLines={2}>
          {selected.label}
        </Text>
      </Pressable>
      {helperText ? <Text className="mt-1.5 text-xs text-muted">{helperText}</Text> : null}

      <BottomSheet
        visible={open}
        onClose={() => {
          setOpen(false);
          setQuery('');
        }}
        title="Select timezone"
        subtitle="Search by city or UTC offset"
      >
        <Input
          placeholder="Search timezones…"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          className="mb-3"
        />
        <ScrollView style={{ maxHeight: 360 }} keyboardShouldPersistTaps="handled">
          {filtered.map((option) => {
            const isSelected = option.value === value;
            return (
              <Pressable
                key={option.value}
                onPress={() => pick(option)}
                className="flex-row items-center gap-3 border-b border-border py-3 active:bg-surface"
              >
                <View className="min-w-0 flex-1">
                  <Text
                    className={cn(
                      'text-sm',
                      isSelected ? 'font-inter-semibold text-primary' : 'text-slate-800',
                    )}
                    numberOfLines={2}
                  >
                    {option.label}
                  </Text>
                </View>
                {isSelected ? <Check size={18} color={colors.primary.DEFAULT} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </BottomSheet>
    </View>
  );
}
