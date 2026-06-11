import { ScrollView, Text, View } from 'react-native';
import type { TranscriptSegmentView } from '@/types';
import { Badge } from '@/components/ui';
import { cn } from '@/utils/cn';

export function ConsultationTranscriptPanel({
  content,
  segments,
  isLive,
  variant = 'dark',
}: {
  content: string;
  segments?: TranscriptSegmentView[];
  isLive?: boolean;
  variant?: 'light' | 'dark';
}) {
  const isDark = variant === 'dark';
  const hasSegments = segments && segments.length > 0;

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {isLive ? (
        <View className="mb-3 self-start">
          <Badge variant="danger" pulse>
            Live transcription
          </Badge>
        </View>
      ) : null}

      {hasSegments ? (
        <View className="gap-4">
          {segments!.map((seg, i) => (
            <Text key={`${seg.startSeconds ?? i}-${i}`} className="text-sm leading-5">
              <Text
                className={cn(
                  'font-inter-semibold',
                  seg.speakerRole === 'doctor'
                    ? isDark
                      ? 'text-primary-100'
                      : 'text-primary-700'
                    : isDark
                      ? 'text-emerald-300'
                      : 'text-emerald-700',
                )}
              >
                {seg.speaker}
              </Text>
              <Text className={isDark ? 'text-slate-500' : 'text-muted'}>: </Text>
              <Text className={isDark ? 'text-slate-300' : 'text-slate-700'}>{seg.text}</Text>
            </Text>
          ))}
        </View>
      ) : (
        <Text
          className={cn(
            'text-sm leading-5',
            isDark ? 'text-slate-300' : 'text-slate-700',
          )}
        >
          {content}
        </Text>
      )}

      <Text className={cn('mt-4 text-[11px] leading-4', isDark ? 'text-slate-500' : 'text-muted')}>
        Speaker labels use your microphone as the doctor and the other call participant as the
        patient.
      </Text>
    </ScrollView>
  );
}
