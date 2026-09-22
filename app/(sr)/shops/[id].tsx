import { useLocalSearchParams } from 'expo-router';
import { ShopDetailView } from '@/src/ui/shops/ShopDetailView';

function useShopIdParam(): string {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  if (typeof params.id === 'string') return params.id;
  if (Array.isArray(params.id) && params.id[0]) return params.id[0];
  return '';
}

export default function SrShopDetailScreen() {
  return <ShopDetailView shopId={useShopIdParam()} />;
}
