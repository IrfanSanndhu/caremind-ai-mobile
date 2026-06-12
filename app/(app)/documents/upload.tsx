import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { FileText, Image as ImageIcon, Upload } from 'lucide-react-native';
import { appointmentsApi, appointmentKeys } from '@/api/appointments.api';
import { documentsApi, documentKeys, type MobileUploadFile } from '@/api/documents.api';
import { patientsApi, patientKeys } from '@/api/patients.api';
import { RoleGuard } from '@/components/shared/RoleGuard';
import { PageContainer } from '@/components/layout/PageContainer';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button, Card, Select, useToast } from '@/components/ui';
import { colors } from '@/constants/colors';
import { UserRole } from '@/types';
import { formatDateTime } from '@/utils/formatDate';

function DocumentUploadScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('');
  const [uploading, setUploading] = useState(false);

  const { data: patientsData, isLoading: patientsLoading } = useQuery({
    queryKey: patientKeys.list({ pageSize: 100 }),
    queryFn: () => patientsApi.list({ pageSize: 100 }),
    retry: 1,
  });

  const { data: appointmentsData } = useQuery({
    queryKey: appointmentKeys.list({ pageSize: 100, patientId: selectedPatientId }),
    queryFn: () => appointmentsApi.list({ pageSize: 100, patientId: selectedPatientId }),
    enabled: Boolean(selectedPatientId),
    retry: 1,
  });

  const patientOptions = useMemo(
    () =>
      (patientsData?.items ?? []).map((p) => ({
        value: p.id,
        label: `${p.firstName} ${p.lastName}`,
      })),
    [patientsData?.items],
  );

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

  const uploadMutation = useMutation({
    mutationFn: (files: MobileUploadFile[]) =>
      documentsApi.upload({
        files,
        patientId: selectedPatientId,
        appointmentId: selectedAppointmentId || undefined,
      }),
    onSuccess: (result) => {
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
      void queryClient.invalidateQueries({ queryKey: documentKeys.all });
    },
    onError: () => toast.show({ title: 'Upload failed', variant: 'error' }),
  });

  const handleUpload = useCallback(
    async (files: MobileUploadFile[]) => {
      if (!selectedPatientId) {
        toast.show({ title: 'Select a patient first', variant: 'warning' });
        return;
      }
      if (files.length === 0) return;

      setUploading(true);
      try {
        await uploadMutation.mutateAsync(files);
      } finally {
        setUploading(false);
      }
    },
    [selectedPatientId, toast, uploadMutation],
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

  return (
    <View className="flex-1 bg-surface">
      <ScreenHeader
        title="Upload Document"
        subtitle="Add records, reports, or images for a patient"
        fallbackHref="/(app)/dashboard"
      />

      <PageContainer>
        <Card className="mb-4">
          <Text className="mb-3 text-base font-inter-semibold text-slate-900">Patient details</Text>
          <View className="gap-3">
            <Select
              label="Patient"
              placeholder={patientsLoading ? 'Loading patients…' : 'Select a patient…'}
              value={selectedPatientId || null}
              options={[{ value: '', label: 'Select a patient…' }, ...patientOptions]}
              onChange={(value) => {
                setSelectedPatientId(value);
                setSelectedAppointmentId('');
              }}
              disabled={patientsLoading}
            />
            {selectedPatientId ? (
              <Select
                label="Link to appointment (optional)"
                value={selectedAppointmentId || null}
                options={[
                  { value: '', label: 'No appointment' },
                  ...appointmentOptions,
                ]}
                onChange={setSelectedAppointmentId}
                disabled={appointmentOptions.length === 0}
              />
            ) : null}
          </View>
        </Card>

        <Card className="mb-4">
          <Text className="mb-1 text-base font-inter-semibold text-slate-900">Upload files</Text>
          <Text className="mb-4 text-sm text-muted">
            PDFs, images, and common document formats are supported.
          </Text>

          {uploading ? (
            <View className="items-center py-8">
              <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
              <Text className="mt-3 text-sm text-muted">Uploading…</Text>
            </View>
          ) : (
            <View className="gap-3">
              <Button
                variant="outline"
                leftIcon={<FileText size={18} color={colors.primary.DEFAULT} />}
                onPress={() => void pickDocuments()}
                disabled={!selectedPatientId}
              >
                Choose Files
              </Button>
              <Button
                variant="outline"
                leftIcon={<ImageIcon size={18} color={colors.primary.DEFAULT} />}
                onPress={() => void pickImages()}
                disabled={!selectedPatientId}
              >
                Choose Photos
              </Button>
              <Button
                variant="outline"
                leftIcon={<Upload size={18} color={colors.primary.DEFAULT} />}
                onPress={() => void takePhoto()}
                disabled={!selectedPatientId}
              >
                Take Photo
              </Button>
            </View>
          )}

          {!selectedPatientId ? (
            <Text className="mt-4 text-center text-sm text-muted">
              Select a patient before uploading.
            </Text>
          ) : null}
        </Card>

        <Button variant="outline" onPress={() => router.push('/(app)/documents' as never)}>
          Browse patient documents
        </Button>
      </PageContainer>
    </View>
  );
}

export default function DocumentUploadPage() {
  return (
    <RoleGuard allowedRoles={[UserRole.DOCTOR, UserRole.ADMIN]}>
      <DocumentUploadScreen />
    </RoleGuard>
  );
}
