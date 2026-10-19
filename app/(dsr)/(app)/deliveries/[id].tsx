import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { getOrder, recordDelivery } from '@/src/data/repos/ordersRepo';
import type { DeliveryResult } from '@/src/domain/delivery';
import type { Order } from '@/src/domain/types';
import { AppButton, AppInput } from '@/src/ui/Form';
import { StatusChip } from '@/src/ui/StatusChip';
import { colors, spacing } from '@/src/theme/tokens';

export default function DeliveryDetailScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === 'string' ? params.id : params.id?.[0];
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [partial, setPartial] = useState(false);
  const [bounce, setBounce] = useState<Record<string, { cases: string; pcs: string }>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      setLoading(true);
      void getOrder(id)
        .then((row) => {
          setOrder(row);
          if (!row) return;
          const next: Record<string, { cases: string; pcs: string }> = {};
          for (const line of row.lines) {
            next[line.productId] = {
              cases: line.bouncedCases ? String(line.bouncedCases) : '',
              pcs: line.bouncedPcs ? String(line.bouncedPcs) : '',
            };
          }
          setBounce(next);
        })
        .finally(() => setLoading(false));
    }, [id]),
  );

  const save = async (result: DeliveryResult) => {
    if (!order || saving) return;
    setSaving(true);
    setError(null);
    try {
      const partialRows =
        result === 'partial'
          ? order.lines.map((line) => ({
              productId: line.productId,
              bouncedCases: Number(bounce[line.productId]?.cases || 0),
              bouncedPcs: Number(bounce[line.productId]?.pcs || 0),
            }))
          : [];
      const next = await recordDelivery(order, result, partialRows);
      setOrder(next);
      setPartial(false);
    } catch (err) {
      const message = err instanceof Error ? err.message.toLowerCase() : '';
      setError(message.includes('bounce') || message.includes('at least one') ? t('errorBounce') : t('errorDelivery'));
    } finally {
      setSaving(false);
    }
  };

  if (loading || !order) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text variant="titleLarge">{order.shopName}</Text>
      <Text variant="bodySmall" style={styles.meta}>
        {`${t('deliveryDate')}: ${order.deliveryDate.toLocaleDateString()} · ${order.srName ?? ''}`}
      </Text>
      <StatusChip status={order.status} pending={order.pendingSync} />
      {order.lines.map((line) => (
        <View key={line.productId} style={styles.line}>
          <Text variant="bodyMedium">{line.productName}</Text>
          <Text variant="bodySmall" style={styles.meta}>
            {`${t('quantityCases')} ${line.quantityCases}${line.quantityPcs ? ` · ${t('quantityPcs')} ${line.quantityPcs}` : ''}`}
          </Text>
          {partial ? (
            <View style={styles.bounceRow}>
              <AppInput
                label={t('bouncedCases')}
                value={bounce[line.productId]?.cases ?? ''}
                onChangeText={(value) =>
                  setBounce((current) => ({
                    ...current,
                    [line.productId]: { cases: value, pcs: current[line.productId]?.pcs ?? '' },
                  }))
                }
                keyboardType="numeric"
              />
              {line.quantityPcs > 0 ? (
                <AppInput
                  label={t('bouncedPcs')}
                  value={bounce[line.productId]?.pcs ?? ''}
                  onChangeText={(value) =>
                    setBounce((current) => ({
                      ...current,
                      [line.productId]: { cases: current[line.productId]?.cases ?? '', pcs: value },
                    }))
                  }
                  keyboardType="numeric"
                />
              ) : null}
            </View>
          ) : null}
        </View>
      ))}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {partial ? (
        <>
          <AppButton title={saving ? t('loading') : t('save')} onPress={() => void save('partial')} disabled={saving} />
          <AppButton title={t('cancel')} onPress={() => setPartial(false)} disabled={saving} />
        </>
      ) : (
        <>
          <AppButton title={t('markDelivered')} onPress={() => void save('delivered')} disabled={saving} />
          <AppButton title={t('markPartial')} onPress={() => setPartial(true)} disabled={saving} />
          <AppButton title={t('markBounced')} onPress={() => void save('bounced')} disabled={saving} />
          <AppButton title={t('markCancelled')} variant="danger" onPress={() => void save('cancelled')} disabled={saving} />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.sm, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  meta: { color: colors.textMuted },
  line: {
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  bounceRow: { gap: spacing.sm },
  error: { color: colors.danger },
});
