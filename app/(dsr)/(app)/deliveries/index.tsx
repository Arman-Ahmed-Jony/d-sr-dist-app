import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { ActivityIndicator, List, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/src/context/AuthContext';
import { listOrdersByDsr } from '@/src/data/repos/ordersRepo';
import type { Order } from '@/src/domain/types';
import { EmptyState } from '@/src/ui/EmptyState';
import { StatusChip } from '@/src/ui/StatusChip';
import { colors, radii, spacing } from '@/src/theme/tokens';

export default function DeliveriesScreen() {
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
      setOrders(await listOrdersByDsr(firebaseUser.uid, profile.distributorId));
    } catch {
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
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={orders.length === 0 ? styles.emptyContainer : undefined}
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
        ListEmptyComponent={<EmptyState icon="truck-outline" message={t('emptyDeliveries')} />}
        renderItem={({ item }) => (
          <List.Item
            title={item.shopName}
            description={`${item.deliveryDate.toLocaleDateString()} · ${item.lines.length} ${t('lines')}`}
            style={styles.row}
            onPress={() => router.push({ pathname: '/(dsr)/(app)/deliveries/[id]', params: { id: item.id } })}
            right={() => <StatusChip status={item.status} pending={item.pendingSync} />}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  row: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
  },
  error: { color: colors.danger, marginBottom: spacing.md },
});
