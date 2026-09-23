import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { Link, router, useFocusEffect } from 'expo-router';
import { ActivityIndicator, FAB, List, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/src/context/AuthContext';
import { listOrdersBySr } from '@/src/data/repos/ordersRepo';
import type { Order } from '@/src/domain/types';
import { EmptyState } from '@/src/ui/EmptyState';
import { StatusChip } from '@/src/ui/StatusChip';
import { colors, radii, spacing } from '@/src/theme/tokens';

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
    <View style={styles.container}>
      {error ? (
        <Text variant="bodyMedium" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <FlatList
        style={styles.listFlex}
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={orders.length === 0 ? styles.emptyContainer : styles.list}
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
        ListEmptyComponent={
          <EmptyState
            icon="clipboard-list-outline"
            message={t('emptyOrderList')}
            actionLabel={t('createOrder')}
            onAction={() => router.push('/(sr)/(app)/orders/create')}
          />
        }
        renderItem={({ item }) => (
          <Link
            href={{ pathname: '/(sr)/(app)/orders/[id]', params: { id: item.id } }}
            asChild
          >
            <List.Item
              title={item.shopName}
              description={`${item.orderDate.toLocaleDateString()} · ${item.lines.length} ${t('lines')} · ${item.orderTotal}`}
              style={styles.row}
              right={() => <StatusChip status={item.status} />}
            />
          </Link>
        )}
      />
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
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  listFlex: { flex: 1 },
  list: { paddingBottom: 88 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  row: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
    minHeight: 56,
    paddingVertical: spacing.sm,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    backgroundColor: colors.accent,
  },
  muted: { color: colors.textMuted, textAlign: 'center' },
  error: { color: colors.danger, marginBottom: spacing.md },
});
