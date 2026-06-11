import { cacheDirectory, writeAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { apiClient } from './client';

export const pdfExportApi = {
  exportVisitSummary: async (appointmentId: string): Promise<string> => {
    const res = await apiClient.get(`/api/pdf-export/visit-summary/${appointmentId}`, {
      responseType: 'arraybuffer',
    });
    const base64 = btoa(
      new Uint8Array(res.data as ArrayBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        '',
      ),
    );
    const path = `${cacheDirectory}visit-summary-${appointmentId}.pdf`;
    await writeAsStringAsync(path, base64, {
      encoding: EncodingType.Base64,
    });
    return path;
  },
};

export async function sharePdfFile(filePath: string, title = 'Visit Summary'): Promise<void> {
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(filePath, {
      mimeType: 'application/pdf',
      dialogTitle: title,
    });
  }
}

export async function printHtml(html: string): Promise<void> {
  await Print.printAsync({ html });
}
