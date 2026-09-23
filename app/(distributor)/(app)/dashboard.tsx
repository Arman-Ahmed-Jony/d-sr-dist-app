import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Card, Chip, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/src/context/AuthContext';
import { colors, spacing } from '@/src/theme/tokens';

export default function DistributorDashboard() {
  const { t } = useTranslation();
  const { profile } = useAuth();

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.greeting}>
        {t('greeting', { name: profile?.name ?? '' })}
      </Text>
      <Chip compact icon="office-building-outline" style={styles.role}>
        {t('roleDistributor')}
      </Chip>
      <Text variant="bodySmall" style={styles.caption}>
        {profile?.email}
        {profile?.distributorId ? ` · ${profile.distributorId}` : ''}
      </Text>

      <Card
        mode="elevated"
        style={styles.card}
        onPress={() => router.push('/(distributor)/(app)/orders')}
      >
        <Card.Content>
          <Text variant="titleMedium">{t('orders')}</Text>
          <Text variant="bodySmall" style={styles.hint}>
            {t('orderList')}
          </Text>
        </Card.Content>
      </Card>

      <Card
        mode="elevated"
        style={styles.card}
        onPress={() => router.push('/(distributor)/(app)/products')}
      >
        <Card.Content>
          <Text variant="titleMedium">{t('products')}</Text>
          <Text variant="bodySmall" style={styles.hint}>
            {t('productList')}
          </Text>
        </Card.Content>
      </Card>

      <Card
        mode="elevated"
        style={styles.card}
        onPress={() => router.push('/(distributor)/(app)/srs')}
      >
        <Card.Content>
          <Text variant="titleMedium">{t('manageSrs')}</Text>
          <Text variant="bodySmall" style={styles.hint}>
            {t('srList')}
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
