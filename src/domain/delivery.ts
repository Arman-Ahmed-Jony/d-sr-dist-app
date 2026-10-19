import type { Order, OrderLine, OrderStatus } from '@/src/domain/types';

export type DeliveryResult = 'delivered' | 'cancelled' | 'bounced' | 'partial';

export type BounceInput = {
  productId: string;
  bouncedCases: number;
  bouncedPcs: number;
};

function zeroBounce(line: OrderLine): OrderLine {
  return { ...line, bouncedCases: 0, bouncedPcs: 0 };
}

export function linesForDelivery(
  order: Order,
  result: DeliveryResult,
  partial: BounceInput[] = [],
): OrderLine[] {
  if (result === 'delivered' || result === 'cancelled') {
    return order.lines.map(zeroBounce);
  }
  if (result === 'bounced') {
    return order.lines.map((line) => ({
      ...line,
      bouncedCases: line.quantityCases,
      bouncedPcs: line.quantityPcs,
    }));
  }

  const byProduct = new Map(partial.map((row) => [row.productId, row]));
  let any = false;
  const lines = order.lines.map((line) => {
    const hit = byProduct.get(line.productId);
    const bouncedCases = hit?.bouncedCases ?? 0;
    const bouncedPcs = hit?.bouncedPcs ?? 0;
    if (!Number.isFinite(bouncedCases) || !Number.isFinite(bouncedPcs)) {
      throw new Error('Bounce quantity must be a number.');
    }
    if (bouncedCases < 0 || bouncedPcs < 0) {
      throw new Error('Bounce quantity cannot be negative.');
    }
    if (bouncedCases > line.quantityCases || bouncedPcs > line.quantityPcs) {
      throw new Error('Bounce quantity cannot exceed the order.');
    }
    if (bouncedCases > 0 || bouncedPcs > 0) any = true;
    return { ...line, bouncedCases, bouncedPcs };
  });
  if (!any) throw new Error('Enter a bounce quantity for at least one product.');
  return lines;
}

export function deliveryStatus(result: DeliveryResult): OrderStatus {
  return result;
}
