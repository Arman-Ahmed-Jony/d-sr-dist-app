import { useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { getOrder } from '@/src/data/repos/ordersRepo';
import type { Order } from '@/src/domain/types';
import { OrderForm } from '@/src/ui/orders/OrderForm';
import { colors } from '@/src/theme/tokens';

export default function DsrOrderEditScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === 'string' ? params.id : params.id?.[0];
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      setLoading(true);
      void getOrder(id)
        .then(setOrder)
        .finally(() => setLoading(false));
    }, [id]),
  );

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator />
      </View>
    );
  }

  return <OrderForm order={order ?? undefined} />;
}
