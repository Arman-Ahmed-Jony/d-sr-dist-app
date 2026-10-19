import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { Link, router, useFocusEffect } from 'expo-router';
import { ActivityIndicator, Chip, FAB, List, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/src/context/AuthContext';
import { listDsrsByDistributor } from '@/src/data/repos/usersRepo';
import type { AppUser } from '@/src/domain/types';
import { EmptyState } from '@/src/ui/EmptyState';
import { colors, radii, spacing } from '@/src/theme/tokens';

export default function DsrListScreen() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [dsrs, setDsrs] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile?.distributorId) return;
    setError(null);
    try {
      const rows = await listDsrsByDistributor(profile.distributorId);
      rows.sort((a, b) => a.name.localeCompare(b.name));
      setDsrs(rows);
    } catch {
      setError(t('errorLoadDsrs'));
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
        data={dsrs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={dsrs.length === 0 ? styles.emptyContainer : styles.list}
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
            icon="truck-outline"
            message={t('emptyDsrList')}
            actionLabel={t('createDsr')}
            onAction={() => router.push('/(distributor)/(app)/dsrs/create')}
          />
        }
        renderItem={({ item }) => (
          <Link href={`/(distributor)/(app)/dsrs/${item.id}`} asChild>
            <List.Item
              title={item.name}
              description={item.email}
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
        onPress={() => router.push('/(distributor)/(app)/dsrs/create')}
        accessibilityLabel={t('createDsr')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
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
