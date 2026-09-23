import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { StatusChip } from '@/src/ui/StatusChip';
import { DeleteDraftOrderButton } from '@/src/ui/orders/DeleteDraftOrderButton';
import type {
  OrderTableGroup,
  OrderTableRow,
  OrderTableView,
} from '@/src/domain/orderTable';
import { colors, radii, spacing } from '@/src/theme/tokens';

type Column = {
  key: string;
  label: string;
  width: number;
  value: (row: OrderTableRow) => string;
};

type Props = {
  view: OrderTableView;
  groups: OrderTableGroup<OrderTableRow>[];
  distributorId?: string;
  onDraftDeleted?: () => void;
};

function formatAmount(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function cellStyle(width: number) {
  return {
    width,
    minWidth: width,
    maxWidth: width,
    flexBasis: width,
    flexGrow: 0,
    flexShrink: 0,
  };
}

export function OrderDataTable({ view, groups, distributorId, onDraftDeleted }: Props) {
  const { t } = useTranslation();

  const columns: Column[] =
    view === 'order'
      ? [
          { key: 'shop', label: t('shop'), width: 160, value: (row) => row.shopName },
          { key: 'sr', label: t('srName'), width: 120, value: (row) => row.srName },
          {
            key: 'orderDate',
            label: t('orderDate'),
            width: 120,
            value: (row) => row.orderDate.toLocaleDateString(),
          },
          {
            key: 'deliveryDate',
            label: t('deliveryDate'),
            width: 120,
            value: (row) => row.deliveryDate.toLocaleDateString(),
          },
          { key: 'status', label: t('status'), width: 150, value: (row) => row.status },
          { key: 'cases', label: t('quantityCases'), width: 88, value: (row) => formatAmount(row.cases) },
          { key: 'freePcs', label: t('freePcs'), width: 88, value: (row) => formatAmount(row.freePcs) },
          { key: 'money', label: t('orderTotal'), width: 100, value: (row) => formatAmount(row.money) },
          { key: 'actions', label: '', width: 56, value: () => '' },
        ]
      : [
          { key: 'shop', label: t('shop'), width: 160, value: (row) => row.shopName },
          { key: 'sr', label: t('srName'), width: 120, value: (row) => row.srName },
          { key: 'product', label: t('products'), width: 160, value: (row) => row.productName ?? '' },
          { key: 'cases', label: t('quantityCases'), width: 88, value: (row) => formatAmount(row.cases) },
          {
            key: 'freePcs',
            label: t('freePcs'),
            width: 170,
            value: (row) => {
              const amount = formatAmount(row.freePcs);
              return row.freeProductName ? `${amount} · ${row.freeProductName}` : amount;
            },
          },
          {
            key: 'discount',
            label: t('discountAmount'),
            width: 100,
            value: (row) => formatAmount(row.discountAmount),
          },
          { key: 'money', label: t('lineTotal'), width: 100, value: (row) => formatAmount(row.money) },
          {
            key: 'orderDate',
            label: t('orderDate'),
            width: 120,
            value: (row) => row.orderDate.toLocaleDateString(),
          },
          { key: 'status', label: t('status'), width: 150, value: (row) => row.status },
        ];

  const tableWidth = columns.reduce((sum, column) => sum + column.width, 0);

  return (
    <ScrollView
      horizontal
      nestedScrollEnabled
      style={styles.horizontal}
      contentContainerStyle={{ width: tableWidth }}
    >
      <View style={[styles.table, { width: tableWidth }]}>
        <View style={styles.headerRow}>
          {columns.map((column) => (
            <View key={column.key} style={[styles.cell, cellStyle(column.width)]}>
              <Text variant="labelSmall" numberOfLines={1} style={styles.headerText}>
                {column.label}
              </Text>
            </View>
          ))}
        </View>
        {groups.map((group) => (
          <View key={group.key}>
            {group.label ? (
              <View style={styles.groupRow}>
                <Text variant="labelLarge" style={styles.groupLabel}>
                  {group.label}
                </Text>
                <Text variant="bodySmall" style={styles.groupMeta}>
                  {`${t('totalCases')} ${formatAmount(group.totals.cases)} · ${t('totalFreePcs')} ${formatAmount(group.totals.freePcs)} · ${t('totalMoney')} ${formatAmount(group.totals.money)}`}
                </Text>
              </View>
            ) : null}
            {group.rows.map((row) => (
              <View key={row.id} style={styles.bodyRow}>
                {columns.map((column) => (
                  <View key={column.key} style={[styles.cell, cellStyle(column.width)]}>
                    {column.key === 'status' ? (
                      <StatusChip status={row.status} pending={row.order.pendingSync} />
                    ) : column.key === 'actions' ? (
                      view === 'order' &&
                      (row.status === 'draft' || row.order.pendingSync) &&
                      distributorId &&
                      onDraftDeleted ? (
                        <DeleteDraftOrderButton
                          orderId={row.order.id}
                          distributorId={distributorId}
                          compact
                          onDeleted={onDraftDeleted}
                        />
                      ) : null
                    ) : (
                      <Text variant="bodySmall" numberOfLines={2}>
                        {column.value(row)}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  horizontal: {
    marginBottom: spacing.md,
    alignSelf: 'stretch',
  },
  table: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minHeight: 44,
  },
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    minHeight: 56,
  },
  cell: {
    paddingHorizontal: spacing.sm,
    justifyContent: 'center',
  },
  headerText: {
    color: colors.textMuted,
  },
  groupRow: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  groupLabel: { color: colors.primary },
  groupMeta: { color: colors.textMuted, marginTop: 2 },
});
