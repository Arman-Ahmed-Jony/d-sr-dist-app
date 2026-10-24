import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { ActivityIndicator, FAB, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/src/context/AuthContext';
import { listOrdersBySr } from '@/src/data/repos/ordersRepo';
import type { Order } from '@/src/domain/types';
import { DistributorOrdersView } from '@/src/ui/orders/DistributorOrdersView';
import { colors, spacing } from '@/src/theme/tokens';

export default function SrOrderListScreen() {
  const { t } = useTranslation();
  const { firebaseUser, profile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!firebaseUser || !profile?.distributorId) return;
    setError(null);
    try {
      const rows = await listOrdersBySr(firebaseUser.uid, profile.distributorId);
      setOrders(rows);
    } catch (e) {
      console.error('listOrdersBySr failed', e);
      setError(t('errorLoadOrders'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [firebaseUser, profile?.distributorId, t]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
        <Text variant="bodyMedium" style={styles.muted}>
          {t('loading')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
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
        {error ? (
          <Text variant="bodyMedium" style={styles.error}>
            {error}
          </Text>
        ) : null}
        <DistributorOrdersView
          orders={orders}
          distributorId={profile?.distributorId}
          onDraftDeleted={() => void load()}
          canManage={false}
        />
      </ScrollView>
      <FAB
        icon="plus"
        color={colors.white}
        style={styles.fab}
        onPress={() => router.push('/(sr)/(app)/orders/create')}
        accessibilityLabel={t('createOrder')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, paddingBottom: 96 },
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  muted: { color: colors.textMuted },
  error: { color: colors.danger, marginBottom: spacing.md },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    backgroundColor: colors.accent,
  },
});
