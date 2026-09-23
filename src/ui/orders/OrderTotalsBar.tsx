import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import type { OrderTableTotals } from '@/src/domain/orderTable';
import { colors, spacing } from '@/src/theme/tokens';

type Props = {
  totals: OrderTableTotals;
};

function formatAmount(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export function OrderTotalsBar({ totals }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <Card mode="outlined" style={styles.wrap}>
      <Card.Content>
        <Text variant="labelLarge" style={styles.title}>
          {t('totals')}
        </Text>
        <View style={styles.grand}>
          <Stat label={t('totalOrders')} value={String(totals.orderCount)} />
          <Stat label={t('totalCases')} value={formatAmount(totals.cases)} />
          <Stat label={t('totalFreePcs')} value={formatAmount(totals.freePcs)} />
          <Stat label={t('totalMoney')} value={formatAmount(totals.money)} />
        </View>
        {totals.byProduct.length > 0 ? (
          <View style={styles.products}>
            <Pressable
              onPress={() => setOpen((current) => !current)}
              style={styles.toggle}
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
            >
              <Text variant="labelLarge" style={styles.toggleLabel}>
                {t('productTotals')}
              </Text>
              <Text variant="titleMedium" style={styles.toggleArrow}>
                {open ? '▾' : '▸'}
              </Text>
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
                      {formatAmount(product.money)}
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
                    {formatAmount(totals.money)}
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
      <Text variant="bodySmall" style={styles.statLabel}>
        {label}
      </Text>
      <Text variant="titleMedium">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md, flexShrink: 0 },
  title: { color: colors.primary, marginBottom: spacing.sm },
  grand: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  stat: { minWidth: 88 },
  statLabel: { color: colors.textMuted },
  products: { marginTop: spacing.md },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  toggleLabel: { color: colors.text },
  toggleArrow: { color: colors.textMuted },
  table: {
    marginTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
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
