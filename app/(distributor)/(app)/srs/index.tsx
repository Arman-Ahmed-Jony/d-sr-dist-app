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
import { listSrsByDistributor } from '@/src/data/repos/usersRepo';
import type { AppUser } from '@/src/domain/types';
import { AppButton } from '@/src/ui/Form';
import { colors, radii, spacing, typography } from '@/src/theme/tokens';

export default function SrListScreen() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [srs, setSrs] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile?.distributorId) return;
    setError(null);
    try {
      const rows = await listSrsByDistributor(profile.distributorId);
      rows.sort((a, b) => a.name.localeCompare(b.name));
      setSrs(rows);
    } catch {
      setError(t('errorLoadSrs'));
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
      <Link href="/(distributor)/(app)/srs/create" asChild>
        <AppButton title={t('createSr')} style={styles.createBtn} />
      </Link>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={srs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={srs.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <Text style={styles.muted}>{t('emptySrList')}</Text>
        }
        renderItem={({ item }) => (
          <Link href={`/(distributor)/(app)/srs/${item.id}`} asChild>
            <Pressable style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.rowName}>{item.name}</Text>
                <Text style={styles.rowEmail}>{item.email}</Text>
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
  rowEmail: { ...typography.caption, color: colors.textMuted },
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
