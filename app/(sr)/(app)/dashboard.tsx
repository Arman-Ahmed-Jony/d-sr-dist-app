import { StyleSheet } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/src/context/AuthContext';
import { colors, spacing } from '@/src/theme/tokens';

export default function SrDashboard() {
  const { t } = useTranslation();
  const { profile } = useAuth();

  return (
    <Card mode="outlined" style={styles.container}>
      <Card.Content>
        <Text variant="headlineMedium" style={styles.title}>
          {t('dashboard')}
        </Text>
        <Text variant="bodyLarge" style={styles.meta}>
          {t('name')}: {profile?.name}
        </Text>
        <Text variant="bodyLarge" style={styles.meta}>
          {t('email')}: {profile?.email}
        </Text>
        <Text variant="bodyLarge" style={styles.meta}>
          {t('role')}: {profile?.role}
        </Text>
        <Text variant="bodyLarge" style={styles.meta}>
          {t('distributorId')}: {profile?.distributorId}
        </Text>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    margin: spacing.lg,
  },
  title: { color: colors.primary, marginBottom: spacing.md },
  meta: { color: colors.text, marginBottom: spacing.sm },
});
