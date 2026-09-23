import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/src/context/AuthContext';
import { listOrdersByDistributor } from '@/src/data/repos/ordersRepo';
import type { Order } from '@/src/domain/types';
import { DistributorOrdersView } from '@/src/ui/orders/DistributorOrdersView';
import { colors, spacing, typography } from '@/src/theme/tokens';

export default function DistributorOrderTableScreen() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile?.distributorId) return;
    setError(null);
    try {
      const rows = await listOrdersByDistributor(profile.distributorId);
      setOrders(rows);
    } catch (e) {
      console.error('listOrdersByDistributor failed', e);
      setError(t('errorLoadOrders'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile?.distributorId, t]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.muted}>{t('loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void load();
          }}
          tintColor={colors.primary}
        />
      }
    >
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <DistributorOrdersView orders={orders} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, paddingBottom: spacing.xl },
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  muted: { ...typography.body, color: colors.textMuted },
  error: { ...typography.body, color: colors.danger, marginBottom: spacing.md },
});
