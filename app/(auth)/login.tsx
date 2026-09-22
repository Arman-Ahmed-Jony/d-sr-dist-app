import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/src/context/AuthContext';
import { AppButton, AppInput } from '@/src/ui/Form';
import { LanguageToggle } from '@/src/ui/LanguageToggle';
import { colors, spacing, typography } from '@/src/theme/tokens';

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
        <Text style={styles.brand}>{t('appName')}</Text>
        <Text style={styles.title}>{t('loginTitle')}</Text>
        <Text style={styles.subtitle}>{t('loginSubtitle')}</Text>
      </View>

      <View style={styles.form}>
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
        {(localError || error) && (
          <Text style={styles.error}>{localError || error}</Text>
        )}
        <AppButton
          title={submitting ? t('loading') : t('login')}
          onPress={onSubmit}
          disabled={submitting}
        />
      </View>
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
    ...typography.title,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  title: { ...typography.heading, color: colors.text },
  subtitle: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs },
  form: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  error: { color: colors.danger, marginBottom: spacing.md },
});
