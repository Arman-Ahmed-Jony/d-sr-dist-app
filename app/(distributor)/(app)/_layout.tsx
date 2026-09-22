import { Stack } from 'expo-router';
import { DrawerToggleButton } from 'expo-router/drawer';
import { useTranslation } from 'react-i18next';
import { colors } from '@/src/theme/tokens';

export default function DistributorAppLayout() {
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
      <Stack.Screen name="srs/index" options={{ title: t('srList') }} />
      <Stack.Screen name="srs/create" options={{ title: t('createSr') }} />
      <Stack.Screen name="srs/[uid]" options={{ title: t('editSr') }} />
    </Stack>
  );
}
