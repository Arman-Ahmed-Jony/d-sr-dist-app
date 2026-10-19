import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Card, Chip, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/src/context/AuthContext';
import { colors, spacing } from '@/src/theme/tokens';

export default function DsrDashboard() {
  const { t } = useTranslation();
  const { profile } = useAuth();

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.greeting}>
        {t('greeting', { name: profile?.name ?? '' })}
      </Text>
      <Chip compact icon="truck-outline" style={styles.role}>
        {t('roleDsr')}
      </Chip>
      <Card mode="elevated" style={styles.card} onPress={() => router.push('/(dsr)/(app)/deliveries')}>
        <Card.Content>
          <Text variant="titleMedium">{t('deliveries')}</Text>
        </Card.Content>
      </Card>
      <Card mode="elevated" style={styles.card} onPress={() => router.push('/(dsr)/(app)/orders/create')}>
        <Card.Content>
          <Text variant="titleMedium">{t('createOrder')}</Text>
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  greeting: { color: colors.primary, marginBottom: spacing.sm },
  role: { alignSelf: 'flex-start', marginBottom: spacing.lg },
  card: { marginBottom: spacing.md },
});
