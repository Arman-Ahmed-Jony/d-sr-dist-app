import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/src/context/AuthContext';
import { AppButton, AppInput } from '@/src/ui/Form';
import { LanguageToggle } from '@/src/ui/LanguageToggle';
import { colors, spacing } from '@/src/theme/tokens';

export default function LoginScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { login, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const onSubmit = async () => {
    setLocalError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : t('errorGeneric'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LanguageToggle style={[styles.langToggle, { top: insets.top + spacing.sm }]} />

      <View style={styles.hero}>
        <Text variant="displaySmall" style={styles.brand}>
          {t('appName')}
        </Text>
        <Text variant="headlineSmall">{t('loginTitle')}</Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          {t('loginSubtitle')}
        </Text>
      </View>

      <Card mode="outlined">
        <Card.Content>
          <AppInput
            label={t('email')}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <AppInput
            label={t('password')}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          {localError || error ? (
            <Text variant="bodyMedium" style={styles.error}>
              {localError || error}
            </Text>
          ) : null}
          <AppButton
            title={submitting ? t('loading') : t('login')}
            onPress={onSubmit}
            disabled={submitting}
          />
        </Card.Content>
      </Card>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  langToggle: {
    position: 'absolute',
    right: spacing.lg,
    zIndex: 1,
  },
  hero: { marginBottom: spacing.xl },
  brand: {
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  subtitle: { color: colors.textMuted, marginTop: spacing.xs },
  error: { color: colors.danger, marginBottom: spacing.md },
});
