import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Edit3, History, X } from 'lucide-react-native';
import {
  Button,
  Card,
  Modal,
  Skeleton,
  Textarea,
  useToast,
} from '@/components/ui';
import { MarkdownContent } from '@/components/shared/MarkdownContent';
import { AiOutputStatusBadge } from '@/components/shared/StatusBadge';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { SCROLL_BOTTOM_INSET } from '@/components/layout/TabBar';
import { aiOutputsApi, aiOutputKeys } from '@/api/aiOutputs.api';
import { AiOutputStatus, UserRole, type AiOutput } from '@/types';
import { useAuthStore } from '@/stores/auth.store';
import { getAiOutputTypeLabel } from '@/utils/ai-output-labels';
import { formatDate } from '@/utils/formatDate';
import { colors } from '@/constants/colors';

function OutputCard({ output, onRefresh }: { output: AiOutput; onRefresh: () => void }) {
  const role = useAuthStore((s) => s.role);
  const canReview = role === UserRole.DOCTOR || role === UserRole.ADMIN;
  const queryClient = useQueryClient();
  const toast = useToast();

  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(output.currentContent);
  const [historyOpen, setHistoryOpen] = useState(false);

  const { data: history } = useQuery({
    queryKey: aiOutputKeys.history(output.id),
    queryFn: () => aiOutputsApi.getHistory(output.id),
    enabled: historyOpen,
  });

  const saveMutation = useMutation({
    mutationFn: (content: string) => aiOutputsApi.save(output.id, content),
    onSuccess: () => {
      toast.show({ title: 'Changes saved', variant: 'success' });
      setEditing(false);
      onRefresh();
      void queryClient.invalidateQueries({ queryKey: aiOutputKeys.all });
    },
    onError: () => toast.show({ title: 'Failed to save', variant: 'error' }),
  });

  const approveMutation = useMutation({
    mutationFn: (editedContent?: string) => aiOutputsApi.approve(output.id, editedContent),
    onSuccess: () => {
      toast.show({ title: 'Output approved', variant: 'success' });
      setEditing(false);
      onRefresh();
      void queryClient.invalidateQueries({ queryKey: aiOutputKeys.all });
      void queryClient.invalidateQueries({
        queryKey: aiOutputKeys.generationStatus(output.appointmentId),
      });
    },
    onError: () => toast.show({ title: 'Failed to approve', variant: 'error' }),
  });

  const rejectMutation = useMutation({
    mutationFn: () => aiOutputsApi.reject(output.id),
    onSuccess: () => {
      toast.show({ title: 'Output rejected', variant: 'success' });
      onRefresh();
      void queryClient.invalidateQueries({ queryKey: aiOutputKeys.all });
    },
    onError: () => toast.show({ title: 'Failed to reject', variant: 'error' }),
  });

  const isDirty = editContent !== output.currentContent;
  const actionLoading =
    saveMutation.isPending || approveMutation.isPending || rejectMutation.isPending;

  return (
    <Card className="mb-4">
      <View className="mb-3 flex-row items-start justify-between gap-2">
        <View className="min-w-0 flex-1">
          <Text className="font-inter-semibold text-slate-900">
            {getAiOutputTypeLabel(output.type)}
          </Text>
          <Text className="mt-0.5 text-xs text-muted">{formatDate(output.createdAt)}</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <AiOutputStatusBadge status={output.status} />
          <Pressable
            onPress={() => setHistoryOpen(true)}
            className="h-8 w-8 items-center justify-center rounded-md active:bg-surface"
            accessibilityLabel="View history"
          >
            <History size={16} color={colors.muted} />
          </Pressable>
        </View>
      </View>

      {editing ? (
        <View className="gap-3">
          <Textarea
            value={editContent}
            onChangeText={setEditContent}
            minHeight={200}
            inputClassName="font-mono text-sm"
          />
          <View className="flex-row flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onPress={() => {
                setEditing(false);
                setEditContent(output.currentContent);
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!isDirty}
              loading={saveMutation.isPending}
              onPress={() => saveMutation.mutate(editContent)}
            >
              Save
            </Button>
            {output.status === AiOutputStatus.PENDING_REVIEW ? (
              <Button
                size="sm"
                disabled={!isDirty}
                loading={approveMutation.isPending}
                onPress={() => approveMutation.mutate(editContent)}
              >
                Save & Approve
              </Button>
            ) : null}
            {(output.status === AiOutputStatus.APPROVED ||
              output.status === AiOutputStatus.EDITED) &&
            isDirty ? (
              <Button
                size="sm"
                loading={approveMutation.isPending}
                onPress={() => approveMutation.mutate(editContent)}
              >
                Save & Re-approve
              </Button>
            ) : null}
          </View>
        </View>
      ) : (
        <View>
          <View className="mb-4 max-h-96">
            <MarkdownContent content={output.currentContent} />
          </View>

          {canReview && output.status === AiOutputStatus.PENDING_REVIEW ? (
            <View className="flex-row flex-wrap gap-2 border-t border-border pt-3">
              <Button
                size="sm"
                variant="outline"
                leftIcon={<Check size={14} color={colors.success.DEFAULT} />}
                loading={actionLoading}
                onPress={() => approveMutation.mutate(undefined)}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                leftIcon={<X size={14} color={colors.danger.DEFAULT} />}
                loading={actionLoading}
                onPress={() => rejectMutation.mutate()}
              >
                Reject
              </Button>
              <Button
                size="sm"
                variant="ghost"
                leftIcon={<Edit3 size={14} color={colors.primary.DEFAULT} />}
                onPress={() => setEditing(true)}
              >
                Edit
              </Button>
            </View>
          ) : null}

          {canReview &&
          (output.status === AiOutputStatus.APPROVED || output.status === AiOutputStatus.EDITED) ? (
            <Button
              size="sm"
              variant="ghost"
              className="mt-3 self-start"
              leftIcon={<Edit3 size={14} color={colors.primary.DEFAULT} />}
              onPress={() => setEditing(true)}
            >
              Edit
            </Button>
          ) : null}
        </View>
      )}

      <Modal visible={historyOpen} onClose={() => setHistoryOpen(false)} title="Edit History">
        <ScrollView className="max-h-96" showsVerticalScrollIndicator={false}>
          <Text className="mb-2 text-xs font-inter-semibold uppercase tracking-wide text-muted">
            Original (AI Generated)
          </Text>
          <View className="mb-4 rounded-lg bg-surface p-4">
            <MarkdownContent content={history?.originalContent ?? output.originalContent} />
          </View>
          {(history?.currentContent ?? output.currentContent) !==
          (history?.originalContent ?? output.originalContent) ? (
            <>
              <Text className="mb-2 text-xs font-inter-semibold uppercase tracking-wide text-muted">
                Current
              </Text>
              <View className="mb-4 rounded-lg border border-success/20 bg-emerald-50 p-4">
                <MarkdownContent content={history?.currentContent ?? output.currentContent} />
              </View>
            </>
          ) : null}
          {history?.reviewedAt ? (
            <Text className="text-sm text-muted">Reviewed on {formatDate(history.reviewedAt)}</Text>
          ) : null}
        </ScrollView>
      </Modal>
    </Card>
  );
}

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
