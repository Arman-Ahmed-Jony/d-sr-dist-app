import { StyleSheet, View } from 'react-native';
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
            <Text variant="bodySmall" style={styles.productTitle}>
              {t('productTotals')}
            </Text>
            {totals.byProduct.map((product) => (
              <Text key={product.productId} variant="bodySmall">
                {product.productName}: {t('totalCases')} {formatAmount(product.cases)} ·{' '}
                {t('totalFreePcs')} {formatAmount(product.freePcs)} · {t('totalMoney')}{' '}
                {formatAmount(product.money)}
              </Text>
            ))}
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
  wrap: { marginBottom: spacing.md },
  title: { color: colors.primary, marginBottom: spacing.sm },
  grand: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  stat: { minWidth: 88 },
  statLabel: { color: colors.textMuted },
  products: { marginTop: spacing.md, gap: spacing.xs },
  productTitle: { color: colors.textMuted, marginBottom: spacing.xs },
});
