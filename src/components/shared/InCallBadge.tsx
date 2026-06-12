import { Radio } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { colors } from '@/constants/colors';
import type { LiveParticipant } from '@/types';

interface InCallBadgeProps {
  participants?: LiveParticipant[];
  compact?: boolean;
}

export function InCallBadge({ participants = [], compact = false }: InCallBadgeProps) {
  if (participants.length === 0) return null;

  if (compact) {
    const label =
      participants.length === 1
        ? participants[0].name
        : `${participants.length} in call`;
    return (
      <View className="flex-row items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5">
        <Radio size={12} color={colors.success.DEFAULT} />
        <Text className="text-xs font-inter-medium text-emerald-700" numberOfLines={1}>
          {label}
        </Text>
      </View>
    );
  }

  return (
    <View className="gap-1">
      {participants.map((p) => (
        <View key={p.identity} className="flex-row items-center gap-1">
          <Radio size={12} color={colors.success.DEFAULT} />
          <Text className="text-xs font-inter-medium text-emerald-700">
            {p.name}
            {p.role ? (
              <Text className="font-inter text-muted"> ({p.role})</Text>
            ) : null}
          </Text>
        </View>
      ))}
    </View>
  );
}
