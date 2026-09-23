import { type ComponentProps, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Chip, Menu, Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import type { Order } from '@/src/domain/types';
import {
  activeQuickFilter,
  filterOrders,
  filtersForQuickFilter,
  groupRows,
  ORDER_QUICK_FILTERS,
  sortRows,
  toLineRows,
  toOrderRows,
  totalsFromOrders,
  totalsFromRows,
  uniqueProducts,
  uniqueShops,
  uniqueSrs,
  type OrderQuickFilter,
  type OrderTableFilters,
  type OrderTableGroupBy,
  type OrderTableSortKey,
  type OrderTableView,
} from '@/src/domain/orderTable';
import { OrderDataTable } from '@/src/ui/orders/OrderDataTable';
import { OrderTotalsBar } from '@/src/ui/orders/OrderTotalsBar';
import { groupByLabel, OrderTableCriteriaSheet } from '@/src/ui/orders/OrderTableCriteriaSheet';
import { colors, spacing } from '@/src/theme/tokens';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

type Props = {
  orders: Order[];
  distributorId?: string;
  onDraftDeleted?: () => void;
};

type ExtraChip = {
  id: string;
  label: string;
  onClear: () => void;
};

const QUICK_FILTER_ICONS: Record<OrderQuickFilter, IconName> = {
  todayDelivery: 'truck-outline',
  nextDelivery: 'truck-outline',
  todayOrders: 'clipboard-text-outline',
  previousOrders: 'clock-outline',
};

function formatDate(date: Date): string {
  return date.toLocaleDateString();
}

function formatAmount(value: number): string {
  return Number.isInteger(value)
    ? value.toLocaleString('en-US')
    : value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function quickFilterLabel(id: OrderQuickFilter, t: (key: string) => string): string {
  switch (id) {
    case 'todayDelivery':
      return t('quickTodayDelivery');
    case 'nextDelivery':
      return t('quickNextDelivery');
    case 'todayOrders':
      return t('quickTodayOrders');
    case 'previousOrders':
      return t('quickPreviousOrders');
  }
}

function formatDateRange(from?: Date, to?: Date): string {
  if (from && to) return `${formatDate(from)} – ${formatDate(to)}`;
  if (from) return `${formatDate(from)} →`;
  if (to) return `→ ${formatDate(to)}`;
  return '';
}

function extraFilterCount(filters: OrderTableFilters, quick: OrderQuickFilter | null): number {
  let count = 0;
  if (filters.shopId) count += 1;
  if (filters.srId) count += 1;
  if (filters.productId) count += 1;
  if (filters.status) count += 1;
  if (!quick) {
    if (filters.orderDateFrom || filters.orderDateTo) count += 1;
    if (filters.deliveryDateFrom || filters.deliveryDateTo) count += 1;
  }
  return count;
}

export function DistributorOrdersView({ orders, distributorId, onDraftDeleted }: Props) {
  const { t } = useTranslation();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [groupMenuOpen, setGroupMenuOpen] = useState(false);
  const [view, setView] = useState<OrderTableView>('line');
  const [filters, setFilters] = useState<OrderTableFilters>({});
  const [sortKey, setSortKey] = useState<OrderTableSortKey>('orderDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [groupBy, setGroupBy] = useState<OrderTableGroupBy>('shop');

  const shops = useMemo(() => uniqueShops(orders), [orders]);
  const srs = useMemo(() => uniqueSrs(orders), [orders]);
  const products = useMemo(() => uniqueProducts(orders), [orders]);

  const filteredOrders = useMemo(() => filterOrders(orders, filters), [orders, filters]);

  const rows = useMemo(() => {
    const base =
      view === 'order' ? toOrderRows(filteredOrders) : toLineRows(filteredOrders, filters.productId);
    return sortRows(base, sortKey, sortDirection);
  }, [filteredOrders, filters.productId, view, sortKey, sortDirection]);

  const effectiveGroupBy: OrderTableGroupBy =
    view === 'order' && groupBy === 'product' ? 'none' : groupBy;

  const groups = useMemo(() => groupRows(rows, effectiveGroupBy), [rows, effectiveGroupBy]);

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

  const selectedQuickFilter = activeQuickFilter(filters);

  const applyQuickFilter = (id: OrderQuickFilter) => {
    if (selectedQuickFilter === id) {
      patchFilter({
        orderDateFrom: undefined,
        orderDateTo: undefined,
        deliveryDateFrom: undefined,
        deliveryDateTo: undefined,
      });
      return;
    }
    patchFilter(filtersForQuickFilter(id));
  };

  const resetExtraFilters = () => {
    setFilters((current) => ({
      orderDateFrom: current.orderDateFrom,
      orderDateTo: current.orderDateTo,
      deliveryDateFrom: current.deliveryDateFrom,
      deliveryDateTo: current.deliveryDateTo,
    }));
  };

  const extraCount = extraFilterCount(filters, selectedQuickFilter);

  const extraChips: ExtraChip[] = [];
  if (selectedShop) {
    extraChips.push({
      id: 'shop',
      label: `${t('shop')}: ${selectedShop.label}`,
      onClear: () => patchFilter({ shopId: undefined }),
    });
  }
  if (selectedSr) {
    extraChips.push({
      id: 'sr',
      label: `${t('srName')}: ${selectedSr.label}`,
      onClear: () => patchFilter({ srId: undefined }),
    });
  }
  if (selectedProduct) {
    extraChips.push({
      id: 'product',
      label: `${t('products')}: ${selectedProduct.label}`,
      onClear: () => patchFilter({ productId: undefined }),
    });
  }
  if (filters.status) {
    extraChips.push({
      id: 'status',
      label: `${t('status')}: ${filters.status}`,
      onClear: () => patchFilter({ status: undefined }),
    });
  }
  if (!selectedQuickFilter && (filters.orderDateFrom || filters.orderDateTo)) {
    extraChips.push({
      id: 'orderDate',
      label: `${t('orderDate')}: ${formatDateRange(filters.orderDateFrom, filters.orderDateTo)}`,
      onClear: () => patchFilter({ orderDateFrom: undefined, orderDateTo: undefined }),
    });
  }
  if (!selectedQuickFilter && (filters.deliveryDateFrom || filters.deliveryDateTo)) {
    extraChips.push({
      id: 'deliveryDate',
      label: `${t('deliveryDate')}: ${formatDateRange(filters.deliveryDateFrom, filters.deliveryDateTo)}`,
      onClear: () => patchFilter({ deliveryDateFrom: undefined, deliveryDateTo: undefined }),
    });
  }

  const groupKeys: OrderTableGroupBy[] =
    view === 'order'
      ? ['none', 'shop', 'sr', 'status', 'orderDate']
      : ['none', 'shop', 'sr', 'status', 'orderDate', 'product'];

  const viewLabel = view === 'line' ? t('viewLines') : t('viewOrders');
  const groupLabel = groupByLabel(effectiveGroupBy, t);

  return (
    <View style={styles.wrap}>
      <Text variant="labelLarge" style={styles.sectionLabel}>
        {t('quickFilters')}
      </Text>
      <View style={styles.quickRow}>
        {ORDER_QUICK_FILTERS.map((id) => {
          const selected = selectedQuickFilter === id;
          return (
            <Pressable
              key={id}
              onPress={() => applyQuickFilter(id)}
              style={[styles.quickItem, selected && styles.quickItemSelected]}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <View style={[styles.quickIcon, selected && styles.quickIconSelected]}>
                <MaterialCommunityIcons
                  name={QUICK_FILTER_ICONS[id]}
                  size={18}
                  color={selected ? colors.white : colors.textMuted}
                />
              </View>
              <Text
                variant="labelSmall"
                numberOfLines={2}
                style={[styles.quickLabel, selected && styles.quickLabelSelected]}
              >
                {quickFilterLabel(id, t)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.controls}>
        <View style={styles.controlSlot}>
          <Pressable
            onPress={() => setSheetOpen(true)}
            style={[styles.control, styles.filterControl]}
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="filter-outline" size={18} color={colors.textMuted} />
            <Text variant="bodyMedium" style={styles.controlValue} numberOfLines={1}>
              {t('tableFilters')}
            </Text>
            <Text variant="bodyMedium" style={styles.filterCount}>
              {extraCount}
            </Text>
          </Pressable>
        </View>

        <View style={styles.controlSlot}>
          <Menu
            visible={viewMenuOpen}
            onDismiss={() => setViewMenuOpen(false)}
            anchor={
              <Pressable
                onPress={() => setViewMenuOpen(true)}
                style={styles.control}
                accessibilityRole="button"
              >
                <Text variant="labelSmall" style={styles.controlFloating}>
                  {t('viewMode')}
                </Text>
                <Text variant="bodyMedium" style={styles.controlValue} numberOfLines={1}>
                  {viewLabel}
                </Text>
                <MaterialCommunityIcons name="chevron-down" size={18} color={colors.textMuted} />
              </Pressable>
            }
          >
            <Menu.Item
              onPress={() => {
                onViewChange('line');
                setViewMenuOpen(false);
              }}
              title={t('viewLines')}
            />
            <Menu.Item
              onPress={() => {
                onViewChange('order');
                setViewMenuOpen(false);
              }}
              title={t('viewOrders')}
            />
          </Menu>
        </View>

        <View style={styles.controlSlot}>
          <Menu
            visible={groupMenuOpen}
            onDismiss={() => setGroupMenuOpen(false)}
            anchor={
              <Pressable
                onPress={() => setGroupMenuOpen(true)}
                style={styles.control}
                accessibilityRole="button"
              >
                <Text variant="labelSmall" style={styles.controlFloating}>
                  {t('groupBy')}
                </Text>
                <Text variant="bodyMedium" style={styles.controlValue} numberOfLines={1}>
                  {groupLabel}
                </Text>
                <MaterialCommunityIcons name="chevron-down" size={18} color={colors.textMuted} />
              </Pressable>
            }
          >
            {groupKeys.map((key) => (
              <Menu.Item
                key={key}
                onPress={() => {
                  setGroupBy(key);
                  setGroupMenuOpen(false);
                }}
                title={groupByLabel(key, t)}
              />
            ))}
          </Menu>
        </View>
      </View>

      {selectedQuickFilter ? (
        <View style={styles.summary}>
          <View style={styles.summaryIcon}>
            <MaterialCommunityIcons
              name={QUICK_FILTER_ICONS[selectedQuickFilter]}
              size={18}
              color={colors.white}
            />
          </View>
          <View style={styles.summaryCopy}>
            <Text variant="titleMedium" style={styles.summaryTitle}>
              {quickFilterLabel(selectedQuickFilter, t)}
            </Text>
            <Text variant="bodySmall" style={styles.summaryMeta}>
              {`${formatAmount(totals.orderCount)} ${t('totalOrders')} · ${formatAmount(totals.cases)} ${t('totalCases')} · ৳${formatAmount(totals.money)}`}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={colors.primary} />
        </View>
      ) : null}

      {extraChips.length > 0 ? (
        <View style={styles.chipRow}>
          {extraChips.map((chip) => (
            <Chip key={chip.id} onClose={chip.onClear} compact>
              {chip.label}
            </Chip>
          ))}
          <Chip onPress={resetExtraFilters} compact>
            {t('clearFilters')}
          </Chip>
        </View>
      ) : null}

      <OrderTableCriteriaSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        filters={filters}
        onFiltersChange={patchFilter}
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
  sectionLabel: {
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  quickRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  quickItem: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: 6,
    borderRadius: 999,
  },
  quickItemSelected: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
  },
  quickIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickIconSelected: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  quickLabel: {
    flex: 1,
    color: colors.textMuted,
    lineHeight: 16,
  },
  quickLabelSelected: {
    color: colors.white,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  controlSlot: { flex: 1, minWidth: 0 },
  control: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.surface,
    width: '100%',
  },
  filterControl: {
    paddingVertical: 12,
  },
  controlFloating: {
    position: 'absolute',
    top: -8,
    left: 12,
    paddingHorizontal: 4,
    backgroundColor: colors.background,
    color: colors.textMuted,
    fontSize: 11,
  },
  controlValue: {
    flex: 1,
    color: colors.text,
  },
  filterCount: {
    color: colors.textMuted,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 18,
    backgroundColor: '#E7F4EC',
    minHeight: 56,
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  summaryCopy: { flex: 1 },
  summaryTitle: { color: colors.primary, fontWeight: '700' },
  summaryMeta: { color: colors.textMuted, marginTop: 2 },
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
