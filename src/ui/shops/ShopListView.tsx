import { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import { ActivityIndicator, List, Searchbar, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/src/context/AuthContext';
import { listShopsByDistributor } from '@/src/data/repos/shopsRepo';
import type { Shop } from '@/src/domain/types';
import { AppButton } from '@/src/ui/Form';
import { colors, radii, spacing } from '@/src/theme/tokens';

type Props = {
  /** e.g. `/(distributor)/(app)/shops` or `/(sr)/(app)/shops` */
  baseHref: '/(distributor)/(app)/shops' | '/(sr)/(app)/shops';
};

export function ShopListView({ baseHref }: Props) {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [shops, setShops] = useState<Shop[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile?.distributorId) return;
    setError(null);
    try {
      const rows = await listShopsByDistributor(profile.distributorId);
      setShops(rows);
    } catch {
      setError(t('errorLoadShops'));
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
    if (!q) return shops;
    return shops.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.area.toLowerCase().includes(q) ||
        s.phone.includes(q) ||
        s.ownerName.toLowerCase().includes(q),
    );
  }, [shops, search]);

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
      <Link href={`${baseHref}/create`} asChild>
        <AppButton title={t('createShop')} style={styles.createBtn} />
      </Link>

      <Searchbar
        placeholder={t('searchShops')}
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
          <Text variant="bodyMedium" style={styles.muted}>
            {t('emptyShopList')}
          </Text>
        }
        renderItem={({ item }) => (
          <Link
            href={
              baseHref === '/(sr)/(app)/shops'
                ? { pathname: '/(sr)/(app)/shops/[id]', params: { id: item.id } }
                : {
                    pathname: '/(distributor)/(app)/shops/[id]',
                    params: { id: item.id },
                  }
            }
            asChild
          >
            <List.Item
              title={item.name}
              description={[item.area, item.phone].filter(Boolean).join(' · ')}
              style={styles.row}
            />
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
  search: { marginBottom: spacing.md },
  listFlex: { flex: 1 },
  list: { paddingBottom: spacing.xl },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  row: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
  },
  muted: { color: colors.textMuted, textAlign: 'center' },
  error: { color: colors.danger, marginBottom: spacing.md },
});
