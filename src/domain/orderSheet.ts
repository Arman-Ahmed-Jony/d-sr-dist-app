import type { Order, OrderLine } from '@/src/domain/types';

export const INVOICE_PRODUCT_ROWS = 10;
export const INVOICE_ENTRIES_PER_PAGE = 4;
export const INVOICE_COLUMNS_PER_ENTRY = 5;

const HEADER_ROW = 5;
const FIRST_PRODUCT_ROW = 6;
const SIGNATURE_LABEL_ROW = FIRST_PRODUCT_ROW + INVOICE_PRODUCT_ROWS;
const SIGNATURE_LINE_ROW = SIGNATURE_LABEL_ROW + 1;
const BLOCK_ROWS = SIGNATURE_LINE_ROW + 1;
const SHOP_GAP_ROWS = 1;

const COLUMN_WIDTHS = [22, 11, 11, 12, 12];
const BLOCK_ROW_HEIGHTS = [
  11, 11, 11, 11, 4, 12,
  ...Array<number>(INVOICE_PRODUCT_ROWS).fill(10),
  12,
  18,
];
const SHOP_GAP_HEIGHT = 4;

export type InvoiceCell = {
  value: string | number | null;
  bold?: boolean;
  header?: boolean;
  align?: 'left' | 'right';
  border?: boolean | 'bottom';
};

export type InvoiceSheet = {
  rows: InvoiceCell[][];
  colWidths: number[];
  rowHeights: number[];
  /** 0-based row index where each extra printed page starts. */
  rowPageBreaks: number[];
};

type ShopEntry = {
  shopName: string;
  orderDate: Date;
  deliveryDate: Date;
  srName: string;
  lines: OrderLine[];
};

function formatShortDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

function numberOrZero(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function linesForOrder(order: Order, productId?: string): OrderLine[] {
  if (!productId) return order.lines;
  return order.lines.filter((line) => line.productId === productId);
}

function shopEntries(orders: Order[], productId?: string): ShopEntry[] {
  const entries: ShopEntry[] = [];
  for (const order of orders) {
    const lines = linesForOrder(order, productId);
    if (lines.length === 0) continue;
    const chunks = Math.ceil(lines.length / INVOICE_PRODUCT_ROWS);
    for (let index = 0; index < chunks; index += 1) {
      const start = index * INVOICE_PRODUCT_ROWS;
      entries.push({
        shopName: index === 0 ? order.shopName : `${order.shopName} (${index + 1})`,
        orderDate: order.orderDate,
        deliveryDate: order.deliveryDate,
        srName: order.srName ?? order.srId,
        lines: lines.slice(start, start + INVOICE_PRODUCT_ROWS),
      });
    }
  }
  return entries;
}

function blankCell(): InvoiceCell {
  return { value: null };
}

function writeEntry(rows: InvoiceCell[][], entry: ShopEntry, startRow: number) {
  const label = (offset: number, text: string) => {
    rows[startRow + offset][0] = { value: text, bold: true };
  };
  const value = (offset: number, text: string) => {
    rows[startRow + offset][1] = { value: text };
  };

  label(0, 'Shop name:');
  value(0, entry.shopName);
  label(1, 'Date:');
  value(1, formatShortDate(entry.orderDate));
  label(2, 'Delivery date:');
  value(2, formatShortDate(entry.deliveryDate));
  label(3, 'SR name:');
  value(3, entry.srName);

  const headers = ['Product Name', 'Price/CS', 'Order (CS)', 'Free (pcs)', 'Discount'] as const;
  headers.forEach((text, offset) => {
    rows[startRow + HEADER_ROW][offset] = {
      value: text,
      bold: true,
      header: true,
      border: true,
      align: offset === 0 ? 'left' : 'right',
    };
  });

  for (let index = 0; index < INVOICE_PRODUCT_ROWS; index += 1) {
    const line = entry.lines[index];
    const row = startRow + FIRST_PRODUCT_ROW + index;
    if (!line) {
      for (let column = 0; column < INVOICE_COLUMNS_PER_ENTRY; column += 1) {
        rows[row][column] = { value: null, border: true, align: column === 0 ? 'left' : 'right' };
      }
      continue;
    }
    rows[row][0] = { value: line.productName, border: true };
    rows[row][1] = { value: numberOrZero(line.pricePerCase), align: 'right', border: true };
    rows[row][2] = { value: numberOrZero(line.quantityCases), align: 'right', border: true };
    rows[row][3] = { value: numberOrZero(line.freePcs), align: 'right', border: true };
    rows[row][4] = { value: numberOrZero(line.discountAmount), align: 'right', border: true };
  }

  rows[startRow + SIGNATURE_LABEL_ROW][0] = { value: 'Buyer signature:', bold: true };
  for (let column = 0; column < INVOICE_COLUMNS_PER_ENTRY; column += 1) {
    const current = rows[startRow + SIGNATURE_LINE_ROW][column];
    rows[startRow + SIGNATURE_LINE_ROW][column] = { ...current, border: 'bottom' };
  }
}

export function invoiceLineCount(orders: Order[], productId?: string): number {
  return orders.reduce((sum, order) => sum + linesForOrder(order, productId).length, 0);
}

export function buildInvoiceSheet(orders: Order[], productId?: string): InvoiceSheet | null {
  const entries = shopEntries(orders, productId);
  if (entries.length === 0) return null;

  const stride = BLOCK_ROWS + SHOP_GAP_ROWS;
  const rowCount = entries.length * BLOCK_ROWS + (entries.length - 1) * SHOP_GAP_ROWS;
  const rows = Array.from({ length: rowCount }, () =>
    Array.from({ length: INVOICE_COLUMNS_PER_ENTRY }, () => blankCell()),
  );
  const rowHeights: number[] = [];

  entries.forEach((entry, index) => {
    writeEntry(rows, entry, index * stride);
    rowHeights.push(...BLOCK_ROW_HEIGHTS);
    if (index < entries.length - 1) rowHeights.push(SHOP_GAP_HEIGHT);
  });

  const rowPageBreaks: number[] = [];
  for (let page = 1; page * INVOICE_ENTRIES_PER_PAGE < entries.length; page += 1) {
    rowPageBreaks.push(page * INVOICE_ENTRIES_PER_PAGE * stride);
  }

  return {
    rows,
    colWidths: COLUMN_WIDTHS,
    rowHeights,
    rowPageBreaks,
  };
}
