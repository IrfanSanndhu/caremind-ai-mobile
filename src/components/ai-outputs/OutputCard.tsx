import { useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Edit3, History, X } from 'lucide-react-native';
import {
  Button,
  Card,
  Modal,
  Textarea,
  useToast,
} from '@/components/ui';
import { MarkdownContent } from '@/components/shared/MarkdownContent';
import { AiOutputStatusBadge } from '@/components/shared/StatusBadge';
import { aiOutputsApi, aiOutputKeys } from '@/api/aiOutputs.api';
import { AiOutputStatus, UserRole, type AiOutput } from '@/types';
import { useAuthStore } from '@/stores/auth.store';
import { getAiOutputTypeLabel } from '@/utils/ai-output-labels';
import { formatDate } from '@/utils/formatDate';
import { colors } from '@/constants/colors';

const CARD_PADDING = 16;

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    marginBottom: 16,
  },
  header: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: colors.slate900,
  },
  date: {
    marginTop: 2,
    fontSize: 12,
    color: colors.muted,
    fontFamily: 'Inter_400Regular',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyButton: {
    height: 32,
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  content: {
    overflow: 'hidden',
  },
  actionFooter: {
    paddingHorizontal: CARD_PADDING,
    paddingTop: 12,
    paddingBottom: CARD_PADDING,
    backgroundColor: colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    ...Platform.select<ViewStyle>({
      android: { elevation: 4 },
      ios: { zIndex: 2 },
    }),
  },
  actionButton: {
    backgroundColor: colors.white,
  },
  approveButton: {
    backgroundColor: colors.white,
    borderColor: '#A7F3D0',
  },
  rejectButton: {
    backgroundColor: colors.white,
    borderColor: '#FECACA',
  },
  editButton: {
    backgroundColor: colors.white,
    borderColor: colors.border,
  },
  editingActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
});

export function OutputCard({ output, onRefresh }: { output: AiOutput; onRefresh: () => void }) {
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

  const showReviewActions = canReview && output.status === AiOutputStatus.PENDING_REVIEW;
  const showEditOnly =
    canReview &&
    (output.status === AiOutputStatus.APPROVED || output.status === AiOutputStatus.EDITED);

  return (
    <Card padded={false} style={styles.card}>
      <View style={{ padding: CARD_PADDING, paddingBottom: showReviewActions || showEditOnly ? 0 : CARD_PADDING }}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>{getAiOutputTypeLabel(output.type)}</Text>
            <Text style={styles.date}>{formatDate(output.createdAt)}</Text>
          </View>
          <View style={styles.headerActions}>
            <AiOutputStatusBadge status={output.status} />
            <Pressable
              onPress={() => setHistoryOpen(true)}
              style={styles.historyButton}
              accessibilityLabel="View history"
            >
              <History size={16} color={colors.muted} />
            </Pressable>
          </View>
        </View>

        {editing ? (
          <View>
            <Textarea
              value={editContent}
              onChangeText={setEditContent}
              minHeight={200}
              inputClassName="font-mono text-sm"
            />
            <View style={styles.editingActions}>
              <Button
                size="sm"
                variant="outline"
                style={styles.actionButton}
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
                style={styles.actionButton}
                disabled={!isDirty}
                loading={saveMutation.isPending}
                onPress={() => saveMutation.mutate(editContent)}
              >
                Save
              </Button>
              {output.status === AiOutputStatus.PENDING_REVIEW ? (
                <Button
                  size="sm"
                  variant="primary"
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
                  variant="primary"
                  loading={approveMutation.isPending}
                  onPress={() => approveMutation.mutate(editContent)}
                >
                  Save & Re-approve
                </Button>
              ) : null}
            </View>
          </View>
        ) : (
          <View style={styles.content}>
            <MarkdownContent content={output.currentContent} />
          </View>
        )}
      </View>

      {!editing && showReviewActions ? (
        <View style={styles.actionFooter}>
          <Button
            size="sm"
            variant="outline"
            style={styles.approveButton}
            leftIcon={<Check size={14} color={colors.success.DEFAULT} />}
            loading={actionLoading}
            onPress={() => approveMutation.mutate(undefined)}
          >
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            style={styles.rejectButton}
            leftIcon={<X size={14} color={colors.danger.DEFAULT} />}
            loading={actionLoading}
            onPress={() => rejectMutation.mutate()}
          >
            Reject
          </Button>
          <Button
            size="sm"
            variant="outline"
            style={styles.editButton}
            leftIcon={<Edit3 size={14} color={colors.primary.DEFAULT} />}
            onPress={() => setEditing(true)}
          >
            Edit
          </Button>
        </View>
      ) : null}

      {!editing && showEditOnly ? (
        <View style={styles.actionFooter}>
          <Button
            size="sm"
            variant="outline"
            style={styles.editButton}
            leftIcon={<Edit3 size={14} color={colors.primary.DEFAULT} />}
            onPress={() => setEditing(true)}
          >
            Edit
          </Button>
        </View>
      ) : null}

      <Modal visible={historyOpen} onClose={() => setHistoryOpen(false)} title="Edit History">
        <ScrollView style={{ maxHeight: 384 }} showsVerticalScrollIndicator={false}>
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
