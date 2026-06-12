import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import {
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

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return { year, month: month - 1, day };
}

function toDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function buildMonthCells(year: number, month: number): (string | null)[] {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = Array.from({ length: firstWeekday }, () => null);

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(toDateKey(year, month, day));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

function MonthCalendar({
  year,
  month,
  availableDateSet,
  selectedDate,
  onSelectDate,
}: {
  year: number;
  month: number;
  availableDateSet: Set<string>;
  selectedDate: string | null;
  onSelectDate: (dateKey: string) => void;
}) {
  const monthLabel = new Date(year, month, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
  const cells = buildMonthCells(year, month);
  const todayKey = toDateKey(
    new Date().getFullYear(),
    new Date().getMonth(),
    new Date().getDate(),
  );

  return (
    <View className="mb-5">
      <Text className="mb-3 text-sm font-inter-semibold text-slate-900">{monthLabel}</Text>

      <View className="mb-1 flex-row">
        {WEEKDAY_LABELS.map((label) => (
          <View key={label} className="flex-1 items-center py-1">
            <Text className="text-xs font-inter-medium text-muted">{label}</Text>
          </View>
        ))}
      </View>

      <View className="flex-row flex-wrap">
        {cells.map((dateKey, index) => {
          if (!dateKey) {
            return <View key={`empty-${index}`} className="w-[14.28%] p-0.5" style={{ aspectRatio: 1 }} />;
          }

          const { day } = parseDateKey(dateKey);
          const hasSlots = availableDateSet.has(dateKey);
          const selected = dateKey === selectedDate;
          const isToday = dateKey === todayKey;

          return (
            <View key={dateKey} className="w-[14.28%] p-0.5" style={{ aspectRatio: 1 }}>
              <Pressable
                disabled={!hasSlots}
                onPress={() => onSelectDate(dateKey)}
                className={cn(
                  'h-full items-center justify-center rounded-xl border',
                  selected
                    ? 'border-primary bg-primary'
                    : hasSlots
                      ? 'border-primary/25 bg-primary-50 active:bg-primary-100'
                      : 'border-transparent bg-transparent',
                  isToday && !selected && hasSlots && 'border-primary/40',
                )}
              >
                <Text
                  className={cn(
                    'text-sm font-inter-medium',
                    selected ? 'text-white' : hasSlots ? 'text-slate-900' : 'text-slate-300',
                  )}
                >
                  {day}
                </Text>
                {hasSlots && !selected ? (
                  <View className="mt-0.5 h-1 w-1 rounded-full bg-primary" />
                ) : null}
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
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
  const availableDateSet = useMemo(() => new Set(availableDates), [availableDates]);
  const timesForDate = selectedDate ? (slotsByDate.get(selectedDate) ?? []) : [];

  const monthsToShow = useMemo(() => {
    const seen = new Set<string>();
    const months: { year: number; month: number }[] = [];

    for (const dateKey of availableDates) {
      const { year, month } = parseDateKey(dateKey);
      const key = `${year}-${month}`;
      if (seen.has(key)) continue;
      seen.add(key);
      months.push({ year, month });
    }

    return months;
  }, [availableDates]);

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
        {monthsToShow.map(({ year, month }) => (
          <MonthCalendar
            key={`${year}-${month}`}
            year={year}
            month={month}
            availableDateSet={availableDateSet}
            selectedDate={selectedDate}
            onSelectDate={onSelectDate}
          />
        ))}
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
