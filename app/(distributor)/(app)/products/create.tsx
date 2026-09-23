import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Card, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/src/context/AuthContext';
import { createProduct } from '@/src/data/repos/productsRepo';
import { AppButton, AppInput } from '@/src/ui/Form';
import { colors, spacing } from '@/src/theme/tokens';

export default function CreateProductScreen() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [name, setName] = useState('');
  const [priceText, setPriceText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    if (!profile?.distributorId) return;
    const trimmedName = name.trim();
    const pricePerCase = Number(priceText);
    if (!trimmedName || !Number.isFinite(pricePerCase) || pricePerCase < 0) {
      setError(t('errorGeneric'));
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await createProduct({
        distributorId: profile.distributorId,
        name: trimmedName,
        pricePerCase,
      });
      router.replace('/(distributor)/(app)/products');
    } catch {
      setError(t('errorCreateProduct'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Card mode="outlined">
          <Card.Content>
            <AppInput
              label={t('name')}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
            <AppInput
              label={t('pricePerCase')}
              value={priceText}
              onChangeText={setPriceText}
              keyboardType="decimal-pad"
            />
            {error ? (
              <Text variant="bodyMedium" style={styles.error}>
                {error}
              </Text>
            ) : null}
            <AppButton
              title={submitting ? t('loading') : t('createProduct')}
              onPress={onSubmit}
              disabled={submitting}
            />
          </Card.Content>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg },
  error: { color: colors.danger, marginBottom: spacing.md },
});
