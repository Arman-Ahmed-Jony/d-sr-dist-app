import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/src/context/AuthContext';
import { listOrdersBySr } from '@/src/data/repos/ordersRepo';
import type { Order } from '@/src/domain/types';
import { AppButton } from '@/src/ui/Form';
import { colors, radii, spacing, typography } from '@/src/theme/tokens';

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
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.muted}>{t('loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Link href="/(sr)/orders/create" asChild>
        <AppButton title={t('createOrder')} style={styles.createBtn} />
      </Link>
      {error ? <Text style={styles.error}>{error}</Text> : null}
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
        ListEmptyComponent={<Text style={styles.muted}>{t('emptyOrderList')}</Text>}
        renderItem={({ item }) => (
          <Link
            href={{ pathname: '/(sr)/orders/[id]', params: { id: item.id } }}
            asChild
          >
            <Pressable style={styles.row}>
              <Text style={styles.rowName}>{item.shopName}</Text>
              <Text style={styles.rowMeta}>
                {item.orderDate.toLocaleDateString()} · {item.status}
              </Text>
              <Text style={styles.rowMeta}>
                {item.lines.length} {t('lines')} · {item.orderTotal}
              </Text>
            </Pressable>
          </Link>
        )}
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
  createBtn: { marginBottom: spacing.md },
  listFlex: { flex: 1 },
  list: { paddingBottom: spacing.xl },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  row: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowName: { ...typography.label, color: colors.text },
  rowMeta: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  muted: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  error: { ...typography.body, color: colors.danger, marginBottom: spacing.md },
});
