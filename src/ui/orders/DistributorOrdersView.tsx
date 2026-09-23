import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Chip, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import type { Order } from '@/src/domain/types';
import {
  filterOrders,
  groupRows,
  sortRows,
  toLineRows,
  toOrderRows,
  totalsFromOrders,
  totalsFromRows,
  uniqueProducts,
  uniqueShops,
  uniqueSrs,
  type OrderTableFilters,
  type OrderTableGroupBy,
  type OrderTableSortKey,
  type OrderTableView,
} from '@/src/domain/orderTable';
import { AppButton } from '@/src/ui/Form';
import { OrderDataTable } from '@/src/ui/orders/OrderDataTable';
import { OrderTotalsBar } from '@/src/ui/orders/OrderTotalsBar';
import { groupByLabel, OrderTableCriteriaSheet } from '@/src/ui/orders/OrderTableCriteriaSheet';
import { colors, spacing } from '@/src/theme/tokens';

type Props = {
  orders: Order[];
  distributorId?: string;
  onDraftDeleted?: () => void;
};

type SummaryChip = {
  id: string;
  label: string;
  onClear: () => void;
};

function formatDate(date: Date): string {
  return date.toLocaleDateString();
}

function formatDateRange(from?: Date, to?: Date): string {
  if (from && to) return `${formatDate(from)} – ${formatDate(to)}`;
  if (from) return `${formatDate(from)} →`;
  if (to) return `→ ${formatDate(to)}`;
  return '';
}

export function DistributorOrdersView({ orders, distributorId, onDraftDeleted }: Props) {
  const { t } = useTranslation();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [view, setView] = useState<OrderTableView>('order');
  const [filters, setFilters] = useState<OrderTableFilters>({});
  const [sortKey, setSortKey] = useState<OrderTableSortKey>('orderDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [groupBy, setGroupBy] = useState<OrderTableGroupBy>('none');

  const shops = useMemo(() => uniqueShops(orders), [orders]);
  const srs = useMemo(() => uniqueSrs(orders), [orders]);
  const products = useMemo(() => uniqueProducts(orders), [orders]);

  const filteredOrders = useMemo(() => filterOrders(orders, filters), [orders, filters]);

  const rows = useMemo(() => {
    const base =
      view === 'order' ? toOrderRows(filteredOrders) : toLineRows(filteredOrders, filters.productId);
    return sortRows(base, sortKey, sortDirection);
  }, [filteredOrders, filters.productId, view, sortKey, sortDirection]);

  const groups = useMemo(() => {
    const allowed = view === 'line' ? groupBy : groupBy === 'product' ? 'none' : groupBy;
    return groupRows(rows, allowed);
  }, [rows, groupBy, view]);

  const totals = useMemo(
    () => (view === 'order' ? totalsFromOrders(filteredOrders) : totalsFromRows(rows)),
    [view, filteredOrders, rows],
  );

  const selectedShop = shops.find((shop) => shop.id === filters.shopId);
  const selectedSr = srs.find((sr) => sr.id === filters.srId);
  const selectedProduct = products.find((product) => product.id === filters.productId);

  const patchFilter = (patch: OrderTableFilters) => {
    setFilters((current) => ({ ...current, ...patch }));
  };

  const onViewChange = (next: OrderTableView) => {
    setView(next);
    if (next === 'order') {
      if (groupBy === 'product') setGroupBy('none');
      if (sortKey === 'product' || sortKey === 'freePcs' || sortKey === 'lineTotal') {
        setSortKey('orderDate');
      }
    }
  };

  const resetAll = () => {
    setView('order');
    setFilters({});
    setSortKey('orderDate');
    setSortDirection('desc');
    setGroupBy('none');
  };

  const chips: SummaryChip[] = [];
  if (view === 'line') {
    chips.push({
      id: 'view',
      label: `${t('viewMode')}: ${t('viewLines')}`,
      onClear: () => onViewChange('order'),
    });
  }
  if (selectedShop) {
    chips.push({
      id: 'shop',
      label: `${t('shop')}: ${selectedShop.label}`,
      onClear: () => patchFilter({ shopId: undefined }),
    });
  }
  if (selectedSr) {
    chips.push({
      id: 'sr',
      label: `${t('srName')}: ${selectedSr.label}`,
      onClear: () => patchFilter({ srId: undefined }),
    });
  }
  if (selectedProduct) {
    chips.push({
      id: 'product',
      label: `${t('products')}: ${selectedProduct.label}`,
      onClear: () => patchFilter({ productId: undefined }),
    });
  }
  if (filters.status) {
    chips.push({
      id: 'status',
      label: `${t('status')}: ${filters.status}`,
      onClear: () => patchFilter({ status: undefined }),
    });
  }
  if (filters.orderDateFrom || filters.orderDateTo) {
    chips.push({
      id: 'orderDate',
      label: `${t('orderDate')}: ${formatDateRange(filters.orderDateFrom, filters.orderDateTo)}`,
      onClear: () => patchFilter({ orderDateFrom: undefined, orderDateTo: undefined }),
    });
  }
  if (filters.deliveryDateFrom || filters.deliveryDateTo) {
    chips.push({
      id: 'deliveryDate',
      label: `${t('deliveryDate')}: ${formatDateRange(filters.deliveryDateFrom, filters.deliveryDateTo)}`,
      onClear: () => patchFilter({ deliveryDateFrom: undefined, deliveryDateTo: undefined }),
    });
  }
  if (groupBy !== 'none' && !(view === 'order' && groupBy === 'product')) {
    chips.push({
      id: 'group',
      label: `${t('groupBy')}: ${groupByLabel(groupBy, t)}`,
      onClear: () => setGroupBy('none'),
    });
  }

  return (
    <View style={styles.wrap}>
      <AppButton
        title={t('tableFilters')}
        variant="ghost"
        onPress={() => setSheetOpen(true)}
        style={styles.filterBtn}
      />

      {chips.length > 0 ? (
        <View style={styles.chipRow}>
          {chips.map((chip) => (
            <Chip
              key={chip.id}
              onPress={() => setSheetOpen(true)}
              onClose={chip.onClear}
              compact
            >
              {chip.label}
            </Chip>
          ))}
          <Chip onPress={resetAll} compact>
            {t('clearFilters')}
          </Chip>
        </View>
      ) : null}

      <OrderTableCriteriaSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        view={view}
        onViewChange={onViewChange}
        filters={filters}
        onFiltersChange={patchFilter}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
        shops={shops}
        srs={srs}
        products={products}
      />

      <OrderTotalsBar totals={totals} />
      {rows.length === 0 ? (
        <Text variant="bodyMedium" style={styles.empty}>
          {t('emptyOrderTable')}
        </Text>
      ) : (
        <OrderDataTable
          view={view}
          groups={groups}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSort={(key) => {
            if (key === sortKey) {
              setSortDirection((current) => (current === 'desc' ? 'asc' : 'desc'));
              return;
            }
            setSortKey(key);
            setSortDirection('desc');
          }}
          distributorId={distributorId}
          onDraftDeleted={onDraftDeleted}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'stretch' },
  filterBtn: { marginBottom: spacing.sm, alignSelf: 'flex-start' },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  empty: {
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
});
