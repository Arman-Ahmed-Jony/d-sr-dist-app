import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import {
  DrawerContentScrollView,
  type DrawerContentComponentProps,
} from 'expo-router/drawer';
import { Drawer, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/src/context/AuthContext';
import { LanguageToggle } from '@/src/ui/LanguageToggle';
import { colors, spacing } from '@/src/theme/tokens';

export function DsrDrawerContent(props: DrawerContentComponentProps) {
  const { t } = useTranslation();
  const { profile, logout } = useAuth();
  const { navigation } = props;
  const close = () => navigation.closeDrawer();

  const go = (
    href: '/(dsr)/(app)/dashboard' | '/(dsr)/(app)/deliveries' | '/(dsr)/(app)/orders' | '/(dsr)/(app)/shops',
  ) => {
    close();
    router.push(href);
  };

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={styles.scroll} style={styles.drawer}>
      <View style={styles.header}>
        <Text variant="titleLarge" style={styles.appName}>
          {t('appName')}
        </Text>
        {profile?.name ? (
          <Text variant="labelLarge" style={styles.userName}>
            {profile.name}
          </Text>
        ) : null}
        {profile?.email ? (
          <Text variant="bodySmall" style={styles.userEmail}>
            {profile.email}
          </Text>
        ) : null}
      </View>
      <Drawer.Section>
        <Drawer.Item label={t('dashboard')} icon="view-dashboard-outline" onPress={() => go('/(dsr)/(app)/dashboard')} />
        <Drawer.Item label={t('deliveries')} icon="truck-outline" onPress={() => go('/(dsr)/(app)/deliveries')} />
        <Drawer.Item label={t('orders')} icon="clipboard-list-outline" onPress={() => go('/(dsr)/(app)/orders')} />
        <Drawer.Item label={t('shops')} icon="storefront-outline" onPress={() => go('/(dsr)/(app)/shops')} />
      </Drawer.Section>
      <View style={styles.itemRow}>
        <Text variant="labelLarge">{t('language')}</Text>
        <LanguageToggle />
      </View>
      <Drawer.Item
        label={t('logout')}
        icon="logout"
        onPress={() => {
          close();
          void logout();
        }}
      />
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  drawer: { backgroundColor: colors.background },
  scroll: { flexGrow: 1, paddingTop: spacing.md },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    marginBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  appName: { color: colors.primary },
  userName: { color: colors.text, marginTop: spacing.sm },
  userEmail: { color: colors.textMuted, marginTop: spacing.xs },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
});
