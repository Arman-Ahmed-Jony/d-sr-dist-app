import { useLocalSearchParams } from 'expo-router';
import { ShopDetailView } from '@/src/ui/shops/ShopDetailView';

export default function DsrShopDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const shopId = typeof params.id === 'string' ? params.id : params.id?.[0] ?? '';
  return <ShopDetailView shopId={shopId} />;
}
