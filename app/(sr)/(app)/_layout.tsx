import { Stack } from 'expo-router';
import { DrawerToggleButton } from 'expo-router/drawer';
import { useTranslation } from 'react-i18next';
import { colors } from '@/src/theme/tokens';

export default function SrAppLayout() {
  const { t } = useTranslation();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
        headerRight: () => (
          <DrawerToggleButton tintColor={colors.text} accessibilityLabel={t('menu')} />
        ),
      }}
    >
      <Stack.Screen name="dashboard" options={{ title: t('dashboard') }} />
      <Stack.Screen name="shops/index" options={{ title: t('shopList') }} />
      <Stack.Screen name="shops/create" options={{ title: t('createShop') }} />
      <Stack.Screen name="shops/[id]" options={{ title: t('shopDetail') }} />
      <Stack.Screen name="orders/index" options={{ title: t('orderList') }} />
      <Stack.Screen name="orders/create" options={{ title: t('createOrder') }} />
      <Stack.Screen name="orders/[id]" options={{ title: t('editOrder') }} />
    </Stack>
  );
}
