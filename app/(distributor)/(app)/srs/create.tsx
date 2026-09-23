import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Card, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/src/context/AuthContext';
import { registerUser } from '@/src/services/authService';
import { AppButton, AppInput } from '@/src/ui/Form';
import { colors, spacing } from '@/src/theme/tokens';

export default function CreateSrScreen() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    if (!profile?.distributorId) return;
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName || !trimmedEmail || password.length < 6) {
      setError(t('errorGeneric'));
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await registerUser({
        name: trimmedName,
        email: trimmedEmail,
        password,
        role: 'sr',
        distributorId: profile.distributorId,
      });
      router.replace('/(distributor)/(app)/srs');
    } catch {
      setError(t('errorCreateSr'));
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
            <AppInput label={t('name')} value={name} onChangeText={setName} autoCapitalize="words" />
            <AppInput
              label={t('email')}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <AppInput
              label={t('password')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            {error ? (
              <Text variant="bodyMedium" style={styles.error}>
                {error}
              </Text>
            ) : null}
            <AppButton
              title={submitting ? t('loading') : t('createSr')}
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
