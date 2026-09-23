import { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { Link, router, useFocusEffect } from 'expo-router';
import { ActivityIndicator, Chip, FAB, List, Searchbar, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/src/context/AuthContext';
import { listProductsByDistributor } from '@/src/data/repos/productsRepo';
import type { Product } from '@/src/domain/types';
import { EmptyState } from '@/src/ui/EmptyState';
import { colors, radii, spacing } from '@/src/theme/tokens';

export default function ProductListScreen() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile?.distributorId) return;
    setError(null);
    try {
      const rows = await listProductsByDistributor(profile.distributorId);
      setProducts(rows);
    } catch (e) {
      console.error('listProductsByDistributor failed', e);
      const code =
        e && typeof e === 'object' && 'code' in e ? String((e as { code: unknown }).code) : '';
      if (code.includes('permission-denied')) {
        setError(t('errorLoadProductsPermission'));
      } else if (code.includes('failed-precondition')) {
        setError(t('errorLoadProductsIndex'));
      } else {
        setError(t('errorLoadProducts'));
      }
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, search]);

  const onRefresh = () => {
    setRefreshing(true);
    void load();
  };

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
      <Searchbar
        placeholder={t('searchProducts')}
        value={search}
        onChangeText={setSearch}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.search}
      />

      {error ? (
        <Text variant="bodyMedium" style={styles.error}>
          {error}
        </Text>
      ) : null}

      <FlatList
        style={styles.listFlex}
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="package-variant"
            message={t('emptyProductList')}
            actionLabel={t('createProduct')}
            onAction={() => router.push('/(distributor)/(app)/products/create')}
          />
        }
        renderItem={({ item }) => (
          <Link href={`/(distributor)/(app)/products/${item.id}`} asChild>
            <List.Item
              title={item.name}
              description={`${t('pricePerCase')}: ${item.pricePerCase}`}
              style={styles.row}
              right={() => (
                <Chip compact style={styles.badge}>
                  {item.active ? t('active') : t('inactive')}
                </Chip>
              )}
            />
          </Link>
        )}
      />

      <FAB
        icon="plus"
        color={colors.white}
        style={styles.fab}
        onPress={() => router.push('/(distributor)/(app)/products/create')}
        accessibilityLabel={t('createProduct')}
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
  search: { marginBottom: spacing.md },
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
  badge: { alignSelf: 'center' },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    backgroundColor: colors.accent,
  },
  muted: { color: colors.textMuted, textAlign: 'center' },
  error: { color: colors.danger, marginBottom: spacing.md },
});
