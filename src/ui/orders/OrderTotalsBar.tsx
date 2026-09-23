import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Card, Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import type { OrderTableTotals } from '@/src/domain/orderTable';
import { colors, spacing } from '@/src/theme/tokens';

type Props = {
  totals: OrderTableTotals;
};

function formatAmount(value: number): string {
  return Number.isInteger(value)
    ? value.toLocaleString('en-US')
    : value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatMoney(value: number): string {
  return `৳${formatAmount(value)}`;
}

export function OrderTotalsBar({ totals }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <Card mode="contained" style={styles.wrap}>
      <Card.Content style={styles.content}>
        <View style={styles.header}>
          <MaterialCommunityIcons name="chart-timeline-variant" size={22} color={colors.primary} />
          <Text variant="titleMedium" style={styles.title}>
            {t('totals')}
          </Text>
        </View>

        <View style={styles.grand}>
          <Stat label={t('totalOrders')} value={formatAmount(totals.orderCount)} />
          <Stat label={t('totalCases')} value={formatAmount(totals.cases)} />
          <Stat label={t('totalFreePcs')} value={formatAmount(totals.freePcs)} />
        </View>

        <View style={styles.valueBlock}>
          <Text variant="bodyMedium" style={styles.valueLabel}>
            {t('totalValue')}
          </Text>
          <Text variant="headlineSmall" style={styles.valueAmount}>
            {formatMoney(totals.money)}
          </Text>
        </View>

        {totals.byProduct.length > 0 ? (
          <View style={styles.products}>
            <Pressable
              onPress={() => setOpen((current) => !current)}
              style={styles.toggle}
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
            >
              <View style={styles.toggleLeft}>
                <MaterialCommunityIcons
                  name="package-variant-closed"
                  size={20}
                  color={colors.textMuted}
                />
                <Text variant="bodyMedium" style={styles.toggleLabel}>
                  {t('productTotals')}
                </Text>
              </View>
              <MaterialCommunityIcons
                name={open ? 'chevron-down' : 'chevron-right'}
                size={22}
                color={colors.textMuted}
              />
            </Pressable>
            {open ? (
              <View style={styles.table}>
                <View style={styles.tableRow}>
                  <Text variant="labelSmall" style={[styles.productCell, styles.headerText]}>
                    {t('products')}
                  </Text>
                  <Text variant="labelSmall" style={[styles.numCell, styles.headerText]}>
                    {t('totalCases')}
                  </Text>
                  <Text variant="labelSmall" style={[styles.numCell, styles.headerText]}>
                    {t('totalFreePcs')}
                  </Text>
                  <Text variant="labelSmall" style={[styles.numCell, styles.headerText]}>
                    {t('totalMoney')}
                  </Text>
                </View>
                {totals.byProduct.map((product) => (
                  <View key={product.productId} style={styles.tableRow}>
                    <Text variant="bodySmall" style={styles.productCell} numberOfLines={2}>
                      {product.productName}
                    </Text>
                    <Text variant="bodySmall" style={styles.numCell}>
                      {formatAmount(product.cases)}
                    </Text>
                    <Text variant="bodySmall" style={styles.numCell}>
                      {formatAmount(product.freePcs)}
                    </Text>
                    <Text variant="bodySmall" style={styles.numCell}>
                      {formatMoney(product.money)}
                    </Text>
                  </View>
                ))}
                <View style={[styles.tableRow, styles.footerRow]}>
                  <Text variant="labelLarge" style={styles.productCell}>
                    {t('totals')}
                  </Text>
                  <Text variant="labelLarge" style={styles.numCell}>
                    {formatAmount(totals.cases)}
                  </Text>
                  <Text variant="labelLarge" style={styles.numCell}>
                    {formatAmount(totals.freePcs)}
                  </Text>
                  <Text variant="labelLarge" style={styles.numCell}>
                    {formatMoney(totals.money)}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        ) : null}
      </Card.Content>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text variant="bodyMedium" style={styles.statLabel}>
        {label}
      </Text>
      <Text variant="headlineSmall" style={styles.statValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.md,
    flexShrink: 0,
    backgroundColor: colors.surface,
    borderRadius: 20,
  },
  content: { paddingVertical: spacing.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  title: { color: colors.primary, fontWeight: '700' },
  grand: { flexDirection: 'row', gap: spacing.md },
  stat: { flex: 1 },
  statLabel: { color: colors.textMuted, marginBottom: 2 },
  statValue: { color: colors.text, fontWeight: '700' },
  valueBlock: { marginTop: spacing.md },
  valueLabel: { color: colors.textMuted, marginBottom: 2 },
  valueAmount: { color: colors.text, fontWeight: '700' },
  products: {
    marginTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    minHeight: 44,
  },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  toggleLabel: { color: colors.text },
  table: { marginTop: spacing.sm },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  footerRow: {
    borderBottomWidth: 0,
    paddingTop: spacing.sm,
  },
  productCell: { flex: 1.4 },
  numCell: { flex: 1, textAlign: 'right' },
  headerText: { color: colors.textMuted },
});
