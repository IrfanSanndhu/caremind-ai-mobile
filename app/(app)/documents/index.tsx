import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import {
  Eye,
  FileText,
  Image as ImageIcon,
  Plus,
  RefreshCw,
  Search,
  Stethoscope,
  Trash2,
  Upload,
  User,
} from 'lucide-react-native';
import {
  BottomSheet,
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  Select,
  Skeleton,
  useToast,
} from '@/components/ui';
import { DocumentStatusBadge } from '@/components/shared/StatusBadge';
import { AppHeader } from '@/components/layout/AppHeader';
import { SCROLL_BOTTOM_INSET } from '@/components/layout/TabBar';
import { documentsApi, documentKeys, type MobileUploadFile } from '@/api/documents.api';
import { appointmentsApi, appointmentKeys } from '@/api/appointments.api';
import { patientsApi, patientKeys } from '@/api/patients.api';
import { useAuthStore } from '@/stores/auth.store';
import { UserRole, type Document } from '@/types';
import { formatDate, formatDateTime, formatFileSize } from '@/utils';
import { colors } from '@/constants/colors';

const ALL_APPOINTMENTS = '';

function DocumentCardItem({
  doc,
  onView,
  onDelete,
  onReprocess,
  canDelete,
  canManage,
}: {
  doc: Document;
  onView: (doc: Document) => void;
  onDelete: () => void;
  onReprocess?: () => void;
  canDelete: boolean;
  canManage: boolean;
}) {
  const isImage = doc.mimeType.startsWith('image/') || doc.fileType.startsWith('image/');
  const canRetry = canManage && onReprocess && doc.processingStatus === 'failed';

  return (
    <Card className="mb-3">
      <View className="flex-row items-start gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-lg bg-primary-50">
          {isImage ? (
            <ImageIcon size={20} color={colors.primary.DEFAULT} />
          ) : (
            <FileText size={20} color={colors.primary.DEFAULT} />
          )}
        </View>
        <View className="min-w-0 flex-1">
          <Text className="font-inter-semibold text-sm text-slate-900" numberOfLines={2}>
            {doc.fileName}
          </Text>
          {doc.appointment?.scheduledAt ? (
            <Text className="mt-0.5 text-xs text-muted">
              Appointment: {formatDateTime(doc.appointment.scheduledAt)}
            </Text>
          ) : (
            <Text className="mt-0.5 text-xs text-muted">Not linked to an appointment</Text>
          )}
          {doc.documentType ? (
            <Text className="mt-0.5 text-xs text-muted">{doc.documentType}</Text>
          ) : null}
          <View className="mt-2 flex-row flex-wrap items-center gap-2">
            <DocumentStatusBadge status={doc.processingStatus} />
            <Text className="text-xs text-muted">{formatFileSize(doc.fileSize)}</Text>
            <Text className="text-xs text-muted">{formatDate(doc.createdAt)}</Text>
          </View>
          {canRetry ? (
            <Button
              size="sm"
              variant="outline"
              className="mt-2 self-start"
              leftIcon={<RefreshCw size={14} color={colors.danger.DEFAULT} />}
              onPress={onReprocess}
            >
              Retry processing
            </Button>
          ) : null}
        </View>
        <View className="flex-row gap-1">
          {doc.processingStatus === 'ready' ? (
            <Pressable
              onPress={() => onView(doc)}
              className="h-9 w-9 items-center justify-center rounded-md active:bg-surface"
              accessibilityLabel={`View ${doc.fileName}`}
            >
              <Eye size={18} color={colors.muted} />
            </Pressable>
          ) : null}
          {canDelete ? (
            <Pressable
              onPress={onDelete}
              className="h-9 w-9 items-center justify-center rounded-md active:bg-red-50"
              accessibilityLabel={`Delete ${doc.fileName}`}
            >
              <Trash2 size={18} color={colors.danger.DEFAULT} />
            </Pressable>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

export default function DocumentsIndexScreen() {
  const role = useAuthStore((s) => s.role);
  const queryClient = useQueryClient();
  const toast = useToast();

  const isStaff = role === UserRole.ADMIN || role === UserRole.DOCTOR;
  const isPatient = role === UserRole.PATIENT;
  const canUpload = !isPatient;
  const canManageDocuments = isStaff;

  const [search, setSearch] = useState('');
  const [page] = useState(1);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(ALL_APPOINTMENTS);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadAppointmentId, setUploadAppointmentId] = useState('');

  const listEnabled = isStaff ? !!selectedPatientId : !!selectedDoctorId;

  const listParams = useMemo(() => {
    const params: {
      page: number;
      pageSize: number;
      patientId?: string;
      doctorId?: string;
      appointmentId?: string;
    } = { page, pageSize: 20 };
    if (isStaff && selectedPatientId) params.patientId = selectedPatientId;
    if (isPatient && selectedDoctorId) params.doctorId = selectedDoctorId;
    if (selectedAppointmentId) params.appointmentId = selectedAppointmentId;
    return params;
  }, [page, isStaff, isPatient, selectedPatientId, selectedDoctorId, selectedAppointmentId]);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: documentKeys.list(listParams),
    queryFn: () => documentsApi.list(listParams),
    enabled: listEnabled,
    refetchInterval: (query) => {
      const items = query.state.data?.items ?? [];
      const inProgress = items.some(
        (d) => d.processingStatus === 'pending' || d.processingStatus === 'processing',
      );
      return inProgress ? 3000 : false;
    },
  });

  const { data: patientsData } = useQuery({
    queryKey: patientKeys.list({ pageSize: 100 }),
    queryFn: () => patientsApi.list({ pageSize: 100 }),
    enabled: isStaff,
    retry: 1,
  });

  const { data: patientAppointmentsData } = useQuery({
    queryKey: appointmentKeys.list({ pageSize: 100 }),
    queryFn: () => appointmentsApi.list({ pageSize: 100 }),
    enabled: isPatient,
    retry: 1,
  });

  const { data: staffAppointmentsData } = useQuery({
    queryKey: appointmentKeys.list({ pageSize: 100, patientId: selectedPatientId }),
    queryFn: () => appointmentsApi.list({ pageSize: 100, patientId: selectedPatientId }),
    enabled: isStaff && !!selectedPatientId,
    retry: 1,
  });

  const { data: patientDoctorAppointments } = useQuery({
    queryKey: appointmentKeys.list({ pageSize: 100, doctorId: selectedDoctorId }),
    queryFn: () => appointmentsApi.list({ pageSize: 100, doctorId: selectedDoctorId }),
    enabled: isPatient && !!selectedDoctorId,
    retry: 1,
  });

  const appointmentsData = isPatient ? patientDoctorAppointments : staffAppointmentsData;

  const patientOptions = useMemo(
    () =>
      (patientsData?.items ?? []).map((p) => ({
        value: p.id,
        label: `${p.firstName} ${p.lastName}`,
      })),
    [patientsData?.items],
  );

  const doctorOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const appt of patientAppointmentsData?.items ?? []) {
      if (appt.doctorId && appt.doctor) {
        map.set(appt.doctorId, `Dr. ${appt.doctor.firstName} ${appt.doctor.lastName}`.trim());
      }
    }
    return Array.from(map, ([value, label]) => ({ value, label }));
  }, [patientAppointmentsData?.items]);

  const appointmentOptions = useMemo(
    () =>
      (appointmentsData?.items ?? [])
        .slice()
        .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
        .map((a) => ({
          value: a.id,
          label: formatDateTime(a.scheduledAt),
        })),
    [appointmentsData?.items],
  );

  const filteredItems = useMemo(() => {
    const items = data?.items ?? [];
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (d) =>
        d.fileName.toLowerCase().includes(q) ||
        (d.documentType?.toLowerCase().includes(q) ?? false),
    );
  }, [data?.items, search]);

  const deleteMutation = useMutation({
    mutationFn: documentsApi.delete,
    onSuccess: () => {
      toast.show({ title: 'Document deleted', variant: 'success' });
      setDeleteId(null);
      void queryClient.invalidateQueries({ queryKey: documentKeys.all });
    },
    onError: () => toast.show({ title: 'Delete failed', variant: 'error' }),
  });

  const reprocessMutation = useMutation({
    mutationFn: documentsApi.reprocess,
    onSuccess: () => {
      toast.show({
        title: 'Reprocessing started',
        description: 'Text extraction and AI indexing will run again.',
        variant: 'success',
      });
      void queryClient.invalidateQueries({ queryKey: documentKeys.all });
    },
    onError: () => toast.show({ title: 'Reprocess failed', variant: 'error' }),
  });

  const handleUpload = useCallback(
    async (files: MobileUploadFile[]) => {
      const patientId = selectedPatientId;
      if (!patientId) {
        toast.show({ title: 'Select a patient first', variant: 'warning' });
        return;
      }
      setUploading(true);
      try {
        const result = await documentsApi.upload({
          files,
          patientId,
          appointmentId: uploadAppointmentId || undefined,
        });
        if (result.documents.length > 0) {
          toast.show({
            title: `${result.documents.length} document(s) uploaded`,
            variant: 'success',
          });
        }
        if (result.failed.length > 0) {
          toast.show({
            title: `${result.failed.length} upload(s) failed`,
            description: result.failed[0]?.message,
            variant: 'error',
          });
        }
        setUploadOpen(false);
        setUploadAppointmentId('');
        void queryClient.invalidateQueries({ queryKey: documentKeys.all });
      } catch {
        toast.show({ title: 'Upload failed', variant: 'error' });
      } finally {
        setUploading(false);
      }
    },
    [selectedPatientId, uploadAppointmentId, queryClient, toast],
  );

  const pickDocuments = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const files: MobileUploadFile[] = result.assets.map((asset) => ({
      uri: asset.uri,
      name: asset.name,
      type: asset.mimeType ?? 'application/octet-stream',
    }));
    await handleUpload(files);
  }, [handleUpload]);

  const pickImages = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast.show({ title: 'Photo library permission required', variant: 'warning' });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.9,
    });
    if (result.canceled) return;
    const files: MobileUploadFile[] = result.assets.map((asset, index) => ({
      uri: asset.uri,
      name: asset.fileName ?? `photo-${index + 1}.jpg`,
      type: asset.mimeType ?? 'image/jpeg',
    }));
    await handleUpload(files);
  }, [handleUpload, toast]);

  const takePhoto = useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      toast.show({ title: 'Camera permission required', variant: 'warning' });
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.9 });
    if (result.canceled) return;
    const asset = result.assets[0];
    await handleUpload([
      {
        uri: asset.uri,
        name: asset.fileName ?? `photo-${Date.now()}.jpg`,
        type: asset.mimeType ?? 'image/jpeg',
      },
    ]);
  }, [handleUpload, toast]);

  const renderDocument = useCallback(
    ({ item }: { item: Document }) => (
      <DocumentCardItem
        doc={item}
        onView={setPreviewDoc}
        onDelete={() => setDeleteId(item.id)}
        onReprocess={canManageDocuments ? () => reprocessMutation.mutate(item.id) : undefined}
        canDelete={canManageDocuments}
        canManage={canManageDocuments}
      />
    ),
    [canManageDocuments, reprocessMutation],
  );

  const pageSubtitle = isStaff
    ? 'Select a patient to browse and upload records'
    : 'Select a doctor to view documents from your visits';

  const listHeader = (
    <View className="gap-3 pb-2">
      {isStaff ? (
        <Select
          label="Patient"
          value={selectedPatientId || null}
          options={[{ value: '', label: 'Select a patient…' }, ...patientOptions]}
          onChange={(value) => {
            setSelectedPatientId(value);
            setSelectedAppointmentId(ALL_APPOINTMENTS);
          }}
        />
      ) : null}
      {isPatient ? (
        <Select
          label="Doctor"
          value={selectedDoctorId || null}
          options={[{ value: '', label: 'Select a doctor…' }, ...doctorOptions]}
          onChange={(value) => {
            setSelectedDoctorId(value);
            setSelectedAppointmentId(ALL_APPOINTMENTS);
          }}
        />
      ) : null}
      {listEnabled ? (
        <>
          <Select
            label="Appointment"
            value={selectedAppointmentId || null}
            options={[
              { value: ALL_APPOINTMENTS, label: 'All appointments' },
              ...appointmentOptions,
            ]}
            onChange={setSelectedAppointmentId}
            disabled={appointmentOptions.length === 0}
          />
          <Input
            label="Search"
            placeholder="Search documents..."
            value={search}
            onChangeText={setSearch}
            trailingIcon={<Search size={18} color={colors.slate400} />}
          />
        </>
      ) : null}
    </View>
  );

  return (
    <View className="flex-1 bg-surface">
      <AppHeader subtitle={pageSubtitle} />

      {!listEnabled ? (
        <View className="flex-1 px-4 pt-4">
          {listHeader}
          <EmptyState
            icon={isStaff ? User : Stethoscope}
            title={isStaff ? 'Select a patient' : 'Select a doctor'}
            description={
              isStaff
                ? 'Please select a patient to view their documents.'
                : 'Please select a doctor to view documents from your appointments.'
            }
          />
        </View>
      ) : isLoading ? (
        <View className="gap-3 px-4 pt-4">
          {listHeader}
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-card" />
          ))}
        </View>
      ) : (
        <FlashList
          data={filteredItems}
          renderItem={renderDocument}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={listHeader}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 88 }}
          refreshing={isRefetching}
          onRefresh={() => void refetch()}
          ListEmptyComponent={
            <EmptyState
              icon={FileText}
              title="No documents found"
              description={
                canUpload
                  ? 'Upload patient records, reports, or other documents.'
                  : 'No documents linked to this doctor yet.'
              }
              action={
                canUpload ? (
                  <Button
                    leftIcon={<Plus size={16} color={colors.white} />}
                    onPress={() => setUploadOpen(true)}
                  >
                    Upload Document
                  </Button>
                ) : undefined
              }
            />
          }
        />
      )}

      {canUpload && listEnabled ? (
        <Pressable
          onPress={() => setUploadOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Upload document"
          className="absolute right-4 h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg active:opacity-90"
          style={{ bottom: SCROLL_BOTTOM_INSET }}
        >
          <Upload size={22} color={colors.white} strokeWidth={2.5} />
        </Pressable>
      ) : null}

      <BottomSheet
        visible={uploadOpen}
        onClose={() => {
          if (!uploading) {
            setUploadOpen(false);
            setUploadAppointmentId('');
          }
        }}
        title="Upload Document"
      >
        <View className="gap-4">
          {appointmentOptions.length > 0 ? (
            <Select
              label="Link to appointment (optional)"
              value={uploadAppointmentId || null}
              options={[{ value: '', label: 'No appointment' }, ...appointmentOptions]}
              onChange={setUploadAppointmentId}
            />
          ) : null}
          {uploading ? (
            <View className="items-center py-6">
              <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
              <Text className="mt-3 text-sm text-muted">Uploading...</Text>
            </View>
          ) : (
            <>
              <Button
                variant="outline"
                leftIcon={<FileText size={18} color={colors.primary.DEFAULT} />}
                onPress={() => void pickDocuments()}
              >
                Choose Files
              </Button>
              <Button
                variant="outline"
                leftIcon={<ImageIcon size={18} color={colors.primary.DEFAULT} />}
                onPress={() => void pickImages()}
              >
                Choose Photos
              </Button>
              <Button
                variant="outline"
                leftIcon={<Upload size={18} color={colors.primary.DEFAULT} />}
                onPress={() => void takePhoto()}
              >
                Take Photo
              </Button>
            </>
          )}
        </View>
      </BottomSheet>

      <Modal
        visible={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        title={previewDoc?.fileName ?? 'Document'}
      >
        <Text className="text-sm text-muted">
          {previewDoc
            ? `${formatFileSize(previewDoc.fileSize)} · Uploaded ${formatDate(previewDoc.createdAt)}`
            : ''}
        </Text>
        {previewDoc?.extractedText ? (
          <Text className="mt-4 text-sm leading-5 text-slate-700" numberOfLines={20}>
            {previewDoc.extractedText}
          </Text>
        ) : (
          <Text className="mt-4 text-sm text-muted">
            Preview is available on web. Document is stored and indexed for AI search.
          </Text>
        )}
      </Modal>

      <Modal visible={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Document">
        <Text className="text-sm text-slate-700">
          Are you sure you want to delete this document? This cannot be undone.
        </Text>
        <View className="mt-5 flex-row gap-3">
          <Button variant="outline" className="flex-1" onPress={() => setDeleteId(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            loading={deleteMutation.isPending}
            onPress={() => deleteId && deleteMutation.mutate(deleteId)}
          >
            Delete
          </Button>
        </View>
      </Modal>
    </View>
  );
}
