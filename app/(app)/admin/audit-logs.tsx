import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform, Pressable } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';
import { adminApi, adminKeys } from '@/api/admin.api';
import type { AuditLog } from '@/types';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Select,
  Skeleton,
} from '@/components/ui';
import { RoleGuard } from '@/components/shared/RoleGuard';
import { AppHeader } from '@/components/layout/AppHeader';
import { UserRole } from '@/types';
import {
  getAuditActionBadgeVariant,
  getAuditLogDisplayName,
  getAuditLogSummary,
} from '@/utils/audit-log-labels';
import { formatDateTime } from '@/utils/formatDate';
import { cn } from '@/utils/cn';

const ACTION_FILTER_OPTIONS = [
  { value: '', label: 'All actions' },
  { value: 'INVITE_USER', label: 'Invite user' },
  { value: 'DELETE_USER', label: 'Delete user' },
  { value: 'JOIN_CONSULTATION', label: 'Join consultation' },
  { value: 'START_RECORDING', label: 'Start recording' },
  { value: 'STOP_RECORDING', label: 'Stop recording' },
  { value: 'RECORD_CONSENT', label: 'Record consent' },
  { value: 'APPROVE_OUTPUT', label: 'Approve AI output' },
  { value: 'REJECT_OUTPUT', label: 'Reject AI output' },
  { value: 'UPLOAD_DOCUMENT', label: 'Upload document' },
  { value: 'DELETE_DOCUMENT', label: 'Delete document' },
  { value: 'AI_CHAT', label: 'AI chat' },
  { value: 'EXPORT_PDF', label: 'Export PDF' },
  { value: 'VIEW_AUDIT_LOG', label: 'View audit log' },
] as const;

function AuditLogCard({ log }: { log: AuditLog }) {
  const actionVariant = getAuditActionBadgeVariant(log.action);

  return (
    <Card className="mb-3" padded>
      <View className="flex-row items-start justify-between gap-2">
        <View className="min-w-0 flex-1">
          <Text className="text-sm font-inter-semibold text-slate-900" numberOfLines={1}>
            {getAuditLogDisplayName(log)}
          </Text>
          <Text className="mt-0.5 text-xs text-muted">{formatDateTime(log.createdAt)}</Text>
        </View>
        <Badge variant={actionVariant}>{log.action.replace(/_/g, ' ')}</Badge>
      </View>
      <Text className="mt-2 text-sm leading-5 text-slate-700">{getAuditLogSummary(log)}</Text>
      <View className="mt-2 flex-row flex-wrap gap-2">
        <Text className="text-xs text-muted">Resource: {log.resourceType}</Text>
        {log.resourceId ? (
          <Text className="text-xs text-muted" numberOfLines={1}>
            ID: {log.resourceId}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

function AuditLogsScreen() {
  const [action, setAction] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [page, setPage] = useState(1);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  const params = {
    action: action || undefined,
    resourceType: resourceType || undefined,
    from: fromDate
      ? new Date(
          fromDate.getFullYear(),
          fromDate.getMonth(),
          fromDate.getDate(),
          0,
          0,
          0,
          0,
        ).toISOString()
      : undefined,
    to: toDate
      ? new Date(
          toDate.getFullYear(),
          toDate.getMonth(),
          toDate.getDate(),
          23,
          59,
          59,
          999,
        ).toISOString()
      : undefined,
    page,
    pageSize: 20,
  };

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: adminKeys.auditLogsList(params),
    queryFn: () => adminApi.listAuditLogs(params),
    retry: 1,
  });

  const renderItem = useCallback(({ item }: { item: AuditLog }) => <AuditLogCard log={item} />, []);

  const listHeader = (
    <View className="mb-4 gap-3">
      <Select
        label="Action"
        value={action || null}
        options={[...ACTION_FILTER_OPTIONS]}
        onChange={(value) => {
          setAction(value);
          setPage(1);
        }}
      />
      <Input
        label="Resource type"
        placeholder="e.g. Appointment"
        value={resourceType}
        onChangeText={(text) => {
          setResourceType(text);
          setPage(1);
        }}
      />
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Text className="mb-1.5 text-sm font-inter-medium text-slate-900">From date</Text>
          <Pressable
            onPress={() => setShowFromPicker(true)}
            className="h-11 justify-center rounded-button border border-border bg-white px-3"
          >
            <Text className={cn('text-base', fromDate ? 'text-slate-900' : 'text-slate-400')}>
              {fromDate ? formatDateTime(fromDate).split(',')[0] : 'Select date'}
            </Text>
          </Pressable>
        </View>
        <View className="flex-1">
          <Text className="mb-1.5 text-sm font-inter-medium text-slate-900">To date</Text>
          <Pressable
            onPress={() => setShowToPicker(true)}
            className="h-11 justify-center rounded-button border border-border bg-white px-3"
          >
            <Text className={cn('text-base', toDate ? 'text-slate-900' : 'text-slate-400')}>
              {toDate ? formatDateTime(toDate).split(',')[0] : 'Select date'}
            </Text>
          </Pressable>
        </View>
      </View>
      {(fromDate || toDate) && (
        <Button
          variant="ghost"
          size="sm"
          onPress={() => {
            setFromDate(null);
            setToDate(null);
            setPage(1);
          }}
        >
          Clear dates
        </Button>
      )}
    </View>
  );

  const listFooter =
    data && data.totalPages > 1 ? (
      <View className="mt-2 flex-row items-center justify-between gap-3 pb-4">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onPress={() => setPage((p) => Math.max(1, p - 1))}
        >
          Previous
        </Button>
        <Text className="text-sm text-muted">
          Page {page} of {data.totalPages}
        </Text>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= data.totalPages}
          onPress={() => setPage((p) => p + 1)}
        >
          Next
        </Button>
      </View>
    ) : (
      <View className="h-4" />
    );

  return (
    <View className="flex-1 bg-surface">
      <AppHeader subtitle="Organization activity and PHI access" />

      <View className="min-h-0 flex-1 px-4 pt-4">
        {isLoading ? (
          <View>
            {listHeader}
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} height={110} className="mb-3 rounded-card" />
            ))}
          </View>
        ) : (
          <FlashList
            data={data?.items ?? []}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={listHeader}
            ListFooterComponent={listFooter}
            ListEmptyComponent={
              <EmptyState
                icon={ShieldCheck}
                title="No audit logs found"
                description="Activity appears here when users view records, run consultations, or manage documents."
              />
            }
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
            contentContainerStyle={{ paddingBottom: 16 }}
          />
        )}
      </View>

      {showFromPicker ? (
        <DateTimePicker
          value={fromDate ?? new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, date) => {
            setShowFromPicker(Platform.OS === 'ios');
            if (date) {
              setFromDate(date);
              setPage(1);
            }
          }}
        />
      ) : null}

      {showToPicker ? (
        <DateTimePicker
          value={toDate ?? new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, date) => {
            setShowToPicker(Platform.OS === 'ios');
            if (date) {
              setToDate(date);
              setPage(1);
            }
          }}
        />
      ) : null}
    </View>
  );
}

export default function AuditLogsPage() {
  return (
    <RoleGuard allowedRoles={[UserRole.ADMIN]}>
      <AuditLogsScreen />
    </RoleGuard>
  );
}
