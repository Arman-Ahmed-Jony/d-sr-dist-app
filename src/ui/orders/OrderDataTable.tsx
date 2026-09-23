import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type {
  OrderTableGroup,
  OrderTableRow,
  OrderTableView,
} from '@/src/domain/orderTable';
import { colors, radii, spacing, typography } from '@/src/theme/tokens';

type Column = {
  key: string;
  label: string;
  width: number;
  value: (row: OrderTableRow) => string;
};

type Props = {
  view: OrderTableView;
  groups: OrderTableGroup<OrderTableRow>[];
};

function formatAmount(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export function OrderDataTable({ view, groups }: Props) {
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
          { key: 'status', label: t('status'), width: 100, value: (row) => row.status },
          { key: 'cases', label: t('quantityCases'), width: 80, value: (row) => formatAmount(row.cases) },
          { key: 'freePcs', label: t('freePcs'), width: 80, value: (row) => formatAmount(row.freePcs) },
          { key: 'money', label: t('orderTotal'), width: 90, value: (row) => formatAmount(row.money) },
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
          { key: 'status', label: t('status'), width: 100, value: (row) => row.status },
        ];

  const tableWidth = columns.reduce((sum, column) => sum + column.width, 0);

  return (
    <ScrollView horizontal style={styles.horizontal}>
      <View style={[styles.table, { width: tableWidth }]}>
        <View style={[styles.row, styles.headerRow]}>
          {columns.map((column) => (
            <Text key={column.key} style={[styles.headerCell, { width: column.width }]}>
              {column.label}
            </Text>
          ))}
        </View>
        {groups.map((group) => (
          <View key={group.key}>
            {group.label ? (
              <View style={[styles.groupRow, { width: tableWidth }]}>
                <Text style={styles.groupLabel}>{group.label}</Text>
                <Text style={styles.groupMeta}>
                  {t('totalCases')} {formatAmount(group.totals.cases)} · {t('totalFreePcs')}{' '}
                  {formatAmount(group.totals.freePcs)} · {t('totalMoney')}{' '}
                  {formatAmount(group.totals.money)}
                </Text>
              </View>
            ) : null}
            {group.rows.map((row) => (
              <View key={row.id} style={styles.row}>
                {columns.map((column) => (
                  <Text key={column.key} style={[styles.cell, { width: column.width }]} numberOfLines={2}>
                    {column.value(row)}
                  </Text>
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
  horizontal: { marginBottom: spacing.md },
  table: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'center',
  },
  headerRow: { backgroundColor: colors.surfaceMuted },
  headerCell: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '700',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  cell: {
    ...typography.caption,
    color: colors.text,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  groupRow: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  groupLabel: { ...typography.label, color: colors.primary },
  groupMeta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
});
