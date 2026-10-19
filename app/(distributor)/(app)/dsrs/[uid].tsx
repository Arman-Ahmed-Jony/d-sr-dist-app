import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Card, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/src/context/AuthContext';
import { getUserProfile, setUserActive, updateUserName } from '@/src/data/repos/usersRepo';
import type { AppUser } from '@/src/domain/types';
import { AppButton, AppInput } from '@/src/ui/Form';
import { colors, spacing } from '@/src/theme/tokens';

export default function EditDsrScreen() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const params = useLocalSearchParams<{ uid: string }>();
  const uid = typeof params.uid === 'string' ? params.uid : params.uid?.[0];
  const [dsr, setDsr] = useState<AppUser | null>(null);
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
      if (!user || user.role !== 'dsr' || user.distributorId !== profile.distributorId) {
        setDsr(null);
        setError(t('errorDsrNotFound'));
        return;
      }
      setDsr(user);
      setName(user.name);
    } catch {
      setError(t('errorDsrNotFound'));
      setDsr(null);
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
    if (!dsr) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t('errorGeneric'));
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await updateUserName(dsr.id, trimmed);
      setDsr({ ...dsr, name: trimmed });
      setMessage(t('saveSuccess'));
    } catch {
      setError(t('errorSave'));
    } finally {
      setSaving(false);
    }
  };

  const onToggleActive = async () => {
    if (!dsr) return;
    setToggling(true);
    setError(null);
    setMessage(null);
    try {
      const next = !dsr.active;
      await setUserActive(dsr.id, next);
      setDsr({ ...dsr, active: next });
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
      </View>
    );
  }

  if (!dsr) {
    return (
      <View style={styles.centered}>
        <Text variant="bodyMedium" style={styles.error}>
          {error ?? t('errorDsrNotFound')}
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Card mode="outlined">
          <Card.Content>
            <AppInput label={t('name')} value={name} onChangeText={setName} autoCapitalize="words" />
            <AppInput label={t('email')} value={dsr.email} editable={false} />
            <Text variant="bodySmall" style={styles.status}>
              {dsr.active ? t('active') : t('inactive')}
            </Text>
            {error ? <Text variant="bodyMedium" style={styles.error}>{error}</Text> : null}
            {message ? <Text variant="bodyMedium" style={styles.message}>{message}</Text> : null}
            <AppButton title={saving ? t('loading') : t('save')} onPress={onSave} disabled={saving || toggling} />
            <AppButton
              title={toggling ? t('loading') : dsr.active ? t('deactivate') : t('activate')}
              variant={dsr.active ? 'danger' : 'primary'}
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
    padding: spacing.lg,
  },
  status: { color: colors.textMuted, marginBottom: spacing.md },
  error: { color: colors.danger, marginBottom: spacing.md },
  message: { color: colors.success, marginBottom: spacing.md },
  toggleBtn: { marginTop: spacing.md },
});
