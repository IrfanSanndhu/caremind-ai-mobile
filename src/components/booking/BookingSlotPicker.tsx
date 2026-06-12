import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import {
  formatSlotDateLabel,
  formatSlotTime,
  groupSlotsByDate,
} from '@/utils/booking-slots';
import { cn } from '@/utils/cn';

interface BookingSlotPickerProps {
  slots: string[];
  timeZone: string;
  selectedDate: string | null;
  selectedSlot: string | null;
  onSelectDate: (dateKey: string) => void;
  onSelectSlot: (slot: string) => void;
}

export function BookingSlotPicker({
  slots,
  timeZone,
  selectedDate,
  selectedSlot,
  onSelectDate,
  onSelectSlot,
}: BookingSlotPickerProps) {
  const slotsByDate = useMemo(() => groupSlotsByDate(slots, timeZone), [slots, timeZone]);
  const availableDates = useMemo(
    () => Array.from(slotsByDate.keys()).sort(),
    [slotsByDate],
  );
  const timesForDate = selectedDate ? (slotsByDate.get(selectedDate) ?? []) : [];

  if (availableDates.length === 0) {
    return (
      <Text className="py-6 text-center text-sm text-muted">
        No available slots in the booking window.
      </Text>
    );
  }

  return (
    <View className="gap-4">
      <View>
        <Text className="mb-2 text-sm font-inter-medium text-slate-700">Select date</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1">
          <View className="flex-row gap-2 px-1">
            {availableDates.map((dateKey) => {
              const selected = dateKey === selectedDate;
              return (
                <Pressable
                  key={dateKey}
                  onPress={() => onSelectDate(dateKey)}
                  className={cn(
                    'min-w-[88px] items-center rounded-xl border px-3 py-2.5',
                    selected
                      ? 'border-primary bg-primary-50'
                      : 'border-border bg-white active:bg-surface',
                  )}
                >
                  <Text
                    className={cn(
                      'text-xs font-inter-medium',
                      selected ? 'text-primary' : 'text-muted',
                    )}
                  >
                    {formatSlotDateLabel(dateKey)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {selectedDate ? (
        <View>
          <Text className="mb-2 text-sm font-inter-medium text-slate-700">Select time</Text>
          <View className="flex-row flex-wrap gap-2">
            {timesForDate.map((slot) => {
              const selected = slot === selectedSlot;
              return (
                <Pressable
                  key={slot}
                  onPress={() => onSelectSlot(slot)}
                  className={cn(
                    'rounded-lg border px-3 py-2',
                    selected
                      ? 'border-primary bg-primary-50'
                      : 'border-border bg-white active:bg-surface',
                  )}
                >
                  <Text
                    className={cn(
                      'text-sm font-inter-medium',
                      selected ? 'text-primary' : 'text-slate-700',
                    )}
                  >
                    {formatSlotTime(slot, timeZone)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {timeZone ? (
        <Text className="text-xs text-muted">Times shown in {timeZone}</Text>
      ) : null}
    </View>
  );
}
