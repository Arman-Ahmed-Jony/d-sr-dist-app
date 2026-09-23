import { ScrollView, StyleSheet, View } from 'react-native';
import { DataTable, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { StatusChip } from '@/src/ui/StatusChip';
import { DeleteDraftOrderButton } from '@/src/ui/orders/DeleteDraftOrderButton';
import type {
  OrderTableGroup,
  OrderTableRow,
  OrderTableView,
} from '@/src/domain/orderTable';
import { colors, spacing } from '@/src/theme/tokens';

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

const cellStyle = (width: number) => ({
  width,
  flexGrow: 0,
  flexShrink: 0,
  maxWidth: width,
});

export function OrderDataTable({ view, groups, distributorId, onDraftDeleted }: Props) {
  const { t } = useTranslation();

  const columns: Column[] =
    view === 'order'
      ? [
          { key: 'shop', label: t('shop'), width: 150, value: (row) => row.shopName },
          { key: 'sr', label: t('srName'), width: 110, value: (row) => row.srName },
          {
            key: 'orderDate',
            label: t('orderDate'),
            width: 110,
            value: (row) => row.orderDate.toLocaleDateString(),
          },
          {
            key: 'deliveryDate',
            label: t('deliveryDate'),
            width: 110,
            value: (row) => row.deliveryDate.toLocaleDateString(),
          },
          { key: 'status', label: t('status'), width: 120, value: (row) => row.status },
          { key: 'cases', label: t('quantityCases'), width: 80, value: (row) => formatAmount(row.cases) },
          { key: 'freePcs', label: t('freePcs'), width: 80, value: (row) => formatAmount(row.freePcs) },
          { key: 'money', label: t('orderTotal'), width: 90, value: (row) => formatAmount(row.money) },
          { key: 'actions', label: '', width: 56, value: () => '' },
        ]
      : [
          { key: 'shop', label: t('shop'), width: 150, value: (row) => row.shopName },
          { key: 'sr', label: t('srName'), width: 110, value: (row) => row.srName },
          { key: 'product', label: t('products'), width: 150, value: (row) => row.productName ?? '' },
          { key: 'cases', label: t('quantityCases'), width: 80, value: (row) => formatAmount(row.cases) },
          {
            key: 'freePcs',
            label: t('freePcs'),
            width: 160,
            value: (row) => {
              const amount = formatAmount(row.freePcs);
              return row.freeProductName ? `${amount} · ${row.freeProductName}` : amount;
            },
          },
          {
            key: 'discount',
            label: t('discountAmount'),
            width: 90,
            value: (row) => formatAmount(row.discountAmount),
          },
          { key: 'money', label: t('lineTotal'), width: 90, value: (row) => formatAmount(row.money) },
          {
            key: 'orderDate',
            label: t('orderDate'),
            width: 110,
            value: (row) => row.orderDate.toLocaleDateString(),
          },
          { key: 'status', label: t('status'), width: 120, value: (row) => row.status },
        ];

  const tableWidth = columns.reduce((sum, column) => sum + column.width, 0);

  return (
    <ScrollView horizontal style={styles.horizontal}>
      <DataTable style={[styles.table, { width: tableWidth }]}>
        <DataTable.Header>
          {columns.map((column) => (
            <DataTable.Title key={column.key} style={cellStyle(column.width)}>
              {column.label}
            </DataTable.Title>
          ))}
        </DataTable.Header>
        {groups.map((group) => (
          <View key={group.key}>
            {group.label ? (
              <View style={[styles.groupRow, { width: tableWidth }]}>
                <Text variant="labelLarge" style={styles.groupLabel}>
                  {group.label}
                </Text>
                <Text variant="bodySmall" style={styles.groupMeta}>
                  {t('totalCases')} {formatAmount(group.totals.cases)} · {t('totalFreePcs')}{' '}
                  {formatAmount(group.totals.freePcs)} · {t('totalMoney')}{' '}
                  {formatAmount(group.totals.money)}
                </Text>
              </View>
            ) : null}
            {group.rows.map((row) => (
              <DataTable.Row key={row.id}>
                {columns.map((column) => (
                  <DataTable.Cell key={column.key} style={cellStyle(column.width)}>
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
                      column.value(row)
                    )}
                  </DataTable.Cell>
                ))}
              </DataTable.Row>
            ))}
          </View>
        ))}
      </DataTable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  horizontal: { marginBottom: spacing.md },
  table: { backgroundColor: colors.surface },
  groupRow: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  groupLabel: { color: colors.primary },
  groupMeta: { color: colors.textMuted, marginTop: 2 },
});
