import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import type { InvoiceSelection } from '@/src/domain/orderSheet';
import type { Order } from '@/src/domain/types';
import { INVOICE_MIME, buildInvoiceFile, invoiceFileName } from '@/src/services/invoiceWorkbook';

function downloadOnWeb(bytes: Uint8Array, filename: string) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const blob = new Blob([copy], { type: INVOICE_MIME });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function shareInvoice(orders: Order[], selection?: InvoiceSelection): Promise<void> {
  const bytes = buildInvoiceFile(orders, selection);
  if (!bytes) throw new Error('No invoice rows');

  const filename = invoiceFileName();
  if (Platform.OS === 'web') {
    downloadOnWeb(bytes, filename);
    return;
  }

  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();
  file.create();
  file.write(bytes);

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available');
  }

  await Sharing.shareAsync(file.uri, {
    mimeType: INVOICE_MIME,
    dialogTitle: filename,
    UTI: 'org.openxmlformats.spreadsheetml.sheet',
  });
}
