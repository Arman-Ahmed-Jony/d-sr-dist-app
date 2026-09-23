import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/src/context/AuthContext';
import { getOrder } from '@/src/data/repos/ordersRepo';
import type { Order } from '@/src/domain/types';
import { OrderForm } from '@/src/ui/orders/OrderForm';
import { colors, spacing } from '@/src/theme/tokens';

function useOrderId(): string {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  if (typeof params.id === 'string') return params.id;
  if (Array.isArray(params.id) && params.id[0]) return params.id[0];
  return '';
}

export default function SrOrderEditScreen() {
  const { t } = useTranslation();
  const { profile, firebaseUser } = useAuth();
  const id = useOrderId();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      async function load() {
        if (!id || !profile?.distributorId || !firebaseUser) {
          setLoading(false);
          setError(t('errorOrderNotFound'));
          return;
        }
        setLoading(true);
        setError(null);
        try {
          const row = await getOrder(id);
          if (
            !row ||
            row.distributorId !== profile.distributorId ||
            row.srId !== firebaseUser.uid
          ) {
            if (!cancelled) {
              setOrder(null);
              setError(t('errorOrderNotFound'));
            }
            return;
          }
          if (!cancelled) setOrder(row);
        } catch {
          if (!cancelled) {
            setOrder(null);
            setError(t('errorOrderNotFound'));
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      }
      void load();
      return () => {
        cancelled = true;
      };
    }, [id, profile?.distributorId, firebaseUser, t]),
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
        <Text variant="bodyMedium" style={styles.muted}>
          {t('loading')}
        </Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.centered}>
        <Text variant="bodyMedium" style={styles.error}>
          {error ?? t('errorOrderNotFound')}
        </Text>
      </View>
    );
  }

  return <OrderForm order={order} />;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  muted: { color: colors.textMuted },
  error: { color: colors.danger, textAlign: 'center' },
});
