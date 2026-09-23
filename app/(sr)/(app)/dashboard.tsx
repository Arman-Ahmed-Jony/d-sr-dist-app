import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Card, Chip, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/src/context/AuthContext';
import { colors, spacing } from '@/src/theme/tokens';

export default function SrDashboard() {
  const { t } = useTranslation();
  const { profile } = useAuth();

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.greeting}>
        {t('greeting', { name: profile?.name ?? '' })}
      </Text>
      <Chip compact icon="account-outline" style={styles.role}>
        {t('roleSr')}
      </Chip>
      <Text variant="bodySmall" style={styles.caption}>
        {profile?.email}
        {profile?.distributorId ? ` · ${profile.distributorId}` : ''}
      </Text>

      <Card mode="elevated" style={styles.card} onPress={() => router.push('/(sr)/(app)/orders')}>
        <Card.Content>
          <Text variant="titleMedium">{t('orders')}</Text>
          <Text variant="bodySmall" style={styles.hint}>
            {t('createOrder')}
          </Text>
        </Card.Content>
      </Card>

      <Card mode="elevated" style={styles.card} onPress={() => router.push('/(sr)/(app)/shops')}>
        <Card.Content>
          <Text variant="titleMedium">{t('shops')}</Text>
          <Text variant="bodySmall" style={styles.hint}>
            {t('shopList')}
          </Text>
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  greeting: { color: colors.primary, marginBottom: spacing.sm },
  role: { alignSelf: 'flex-start', marginBottom: spacing.sm },
  caption: { color: colors.textMuted, marginBottom: spacing.lg },
  card: { marginBottom: spacing.md },
  hint: { color: colors.textMuted, marginTop: spacing.xs },
});
