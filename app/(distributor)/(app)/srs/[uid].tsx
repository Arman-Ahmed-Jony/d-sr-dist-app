import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { ActivityIndicator, Card, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/src/context/AuthContext';
import {
  getUserProfile,
  setUserActive,
  updateUserName,
} from '@/src/data/repos/usersRepo';
import type { AppUser } from '@/src/domain/types';
import { AppButton, AppInput } from '@/src/ui/Form';
import { colors, spacing } from '@/src/theme/tokens';

export default function EditSrScreen() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const params = useLocalSearchParams<{ uid: string }>();
  const uid = typeof params.uid === 'string' ? params.uid : params.uid?.[0];

  const [sr, setSr] = useState<AppUser | null>(null);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!uid || !profile?.distributorId) return;
    setError(null);
    setLoading(true);
    try {
      const user = await getUserProfile(uid);
      if (
        !user ||
        user.role !== 'sr' ||
        user.distributorId !== profile.distributorId
      ) {
        setSr(null);
        setError(t('errorNotFound'));
        return;
      }
      setSr(user);
      setName(user.name);
    } catch {
      setError(t('errorNotFound'));
      setSr(null);
    } finally {
      setLoading(false);
    }
  }, [uid, profile?.distributorId, t]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onSave = async () => {
    if (!sr) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t('errorGeneric'));
      return;
    }
    setError(null);
    setMessage(null);
    setSaving(true);
    try {
      await updateUserName(sr.id, trimmed);
      setSr({ ...sr, name: trimmed });
      setMessage(t('saveSuccess'));
    } catch {
      setError(t('errorSave'));
    } finally {
      setSaving(false);
    }
  };

  const onToggleActive = async () => {
    if (!sr) return;
    setError(null);
    setMessage(null);
    setToggling(true);
    try {
      const next = !sr.active;
      await setUserActive(sr.id, next);
      setSr({ ...sr, active: next });
      setMessage(t('saveSuccess'));
    } catch {
      setError(t('errorSave'));
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
        <Text variant="bodyMedium" style={styles.muted}>
          {t('loading')}
        </Text>
      </View>
    );
  }

  if (!sr) {
    return (
      <View style={styles.centered}>
        <Text variant="bodyMedium" style={styles.error}>
          {error ?? t('errorNotFound')}
        </Text>
      </View>
    );
  }

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
            <AppInput label={t('email')} value={sr.email} editable={false} />
            <Text variant="bodySmall" style={styles.status}>
              {t('role')}: {sr.role} · {sr.active ? t('active') : t('inactive')}
            </Text>
            {error ? (
              <Text variant="bodyMedium" style={styles.error}>
                {error}
              </Text>
            ) : null}
            {message ? (
              <Text variant="bodyMedium" style={styles.message}>
                {message}
              </Text>
            ) : null}
            <AppButton
              title={saving ? t('loading') : t('save')}
              onPress={onSave}
              disabled={saving || toggling}
            />
            <AppButton
              title={
                toggling
                  ? t('loading')
                  : sr.active
                    ? t('deactivate')
                    : t('activate')
              }
              variant={sr.active ? 'danger' : 'primary'}
              onPress={onToggleActive}
              disabled={saving || toggling}
              style={styles.toggleBtn}
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
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  status: {
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  error: { color: colors.danger, marginBottom: spacing.md },
  message: { color: colors.success, marginBottom: spacing.md },
  muted: { color: colors.textMuted },
  toggleBtn: { marginTop: spacing.md },
});
