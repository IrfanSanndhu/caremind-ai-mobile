export function slotDateKey(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));
}

export function formatSlotTime(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
  });
}

export function formatSlotDateLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function groupSlotsByDate(slots: string[], timeZone: string): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const slot of slots) {
    const key = slotDateKey(slot, timeZone);
    const list = map.get(key) ?? [];
    list.push(slot);
    map.set(key, list);
  }
  for (const [, list] of map) {
    list.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  }
  return map;
}
