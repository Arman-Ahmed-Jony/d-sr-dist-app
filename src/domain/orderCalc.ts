import type { LineAdjustmentMode, OrderLine } from './types';

export function computeLineTotal(input: {
  pricePerCase: number;
  quantityCases: number;
  adjustmentMode: LineAdjustmentMode;
  adjustmentValue: number;
}): number {
  const price = Number.isFinite(input.pricePerCase) ? input.pricePerCase : 0;
  const cases = Number.isFinite(input.quantityCases) ? input.quantityCases : 0;
  const value = Number.isFinite(input.adjustmentValue) ? input.adjustmentValue : 0;
  const discount = input.adjustmentMode === 'discountAmount' ? Math.max(0, value) : 0;
  return Math.max(0, price * cases - discount);
}

export function computeOrderTotal(lines: Pick<OrderLine, 'lineTotal'>[]): number {
  return lines.reduce((sum, line) => sum + (Number.isFinite(line.lineTotal) ? line.lineTotal : 0), 0);
}
