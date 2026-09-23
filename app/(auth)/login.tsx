import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Card, HelperText, Snackbar, Text } from 'react-native-paper';
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

  const displayError = localError || error;

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
      style={[styles.container, { paddingTop: insets.top + spacing.sm }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.topRow}>
        <LanguageToggle />
      </View>

      <View style={styles.body}>
        <View style={styles.hero}>
          <Avatar.Icon icon="leaf" size={56} style={styles.mark} color={colors.white} />
          <Text variant="headlineMedium" style={styles.brand}>
            {t('appName')}
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            {t('loginSubtitle')}
          </Text>
        </View>

        <Card mode="elevated">
          <Card.Content>
            <AppInput
              label={t('email')}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              returnKeyType="next"
              value={email}
              onChangeText={setEmail}
            />
            <AppInput
              label={t('password')}
              autoComplete="password"
              secureTextEntry
              returnKeyType="go"
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={() => {
                if (!submitting) void onSubmit();
              }}
            />
            <HelperText type="error" visible={Boolean(displayError)}>
              {displayError}
            </HelperText>
            <AppButton
              title={submitting ? t('loading') : t('login')}
              onPress={onSubmit}
              disabled={submitting}
            />
          </Card.Content>
        </Card>
      </View>

      <Snackbar visible={Boolean(displayError)} onDismiss={() => setLocalError(null)} duration={4000}>
        {displayError}
      </Snackbar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  topRow: { alignItems: 'flex-end', marginBottom: spacing.md },
  body: { flex: 1, justifyContent: 'center' },
  hero: { marginBottom: spacing.xl },
  mark: { backgroundColor: colors.primary, marginBottom: spacing.md },
  brand: { color: colors.primary, marginBottom: spacing.xs },
  subtitle: { color: colors.textMuted },
});
