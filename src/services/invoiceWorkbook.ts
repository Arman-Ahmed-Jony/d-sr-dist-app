import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import * as XLSX from 'xlsx-js-style';
import { buildInvoiceSheet, type InvoiceCell } from '@/src/domain/orderSheet';
import type { Order } from '@/src/domain/types';

const MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const thin = { style: 'thin', color: { rgb: '1A211C' } };
const border = { top: thin, bottom: thin, left: thin, right: thin };

function cellStyleWithoutBorder(cell: InvoiceCell) {
  return {
    alignment: { vertical: 'center', horizontal: cell.align === 'right' ? 'right' : 'left', wrapText: true },
    font: { name: 'Calibri', sz: 8, bold: Boolean(cell.bold) },
  };
}

function cellStyle(cell: InvoiceCell) {
  const horizontal = cell.header ? 'center' : cell.align === 'right' ? 'right' : 'left';
  const edge = cell.border === 'bottom' ? { bottom: thin } : border;
  return {
    ...cellStyleWithoutBorder(cell),
    border: edge,
    alignment: {
      vertical: cell.border === 'bottom' ? 'bottom' : 'center',
      horizontal,
      wrapText: true,
    },
    font: { name: 'Calibri', sz: 8, bold: Boolean(cell.bold || cell.header) },
    fill: cell.header ? { patternType: 'solid', fgColor: { rgb: 'E4EFE6' } } : undefined,
  };
}

function toCell(cell: InvoiceCell): XLSX.CellObject {
  const style = cell.border ? cellStyle(cell) : cellStyleWithoutBorder(cell);
  if (typeof cell.value === 'number') {
    return { t: 'n', v: cell.value, s: style };
  }
  if (typeof cell.value === 'string' && cell.value.length > 0) {
    return { t: 's', v: cell.value, s: style };
  }
  return { t: 's', v: '', s: style };
}

function pageBreakXml(rowPageBreaks: number[]): string {
  if (rowPageBreaks.length === 0) return '';
  const breaks = rowPageBreaks
    .map((rowIndex) => `<brk id="${rowIndex + 1}" max="16383" man="1"/>`)
    .join('');
  return `<rowBreaks count="${rowPageBreaks.length}" manualBreakCount="${rowPageBreaks.length}">${breaks}</rowBreaks>`;
}

function withA4Setup(bytes: Uint8Array, rowPageBreaks: number[]): Uint8Array {
  const files = unzipSync(bytes);
  const sheetPath = Object.keys(files).find((key) => /^xl\/worksheets\/sheet\d+\.xml$/.test(key));
  if (!sheetPath) return bytes;

  const setup = `<pageSetup paperSize="9" orientation="portrait" scale="100"/>${pageBreakXml(rowPageBreaks)}`;
  let xml = strFromU8(files[sheetPath]);
  if (xml.includes('<pageMargins')) {
    xml = xml.replace(/<pageMargins[^>]*\/>/, (tag) => `${tag}${setup}`);
  } else {
    xml = xml.replace(
      '</worksheet>',
      `<pageMargins left="0.4" right="0.4" top="0.4" bottom="0.4" header="0.2" footer="0.2"/>${setup}</worksheet>`,
    );
  }
  files[sheetPath] = strToU8(xml);
  return zipSync(files);
}

export function buildInvoiceFile(orders: Order[], productId?: string): Uint8Array | null {
  const sheet = buildInvoiceSheet(orders, productId);
  if (!sheet) return null;

  const columnCount = sheet.rows[0]?.length ?? 0;
  const worksheet: XLSX.WorkSheet = {};
  sheet.rows.forEach((row, rowIndex) => {
    row.forEach((cell, columnIndex) => {
      worksheet[XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex })] = toCell(cell);
    });
  });

  worksheet['!ref'] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: sheet.rows.length - 1, c: Math.max(columnCount - 1, 0) },
  });
  worksheet['!cols'] = sheet.colWidths.map((wch) => ({ wch }));
  worksheet['!rows'] = sheet.rowHeights.map((hpt) => ({ hpt }));
  worksheet['!margins'] = {
    left: 0.4,
    right: 0.4,
    top: 0.4,
    bottom: 0.4,
    header: 0.2,
    footer: 0.2,
  };

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Invoice');
  const written = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  return withA4Setup(new Uint8Array(written), sheet.rowPageBreaks);
}

export function invoiceFileName(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `invoice-${year}-${month}-${day}.xlsx`;
}

export const INVOICE_MIME = MIME;
