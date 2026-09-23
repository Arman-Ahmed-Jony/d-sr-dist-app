import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { OrderTableTotals } from '@/src/domain/orderTable';
import { colors, radii, spacing, typography } from '@/src/theme/tokens';

type Props = {
  totals: OrderTableTotals;
};

function formatAmount(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export function OrderTotalsBar({ totals }: Props) {
  const { t } = useTranslation();

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t('totals')}</Text>
      <View style={styles.grand}>
        <Stat label={t('totalOrders')} value={String(totals.orderCount)} />
        <Stat label={t('totalCases')} value={formatAmount(totals.cases)} />
        <Stat label={t('totalFreePcs')} value={formatAmount(totals.freePcs)} />
        <Stat label={t('totalMoney')} value={formatAmount(totals.money)} />
      </View>
      {totals.byProduct.length > 0 ? (
        <View style={styles.products}>
          <Text style={styles.productTitle}>{t('productTotals')}</Text>
          {totals.byProduct.map((product) => (
            <Text key={product.productId} style={styles.productLine}>
              {product.productName}: {t('totalCases')} {formatAmount(product.cases)} ·{' '}
              {t('totalFreePcs')} {formatAmount(product.freePcs)} · {t('totalMoney')}{' '}
              {formatAmount(product.money)}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  title: { ...typography.label, color: colors.primary, marginBottom: spacing.sm },
  grand: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  stat: { minWidth: 88 },
  statLabel: { ...typography.caption, color: colors.textMuted },
  statValue: { ...typography.heading, color: colors.text },
  products: { marginTop: spacing.md, gap: spacing.xs },
  productTitle: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.xs },
  productLine: { ...typography.caption, color: colors.text },
});
