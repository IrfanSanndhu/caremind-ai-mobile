import { useCallback } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Card, Skeleton } from '@/components/ui';
import { OutputCard } from '@/components/ai-outputs/OutputCard';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { SCROLL_BOTTOM_INSET } from '@/components/layout/TabBar';
import { aiOutputsApi, aiOutputKeys } from '@/api/aiOutputs.api';

export default function AiOutputDetailScreen() {
  const { appointmentId } = useLocalSearchParams<{ appointmentId: string }>();
  const apptId = appointmentId ?? '';

  const { data: outputs, isLoading, refetch } = useQuery({
    queryKey: aiOutputKeys.byAppointment(apptId),
    queryFn: () => aiOutputsApi.getByAppointment(apptId),
    enabled: !!apptId,
    retry: 1,
    refetchInterval: (query) => ((query.state.data?.length ?? 0) === 0 ? 5000 : false),
  });

  const onRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isLoading) {
    return (
      <View className="flex-1 bg-surface">
        <ScreenHeader title="AI Outputs" />
        <View className="gap-4 p-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <Skeleton className="mb-4 h-6 w-48" />
              <Skeleton className="h-32 w-full" />
            </Card>
          ))}
        </View>
      </View>
    );
  }

  const sortedOutputs = [...(outputs ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <View className="flex-1 bg-surface">
      <ScreenHeader
        title="Review Outputs"
        subtitle={`${sortedOutputs.length} output(s) for this appointment`}
        fallbackHref="/(app)/ai-outputs"
      />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: SCROLL_BOTTOM_INSET,
        }}
        showsVerticalScrollIndicator={false}
      >
        {sortedOutputs.length === 0 ? (
          <Card>
            <View className="items-center py-10">
              <Text className="text-center text-muted">No AI outputs generated for this appointment yet.</Text>
              <Text className="mt-1 text-center text-sm text-muted">
                Outputs are created after the consultation transcript is saved.
              </Text>
            </View>
          </Card>
        ) : (
          sortedOutputs.map((output) => (
            <OutputCard key={output.id} output={output} onRefresh={onRefresh} />
          ))
        )}
      </ScrollView>
    </View>
  );
}
