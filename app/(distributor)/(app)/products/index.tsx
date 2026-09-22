import { useCallback, useMemo, useState } from 'react';
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
import { listProductsByDistributor } from '@/src/data/repos/productsRepo';
import type { Product } from '@/src/domain/types';
import { AppButton, AppInput } from '@/src/ui/Form';
import { colors, radii, spacing, typography } from '@/src/theme/tokens';

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
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.muted}>{t('loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Link href="/(distributor)/(app)/products/create" asChild>
        <AppButton title={t('createProduct')} style={styles.createBtn} />
      </Link>

      <AppInput
        label={t('searchProducts')}
        value={search}
        onChangeText={setSearch}
        autoCapitalize="none"
        autoCorrect={false}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <Text style={styles.muted}>{t('emptyProductList')}</Text>
        }
        renderItem={({ item }) => (
          <Link href={`/(distributor)/(app)/products/${item.id}`} asChild>
            <Pressable style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.rowName}>{item.name}</Text>
                <Text style={styles.rowMeta}>
                  {t('pricePerCase')}: {item.pricePerCase}
                </Text>
              </View>
              <View
                style={[
                  styles.badge,
                  item.active ? styles.badgeActive : styles.badgeInactive,
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    item.active ? styles.badgeTextActive : styles.badgeTextInactive,
                  ]}
                >
                  {item.active ? t('active') : t('inactive')}
                </Text>
              </View>
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
  list: { gap: spacing.sm, paddingBottom: spacing.xl },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowText: { flex: 1, gap: spacing.xs },
  rowName: { ...typography.label, color: colors.text },
  rowMeta: { ...typography.caption, color: colors.textMuted },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
  },
  badgeActive: { backgroundColor: '#E3F2E9' },
  badgeInactive: { backgroundColor: colors.surfaceMuted },
  badgeText: { ...typography.caption, fontWeight: '600' },
  badgeTextActive: { color: colors.success },
  badgeTextInactive: { color: colors.textMuted },
  muted: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  error: { ...typography.body, color: colors.danger, marginBottom: spacing.md },
});
