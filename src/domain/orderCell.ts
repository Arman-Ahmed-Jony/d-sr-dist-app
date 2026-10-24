import { computeLineTotal, computeOrderTotal } from '@/src/domain/orderCalc';
import type { Order, OrderLine, OrderStatus } from '@/src/domain/types';

export type OrderCellField =
  | 'product'
  | 'cases'
  | 'bounced'
  | 'freePcs'
  | 'discount'
  | 'orderDate'
  | 'deliveryDate'
  | 'status';

export type OrderCellPatch =
  | { field: 'cases'; productId?: string; quantityCases: number }
  | { field: 'bounced'; productId?: string; bouncedCases: number; bouncedPcs: number }
  | {
      field: 'freePcs';
      productId?: string;
      freePcs: number;
      freeProductId: string;
      freeProductName: string;
    }
  | { field: 'discount'; productId?: string; discountAmount: number }
  | {
      field: 'product';
      productId?: string;
      nextProductId: string;
      nextProductName: string;
      pricePerCase: number;
    }
  | { field: 'orderDate'; orderDate: Date }
  | { field: 'deliveryDate'; deliveryDate: Date }
  | { field: 'status'; status: OrderStatus };

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function lineIndex(order: Order, productId?: string): number {
  if (productId) return order.lines.findIndex((line) => line.productId === productId);
  return order.lines.length === 1 ? 0 : -1;
}

function statusAfterBounce(order: Order, lines: OrderLine[]): OrderStatus {
  const any = lines.some((line) => line.bouncedCases > 0 || line.bouncedPcs > 0);
  const allFull =
    lines.length > 0 &&
    lines.every((line) => line.bouncedCases === line.quantityCases && line.bouncedPcs === line.quantityPcs);
  if (allFull && any) return 'bounced';
  if (any) return 'partial';
  if (order.status === 'partial' || order.status === 'bounced') return 'confirmed';
  return order.status;
}

function withLine(order: Order, index: number, line: OrderLine): Order {
  const lines = order.lines.map((item, itemIndex) => (itemIndex === index ? line : item));
  return {
    ...order,
    lines,
    orderTotal: computeOrderTotal(lines),
    updatedAt: new Date(),
  };
}

export function applyOrderCellPatch(order: Order, patch: OrderCellPatch): Order {
  if (patch.field === 'orderDate') {
    return { ...order, orderDate: startOfDay(patch.orderDate), updatedAt: new Date() };
  }
  if (patch.field === 'deliveryDate') {
    return { ...order, deliveryDate: startOfDay(patch.deliveryDate), updatedAt: new Date() };
  }
  if (patch.field === 'status') {
    return { ...order, status: patch.status, updatedAt: new Date() };
  }

  const index = lineIndex(order, patch.productId);
  const line = index >= 0 ? order.lines[index] : undefined;
  if (!line || index < 0) {
    throw new Error('Line not found.');
  }

  if (patch.field === 'product') {
    if (!patch.nextProductId || patch.nextProductId === line.productId) return order;
    const taken = order.lines.some(
      (item, itemIndex) => itemIndex !== index && item.productId === patch.nextProductId,
    );
    if (taken) {
      throw new Error('Duplicate products are not allowed.');
    }
    const pricePerCase = Number.isFinite(patch.pricePerCase) ? Math.max(0, patch.pricePerCase) : line.pricePerCase;
    const followFree = !line.freeProductId || line.freeProductId === line.productId;
    return withLine(order, index, {
      ...line,
      productId: patch.nextProductId,
      productName: patch.nextProductName,
      pricePerCase,
      freeProductId: line.adjustmentMode === 'freePcs' && followFree ? patch.nextProductId : line.freeProductId,
      freeProductName:
        line.adjustmentMode === 'freePcs' && followFree ? patch.nextProductName : line.freeProductName,
      lineTotal: computeLineTotal({
        pricePerCase,
        quantityCases: line.quantityCases,
        adjustmentMode: line.adjustmentMode,
        adjustmentValue: line.adjustmentMode === 'freePcs' ? line.freePcs : line.discountAmount,
      }),
    });
  }

  if (patch.field === 'bounced') {
    const bouncedCases = Number.isFinite(patch.bouncedCases) ? patch.bouncedCases : 0;
    const bouncedPcs = Number.isFinite(patch.bouncedPcs) ? patch.bouncedPcs : 0;
    if (bouncedCases < 0 || bouncedPcs < 0 || bouncedCases > line.quantityCases || bouncedPcs > line.quantityPcs) {
      throw new Error('Bounce quantity cannot exceed the order.');
    }
    const next = withLine(order, index, { ...line, bouncedCases, bouncedPcs });
    return { ...next, status: statusAfterBounce(order, next.lines) };
  }

  if (patch.field === 'cases') {
    if (!Number.isFinite(patch.quantityCases) || patch.quantityCases <= 0) {
      throw new Error('Cases must be greater than 0.');
    }
    const quantityCases = patch.quantityCases;
    return withLine(order, index, {
      ...line,
      quantityCases,
      bouncedCases: Math.min(line.bouncedCases, quantityCases),
      lineTotal: computeLineTotal({
        pricePerCase: line.pricePerCase,
        quantityCases,
        adjustmentMode: line.adjustmentMode,
        adjustmentValue: line.adjustmentMode === 'freePcs' ? line.freePcs : line.discountAmount,
      }),
    });
  }

  if (patch.field === 'freePcs') {
    const freePcs = Number.isFinite(patch.freePcs) ? Math.max(0, patch.freePcs) : 0;
    if (freePcs === 0 && line.adjustmentMode !== 'freePcs') return order;
    const freeProductId = patch.freeProductId || line.freeProductId || line.productId;
    const freeProductName =
      patch.freeProductName ||
      (freeProductId === line.productId ? line.productName : line.freeProductName);
    return withLine(order, index, {
      ...line,
      adjustmentMode: 'freePcs',
      freePcs,
      discountAmount: 0,
      freeProductId,
      freeProductName,
      lineTotal: computeLineTotal({
        pricePerCase: line.pricePerCase,
        quantityCases: line.quantityCases,
        adjustmentMode: 'freePcs',
        adjustmentValue: freePcs,
      }),
    });
  }

  const discountAmount = Number.isFinite(patch.discountAmount) ? Math.max(0, patch.discountAmount) : 0;
  if (discountAmount === 0 && line.adjustmentMode !== 'discountAmount') return order;
  return withLine(order, index, {
    ...line,
    adjustmentMode: 'discountAmount',
    discountAmount,
    freePcs: 0,
    freeProductId: '',
    freeProductName: '',
    lineTotal: computeLineTotal({
      pricePerCase: line.pricePerCase,
      quantityCases: line.quantityCases,
      adjustmentMode: 'discountAmount',
      adjustmentValue: discountAmount,
    }),
  });
}
