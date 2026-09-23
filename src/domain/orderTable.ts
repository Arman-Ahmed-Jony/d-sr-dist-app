import type { Order, OrderLine, OrderStatus } from '@/src/domain/types';

export type OrderTableView = 'order' | 'line';

export type OrderTableGroupBy = 'none' | 'shop' | 'sr' | 'status' | 'orderDate' | 'product';

export type OrderTableSortKey =
  | 'shop'
  | 'sr'
  | 'status'
  | 'orderDate'
  | 'deliveryDate'
  | 'money'
  | 'cases'
  | 'product'
  | 'freePcs'
  | 'lineTotal';

export type OrderTableFilters = {
  shopId?: string;
  srId?: string;
  status?: OrderStatus;
  productId?: string;
  orderDateFrom?: Date;
  orderDateTo?: Date;
  deliveryDateFrom?: Date;
  deliveryDateTo?: Date;
};

export type OrderTableRow = {
  id: string;
  order: Order;
  shopId: string;
  shopName: string;
  srId: string;
  srName: string;
  status: OrderStatus;
  orderDate: Date;
  deliveryDate: Date;
  productId?: string;
  productName?: string;
  cases: number;
  quantityPcs: number;
  freePcs: number;
  freeProductName?: string;
  discountAmount: number;
  money: number;
};

export type ProductTotal = {
  productId: string;
  productName: string;
  cases: number;
  freePcs: number;
  money: number;
};

export type OrderTableTotals = {
  orderCount: number;
  cases: number;
  money: number;
  freePcs: number;
  byProduct: ProductTotal[];
};

export type OrderTableGroup<T> = {
  key: string;
  label: string;
  rows: T[];
  totals: OrderTableTotals;
};

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number): Date {
  const next = startOfDay(date);
  next.setDate(next.getDate() + days);
  return next;
}

export type OrderQuickFilter = 'todayDelivery' | 'nextDelivery' | 'todayOrders' | 'previousOrders';

export const ORDER_QUICK_FILTERS: OrderQuickFilter[] = [
  'todayDelivery',
  'nextDelivery',
  'todayOrders',
  'previousOrders',
];

function sameDay(left?: Date, right?: Date): boolean {
  if (!left && !right) return true;
  if (!left || !right) return false;
  return startOfDay(left).getTime() === startOfDay(right).getTime();
}

export function filtersForQuickFilter(
  id: OrderQuickFilter,
  now: Date = new Date(),
): Pick<OrderTableFilters, 'orderDateFrom' | 'orderDateTo' | 'deliveryDateFrom' | 'deliveryDateTo'> {
  const today = startOfDay(now);
  switch (id) {
    case 'todayDelivery':
      return {
        deliveryDateFrom: today,
        deliveryDateTo: today,
        orderDateFrom: undefined,
        orderDateTo: undefined,
      };
    case 'nextDelivery':
      return {
        deliveryDateFrom: addDays(today, 1),
        deliveryDateTo: undefined,
        orderDateFrom: undefined,
        orderDateTo: undefined,
      };
    case 'todayOrders':
      return {
        orderDateFrom: today,
        orderDateTo: today,
        deliveryDateFrom: undefined,
        deliveryDateTo: undefined,
      };
    case 'previousOrders':
      return {
        orderDateFrom: undefined,
        orderDateTo: addDays(today, -1),
        deliveryDateFrom: undefined,
        deliveryDateTo: undefined,
      };
  }
}

export function activeQuickFilter(
  filters: OrderTableFilters,
  now: Date = new Date(),
): OrderQuickFilter | null {
  return (
    ORDER_QUICK_FILTERS.find((id) => {
      const preset = filtersForQuickFilter(id, now);
      return (
        sameDay(filters.orderDateFrom, preset.orderDateFrom) &&
        sameDay(filters.orderDateTo, preset.orderDateTo) &&
        sameDay(filters.deliveryDateFrom, preset.deliveryDateFrom) &&
        sameDay(filters.deliveryDateTo, preset.deliveryDateTo)
      );
    }) ?? null
  );
}

export function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function rollupOrder(order: Order): { cases: number; freePcs: number; money: number } {
  return order.lines.reduce(
    (acc, line) => ({
      cases: acc.cases + (Number.isFinite(line.quantityCases) ? line.quantityCases : 0),
      freePcs: acc.freePcs + (Number.isFinite(line.freePcs) ? line.freePcs : 0),
      money: acc.money + (Number.isFinite(line.lineTotal) ? line.lineTotal : 0),
    }),
    { cases: 0, freePcs: 0, money: 0 },
  );
}

function inDateRange(date: Date, from?: Date, to?: Date): boolean {
  const time = startOfDay(date).getTime();
  if (from && time < startOfDay(from).getTime()) return false;
  if (to && time > startOfDay(to).getTime()) return false;
  return true;
}

function matchesOrderFilters(order: Order, filters: OrderTableFilters): boolean {
  if (filters.shopId && order.shopId !== filters.shopId) return false;
  if (filters.srId && order.srId !== filters.srId) return false;
  if (filters.status && order.status !== filters.status) return false;
  if (!inDateRange(order.orderDate, filters.orderDateFrom, filters.orderDateTo)) return false;
  if (!inDateRange(order.deliveryDate, filters.deliveryDateFrom, filters.deliveryDateTo)) {
    return false;
  }
  if (filters.productId && !order.lines.some((line) => line.productId === filters.productId)) {
    return false;
  }
  return true;
}

export function filterOrders(orders: Order[], filters: OrderTableFilters): Order[] {
  return orders.filter((order) => matchesOrderFilters(order, filters));
}

export function toOrderRows(orders: Order[]): OrderTableRow[] {
  return orders.map((order) => {
    const rollup = rollupOrder(order);
    return {
      id: order.id,
      order,
      shopId: order.shopId,
      shopName: order.shopName,
      srId: order.srId,
      srName: order.srName ?? order.srId,
      status: order.status,
      orderDate: order.orderDate,
      deliveryDate: order.deliveryDate,
      cases: rollup.cases,
      quantityPcs: 0,
      freePcs: rollup.freePcs,
      discountAmount: 0,
      money: rollup.money,
    };
  });
}

export function toLineRows(orders: Order[], productId?: string): OrderTableRow[] {
  const rows: OrderTableRow[] = [];
  for (const order of orders) {
    for (const line of order.lines) {
      if (productId && line.productId !== productId) continue;
      rows.push({
        id: `${order.id}-${line.productId}`,
        order,
        shopId: order.shopId,
        shopName: order.shopName,
        srId: order.srId,
        srName: order.srName ?? order.srId,
        status: order.status,
        orderDate: order.orderDate,
        deliveryDate: order.deliveryDate,
        productId: line.productId,
        productName: line.productName,
        cases: Number.isFinite(line.quantityCases) ? line.quantityCases : 0,
        quantityPcs: Number.isFinite(line.quantityPcs) ? line.quantityPcs : 0,
        freePcs: Number.isFinite(line.freePcs) ? line.freePcs : 0,
        freeProductName: line.freeProductName || undefined,
        discountAmount: Number.isFinite(line.discountAmount) ? line.discountAmount : 0,
        money: Number.isFinite(line.lineTotal) ? line.lineTotal : 0,
      });
    }
  }
  return rows;
}

function compareValues(a: string | number, b: string | number, direction: 'asc' | 'desc'): number {
  const result =
    typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b));
  return direction === 'asc' ? result : -result;
}

function sortValue(row: OrderTableRow, key: OrderTableSortKey): string | number {
  switch (key) {
    case 'shop':
      return row.shopName.toLowerCase();
    case 'sr':
      return row.srName.toLowerCase();
    case 'status':
      return row.status;
    case 'orderDate':
      return row.orderDate.getTime();
    case 'deliveryDate':
      return row.deliveryDate.getTime();
    case 'money':
    case 'lineTotal':
      return row.money;
    case 'cases':
      return row.cases;
    case 'product':
      return (row.productName ?? '').toLowerCase();
    case 'freePcs':
      return row.freePcs;
    default:
      return 0;
  }
}

export function sortRows(
  rows: OrderTableRow[],
  key: OrderTableSortKey,
  direction: 'asc' | 'desc',
): OrderTableRow[] {
  return [...rows].sort((a, b) => compareValues(sortValue(a, key), sortValue(b, key), direction));
}

function productTotalsFromLines(lines: OrderLine[]): ProductTotal[] {
  const map = new Map<string, ProductTotal>();
  for (const line of lines) {
    const existing = map.get(line.productId) ?? {
      productId: line.productId,
      productName: line.productName,
      cases: 0,
      freePcs: 0,
      money: 0,
    };
    existing.cases += Number.isFinite(line.quantityCases) ? line.quantityCases : 0;
    existing.freePcs += Number.isFinite(line.freePcs) ? line.freePcs : 0;
    existing.money += Number.isFinite(line.lineTotal) ? line.lineTotal : 0;
    map.set(line.productId, existing);
  }
  return [...map.values()].sort((a, b) => a.productName.localeCompare(b.productName));
}

export function totalsFromOrders(orders: Order[]): OrderTableTotals {
  const orderIds = new Set(orders.map((order) => order.id));
  const lines = orders.flatMap((order) => order.lines);
  const rollup = lines.reduce(
    (acc, line) => ({
      cases: acc.cases + (Number.isFinite(line.quantityCases) ? line.quantityCases : 0),
      freePcs: acc.freePcs + (Number.isFinite(line.freePcs) ? line.freePcs : 0),
      money: acc.money + (Number.isFinite(line.lineTotal) ? line.lineTotal : 0),
    }),
    { cases: 0, freePcs: 0, money: 0 },
  );
  return {
    orderCount: orderIds.size,
    cases: rollup.cases,
    money: rollup.money,
    freePcs: rollup.freePcs,
    byProduct: productTotalsFromLines(lines),
  };
}

export function totalsFromRows(rows: OrderTableRow[]): OrderTableTotals {
  const orderIds = new Set(rows.map((row) => row.order.id));
  const lines = rows.map((row) => {
    const line: OrderLine = {
      productId: row.productId ?? row.order.lines[0]?.productId ?? '',
      productName: row.productName ?? '',
      pricePerCase: 0,
      quantityCases: row.cases,
      quantityPcs: row.quantityPcs,
      adjustmentMode: 'freePcs',
      discountAmount: row.discountAmount,
      freePcs: row.freePcs,
      freeProductId: '',
      freeProductName: row.freeProductName ?? '',
      lineTotal: row.money,
    };
    return line;
  });

  if (rows.every((row) => !row.productId)) {
    return totalsFromOrders(rows.map((row) => row.order));
  }

  const rollup = rows.reduce(
    (acc, row) => ({
      cases: acc.cases + row.cases,
      freePcs: acc.freePcs + row.freePcs,
      money: acc.money + row.money,
    }),
    { cases: 0, freePcs: 0, money: 0 },
  );

  return {
    orderCount: orderIds.size,
    cases: rollup.cases,
    money: rollup.money,
    freePcs: rollup.freePcs,
    byProduct: productTotalsFromLines(lines.filter((line) => line.productId)),
  };
}

function groupMeta(
  row: OrderTableRow,
  groupBy: OrderTableGroupBy,
): { key: string; label: string } {
  switch (groupBy) {
    case 'shop':
      return { key: row.shopId, label: row.shopName };
    case 'sr':
      return { key: row.srId, label: row.srName };
    case 'status':
      return { key: row.status, label: row.status };
    case 'orderDate':
      return { key: dateKey(row.orderDate), label: row.orderDate.toLocaleDateString() };
    case 'product':
      return {
        key: row.productId ?? 'none',
        label: row.productName ?? '—',
      };
    default:
      return { key: 'all', label: '' };
  }
}

export function groupRows(
  rows: OrderTableRow[],
  groupBy: OrderTableGroupBy,
): OrderTableGroup<OrderTableRow>[] {
  if (groupBy === 'none') {
    return [{ key: 'all', label: '', rows, totals: totalsFromRows(rows) }];
  }

  const buckets = new Map<string, OrderTableGroup<OrderTableRow>>();
  for (const row of rows) {
    const { key, label } = groupMeta(row, groupBy);
    const existing = buckets.get(key);
    if (existing) {
      existing.rows.push(row);
    } else {
      buckets.set(key, { key, label, rows: [row], totals: emptyTotals() });
    }
  }

  const groups = [...buckets.values()].map((group) => ({
    ...group,
    totals: totalsFromRows(group.rows),
  }));
  groups.sort((a, b) => a.label.localeCompare(b.label));
  return groups;
}

function emptyTotals(): OrderTableTotals {
  return { orderCount: 0, cases: 0, money: 0, freePcs: 0, byProduct: [] };
}

export function uniqueShops(orders: Order[]): { id: string; label: string }[] {
  const map = new Map<string, string>();
  for (const order of orders) {
    if (!map.has(order.shopId)) map.set(order.shopId, order.shopName);
  }
  return [...map.entries()]
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function uniqueSrs(orders: Order[]): { id: string; label: string }[] {
  const map = new Map<string, string>();
  for (const order of orders) {
    if (!map.has(order.srId)) map.set(order.srId, order.srName ?? order.srId);
  }
  return [...map.entries()]
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function uniqueProducts(orders: Order[]): { id: string; label: string }[] {
  const map = new Map<string, string>();
  for (const order of orders) {
    for (const line of order.lines) {
      if (!map.has(line.productId)) map.set(line.productId, line.productName);
    }
  }
  return [...map.entries()]
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
