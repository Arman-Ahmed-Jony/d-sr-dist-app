import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/src/context/AuthContext';
import { AppButton } from '@/src/ui/Form';
import { colors, spacing, typography } from '@/src/theme/tokens';

export default function DistributorDashboard() {
  const { t } = useTranslation();
  const { profile, logout } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('dashboard')}</Text>
      <Text style={styles.meta}>
        {t('name')}: {profile?.name}
      </Text>
      <Text style={styles.meta}>
        {t('email')}: {profile?.email}
      </Text>
      <Text style={styles.meta}>
        {t('role')}: {profile?.role}
      </Text>
      <Text style={styles.meta}>
        {t('distributorId')}: {profile?.distributorId}
      </Text>
      <AppButton title={t('logout')} variant="ghost" onPress={() => logout()} style={styles.logout} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: { ...typography.title, color: colors.primary, marginBottom: spacing.md },
  meta: { ...typography.body, color: colors.text },
  logout: { marginTop: spacing.xl },
});
