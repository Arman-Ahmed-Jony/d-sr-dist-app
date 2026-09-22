import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LanguageToggle } from '@/src/ui/LanguageToggle';
import { colors, spacing } from '@/src/theme/tokens';

export default function SrLayout() {
  const { t } = useTranslation();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
        headerRight: () => <LanguageToggle style={{ marginRight: spacing.sm }} />,
      }}
    >
      <Stack.Screen name="dashboard" options={{ title: t('dashboard') }} />
      <Stack.Screen name="shops/index" options={{ title: t('shopList') }} />
      <Stack.Screen name="shops/create" options={{ title: t('createShop') }} />
      <Stack.Screen name="shops/[id]" options={{ title: t('shopDetail') }} />
    </Stack>
  );
}
