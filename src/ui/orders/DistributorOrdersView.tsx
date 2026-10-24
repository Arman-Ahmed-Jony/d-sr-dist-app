import { type ComponentProps, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Chip, Menu, Modal, Portal, Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { assignOrderDsr, patchOrderCell, setOrderStatus } from '@/src/data/repos/ordersRepo';
import { listDsrsByDistributor } from '@/src/data/repos/usersRepo';
import type { AppUser, Order, OrderStatus } from '@/src/domain/types';
import { statusLabel } from '@/src/ui/StatusChip';
import { invoiceLineCount } from '@/src/domain/orderSheet';
import { shareInvoice } from '@/src/services/shareInvoice';
import type { OrderCellPatch } from '@/src/domain/orderCell';
import { OrderCellDialog, type OrderCellTarget } from '@/src/ui/orders/OrderCellDialog';
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
import { InvoiceExportSheet } from '@/src/ui/orders/InvoiceExportSheet';
import { OrderDataTable } from '@/src/ui/orders/OrderDataTable';
import { OrderTotalsBar } from '@/src/ui/orders/OrderTotalsBar';
import { groupByLabel, OrderTableCriteriaSheet } from '@/src/ui/orders/OrderTableCriteriaSheet';
import { colors, spacing } from '@/src/theme/tokens';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

type Props = {
  orders: Order[];
  distributorId?: string;
  onDraftDeleted?: () => void;
  canManage?: boolean;
};

type ExtraChip = {
  id: string;
  label: string;
  onClear: () => void;
};

const BULK_STATUSES: OrderStatus[] = ['submitted', 'confirmed', 'cancelled', 'delivered', 'bounced'];

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

function sameOrderContent(left: Order, right: Order): boolean {
  if (left.status !== right.status || left.orderTotal !== right.orderTotal) return false;
  if (left.orderDate.getTime() !== right.orderDate.getTime()) return false;
  if (left.deliveryDate.getTime() !== right.deliveryDate.getTime()) return false;
  if (left.lines.length !== right.lines.length) return false;
  return left.lines.every((line, index) => {
    const other = right.lines[index];
    return (
      line.productId === other.productId &&
      line.quantityCases === other.quantityCases &&
      line.freePcs === other.freePcs &&
      line.discountAmount === other.discountAmount &&
      line.adjustmentMode === other.adjustmentMode &&
      line.lineTotal === other.lineTotal &&
      line.freeProductId === other.freeProductId &&
      line.bouncedCases === other.bouncedCases
    );
  });
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

export function DistributorOrdersView({ orders, distributorId, onDraftDeleted, canManage = true }: Props) {
  const { t } = useTranslation();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [groupMenuOpen, setGroupMenuOpen] = useState(false);
  const [view, setView] = useState<OrderTableView>('line');
  const [filters, setFilters] = useState<OrderTableFilters>(() => filtersForQuickFilter('todayOrders'));
  const [sortKey, setSortKey] = useState<OrderTableSortKey>('orderDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [groupBy, setGroupBy] = useState<OrderTableGroupBy>('shop');
  const [dsrs, setDsrs] = useState<AppUser[]>([]);
  const [assignTarget, setAssignTarget] = useState<Order | null>(null);
  const [bulkAssign, setBulkAssign] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statusOverrides, setStatusOverrides] = useState<Record<string, Pick<Order, 'status' | 'lines'>>>({});
  const [assigning, setAssigning] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [assigned, setAssigned] = useState<Record<string, { id: string; name: string }>>({});
  const [exporting, setExporting] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [cellTarget, setCellTarget] = useState<OrderCellTarget | null>(null);
  const [cellSaving, setCellSaving] = useState(false);
  const [cellError, setCellError] = useState<string | null>(null);
  const [orderEdits, setOrderEdits] = useState<Record<string, Order>>({});

  useEffect(() => {
    if (!canManage || !distributorId) return;
    void listDsrsByDistributor(distributorId)
      .then((rows) => {
        rows.sort((a, b) => a.name.localeCompare(b.name));
        setDsrs(rows.filter((row) => row.active));
      })
      .catch((error) => {
        console.error('listDsrsByDistributor failed', error);
      });
  }, [canManage, distributorId]);

  const displayOrders = useMemo(
    () =>
      orders.map((order) => {
        const edited = orderEdits[order.id];
        if (edited && !sameOrderContent(order, edited)) return edited;
        const patch = statusOverrides[order.id];
        if (!patch || order.status === patch.status) return order;
        return { ...order, status: patch.status, lines: patch.lines };
      }),
    [orders, orderEdits, statusOverrides],
  );

  const shops = useMemo(() => uniqueShops(displayOrders), [displayOrders]);
  const srs = useMemo(() => uniqueSrs(displayOrders), [displayOrders]);
  const products = useMemo(() => uniqueProducts(displayOrders), [displayOrders]);

  const filteredOrders = useMemo(() => filterOrders(displayOrders, filters), [displayOrders, filters]);

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
  const exportSelection = filters.productId ? { productIds: new Set([filters.productId]) } : undefined;
  const canExport = invoiceLineCount(filteredOrders, exportSelection) > 0;
  const exportShops = useMemo(() => uniqueShops(filteredOrders), [filteredOrders]);
  const exportProducts = useMemo(() => {
    const rows = uniqueProducts(filteredOrders);
    if (!filters.productId) return rows;
    return rows.filter((product) => product.id === filters.productId);
  }, [filteredOrders, filters.productId]);

  const visibleIds = useMemo(() => [...new Set(filteredOrders.map((order) => order.id))], [filteredOrders]);
  const selectedVisible = visibleIds.filter((id) => selectedIds.has(id));
  const selectAll =
    selectedVisible.length === 0
      ? 'unchecked'
      : selectedVisible.length === visibleIds.length
        ? 'checked'
        : 'indeterminate';

  const toggleOrder = (order: Order) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(order.id)) next.delete(order.id);
      else next.add(order.id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      const allOn = visibleIds.every((id) => next.has(id));
      for (const id of visibleIds) {
        if (allOn) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  };

  const selectedOrders = filteredOrders.filter((order) => selectedIds.has(order.id));
  const assignOrders = assignTarget ? [assignTarget] : bulkAssign ? selectedOrders : [];

  const onPickDsr = async (dsr: AppUser | null) => {
    if (assignOrders.length === 0 || assigning) return;
    setAssigning(true);
    setBulkError(null);
    const nextAssigned = { ...assigned };
    let failed = 0;
    for (const order of assignOrders) {
      try {
        await assignOrderDsr(order.id, dsr?.id ?? '', dsr?.name ?? '');
        nextAssigned[order.id] = { id: dsr?.id ?? '', name: dsr?.name ?? '' };
      } catch (error) {
        failed += 1;
        console.error('assignOrderDsr failed', error);
      }
    }
    setAssigned(nextAssigned);
    if (failed > 0) setBulkError(t('errorBulkUpdate'));
    else if (bulkAssign) setSelectedIds(new Set());
    setAssignTarget(null);
    setBulkAssign(false);
    setAssigning(false);
  };

  const onPickStatus = async (status: OrderStatus) => {
    if (selectedOrders.length === 0 || assigning) return;
    setAssigning(true);
    setBulkError(null);
    const nextOverrides = { ...statusOverrides };
    let failed = 0;
    for (const order of selectedOrders) {
      try {
        const updated = await setOrderStatus(order, status);
        nextOverrides[order.id] = { status: updated.status, lines: updated.lines };
      } catch (error) {
        failed += 1;
        console.error('setOrderStatus failed', error);
      }
    }
    setStatusOverrides(nextOverrides);
    if (failed > 0) setBulkError(t('errorBulkUpdate'));
    else setSelectedIds(new Set());
    setStatusOpen(false);
    setAssigning(false);
  };

  const onDownloadInvoice = async (shopIds: Set<string>, productIds: Set<string>) => {
    if (exporting) return;
    setExporting(true);
    setExportError(null);
    try {
      await shareInvoice(filteredOrders, { shopIds, productIds });
      setExportOpen(false);
    } catch (error) {
      console.error('shareInvoice failed', error);
      setExportError(t('errorExportInvoice'));
    } finally {
      setExporting(false);
    }
  };

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

      <Pressable
        onPress={() => setExportOpen(true)}
        disabled={!canExport || exporting}
        style={[styles.download, (!canExport || exporting) && styles.downloadDisabled]}
        accessibilityRole="button"
        accessibilityState={{ disabled: !canExport || exporting }}
      >
        <MaterialCommunityIcons
          name="file-excel-outline"
          size={18}
          color={!canExport || exporting ? colors.textMuted : colors.primary}
        />
        <Text
          variant="bodyMedium"
          style={[styles.downloadLabel, (!canExport || exporting) && styles.downloadLabelDisabled]}
        >
          {exporting ? t('loading') : t('downloadExcel')}
        </Text>
      </Pressable>
      {exportError ? (
        <Text variant="bodySmall" style={styles.exportError}>
          {exportError}
        </Text>
      ) : null}
      <InvoiceExportSheet
        visible={exportOpen}
        shops={exportShops}
        products={exportProducts}
        exporting={exporting}
        onClose={() => {
          if (!exporting) setExportOpen(false);
        }}
        onDownload={(shopIds, productIds) => {
          void onDownloadInvoice(shopIds, productIds);
        }}
      />

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
      {canManage && selectedVisible.length > 0 ? (
        <View style={styles.bulkBar}>
          <Text variant="labelLarge">{t('selectedCount', { count: selectedVisible.length })}</Text>
          <Pressable
            onPress={() => setBulkAssign(true)}
            disabled={assigning}
            style={styles.bulkAction}
            accessibilityRole="button"
          >
            <Text style={styles.bulkActionLabel}>{t('assignDsr')}</Text>
          </Pressable>
          <Pressable
            onPress={() => setStatusOpen(true)}
            disabled={assigning}
            style={styles.bulkAction}
            accessibilityRole="button"
          >
            <Text style={styles.bulkActionLabel}>{t('changeStatus')}</Text>
          </Pressable>
          <Pressable onPress={() => setSelectedIds(new Set())} accessibilityRole="button">
            <Text style={styles.bulkClear}>{t('clearSelection')}</Text>
          </Pressable>
        </View>
      ) : null}
      {bulkError ? <Text style={styles.exportError}>{bulkError}</Text> : null}
      {rows.length === 0 ? (
        <Text variant="bodyMedium" style={styles.empty}>
          {t('emptyOrderTable')}
        </Text>
      ) : (
        <>
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
          dsrLabel={(order) => {
            const overlay = assigned[order.id];
            if (overlay) return overlay.name || t('unassigned');
            return order.dsrName || t('unassigned');
          }}
          onAssignDsr={canManage ? setAssignTarget : undefined}
          selectedIds={canManage ? selectedIds : undefined}
          selectAll={selectAll}
          onToggleOrder={canManage ? toggleOrder : undefined}
          onToggleAll={canManage ? toggleAll : undefined}
          onEditCell={(row, field) => {
            setCellError(null);
            setCellTarget({
              order: row.order,
              productId: row.productId ?? (row.order.lines.length === 1 ? row.order.lines[0]?.productId : undefined),
              field,
            });
          }}
        />
        <OrderCellDialog
          target={cellTarget}
          distributorId={distributorId}
          saving={cellSaving}
          error={cellError}
          onDismiss={() => {
            if (!cellSaving) setCellTarget(null);
          }}
          onSave={(patch: OrderCellPatch) => {
            if (!cellTarget) return;
            setCellSaving(true);
            setCellError(null);
            void patchOrderCell(cellTarget.order, patch)
              .then((next) => {
                setOrderEdits((current) => ({ ...current, [next.id]: next }));
                setCellTarget(null);
              })
              .catch((error) => {
                console.error('patchOrderCell failed', error);
                setCellError(t('errorUpdateOrder'));
              })
              .finally(() => setCellSaving(false));
          }}
        />
        <Portal>
          <Modal
            visible={assignOrders.length > 0}
            onDismiss={() => {
              if (!assigning) {
                setAssignTarget(null);
                setBulkAssign(false);
              }
            }}
            contentContainerStyle={styles.assignSheet}
          >
            <Text variant="titleMedium">{t('assignDsr')}</Text>
            <Text variant="bodySmall" style={styles.assignShop}>
              {assignTarget ? assignTarget.shopName : t('selectedCount', { count: assignOrders.length })}
            </Text>
            <Pressable
              onPress={() => void onPickDsr(null)}
              disabled={assigning}
              style={styles.assignRow}
            >
              <Text>{t('unassigned')}</Text>
            </Pressable>
            {dsrs.map((dsr) => (
              <Pressable
                key={dsr.id}
                onPress={() => void onPickDsr(dsr)}
                disabled={assigning}
                style={styles.assignRow}
              >
                <Text>{dsr.name}</Text>
              </Pressable>
            ))}
          </Modal>
          <Modal
            visible={statusOpen}
            onDismiss={() => {
              if (!assigning) setStatusOpen(false);
            }}
            contentContainerStyle={styles.assignSheet}
          >
            <Text variant="titleMedium">{t('changeStatus')}</Text>
            <Text variant="bodySmall" style={styles.assignShop}>
              {t('selectedCount', { count: selectedVisible.length })}
            </Text>
            {BULK_STATUSES.map((status) => (
              <Pressable
                key={status}
                onPress={() => void onPickStatus(status)}
                disabled={assigning}
                style={styles.assignRow}
              >
                <Text>{statusLabel(status, t)}</Text>
              </Pressable>
            ))}
          </Modal>
        </Portal>
        </>
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
  download: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 14,
    backgroundColor: colors.surface,
  },
  downloadDisabled: {
    borderColor: colors.border,
  },
  downloadLabel: {
    color: colors.primary,
    fontWeight: '600',
  },
  downloadLabelDisabled: {
    color: colors.textMuted,
  },
  exportError: {
    color: colors.danger,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  assignSheet: {
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    borderRadius: 16,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  assignShop: { color: colors.textMuted, marginBottom: spacing.sm },
  assignRow: {
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  bulkBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  bulkAction: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  bulkActionLabel: {
    color: colors.white,
    fontWeight: '600',
  },
  bulkClear: {
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
