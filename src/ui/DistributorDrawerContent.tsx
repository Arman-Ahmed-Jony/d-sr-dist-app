import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  DrawerContentScrollView,
  type DrawerContentComponentProps,
} from 'expo-router/drawer';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/src/context/AuthContext';
import { LanguageToggle } from '@/src/ui/LanguageToggle';
import { colors, radii, spacing, typography } from '@/src/theme/tokens';

export function DistributorDrawerContent(props: DrawerContentComponentProps) {
  const { t } = useTranslation();
  const { profile, logout } = useAuth();
  const { navigation } = props;

  const close = () => navigation.closeDrawer();

  const goDashboard = () => {
    close();
    router.push('/(distributor)/(app)/dashboard');
  };

  const goManageSrs = () => {
    close();
    router.push('/(distributor)/(app)/srs');
  };

  const goProducts = () => {
    close();
    router.push('/(distributor)/(app)/products');
  };

  const onLogout = async () => {
    close();
    await logout();
  };

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={styles.scroll}
      style={styles.drawer}
    >
      <View style={styles.header}>
        <Text style={styles.appName}>{t('appName')}</Text>
        {profile?.name ? <Text style={styles.userName}>{profile.name}</Text> : null}
        {profile?.email ? <Text style={styles.userEmail}>{profile.email}</Text> : null}
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={goDashboard}
        style={({ pressed }) => [styles.item, pressed && styles.pressed]}
      >
        <Text style={styles.itemLabel}>{t('dashboard')}</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={goProducts}
        style={({ pressed }) => [styles.item, pressed && styles.pressed]}
      >
        <Text style={styles.itemLabel}>{t('products')}</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={goManageSrs}
        style={({ pressed }) => [styles.item, pressed && styles.pressed]}
      >
        <Text style={styles.itemLabel}>{t('manageSrs')}</Text>
      </Pressable>

      <View style={styles.itemRow}>
        <Text style={styles.itemLabel}>{t('language')}</Text>
        <LanguageToggle />
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => void onLogout()}
        style={({ pressed }) => [styles.item, styles.logoutItem, pressed && styles.pressed]}
      >
        <Text style={styles.logoutLabel}>{t('logout')}</Text>
      </Pressable>
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
  appName: { ...typography.heading, color: colors.primary },
  userName: { ...typography.label, color: colors.text, marginTop: spacing.sm },
  userEmail: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  item: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    marginHorizontal: spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.sm,
  },
  itemLabel: { ...typography.label, color: colors.text },
  logoutItem: { marginTop: spacing.md },
  logoutLabel: { ...typography.label, color: colors.danger },
  pressed: { backgroundColor: colors.surfaceMuted },
});
