import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { ActivityIndicator, Card, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/src/context/AuthContext';
import {
  getProduct,
  setProductActive,
  updateProduct,
} from '@/src/data/repos/productsRepo';
import type { Product } from '@/src/domain/types';
import { AppButton, AppInput } from '@/src/ui/Form';
import { colors, spacing } from '@/src/theme/tokens';

export default function EditProductScreen() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === 'string' ? params.id : params.id?.[0];

  const [product, setProduct] = useState<Product | null>(null);
  const [name, setName] = useState('');
  const [priceText, setPriceText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id || !profile?.distributorId) return;
    setError(null);
    setLoading(true);
    try {
      const row = await getProduct(id);
      if (!row || row.distributorId !== profile.distributorId) {
        setProduct(null);
        setError(t('errorProductNotFound'));
        return;
      }
      setProduct(row);
      setName(row.name);
      setPriceText(String(row.pricePerCase));
    } catch {
      setError(t('errorProductNotFound'));
      setProduct(null);
    } finally {
      setLoading(false);
    }
  }, [id, profile?.distributorId, t]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onSave = async () => {
    if (!product) return;
    const trimmed = name.trim();
    const pricePerCase = Number(priceText);
    if (!trimmed || !Number.isFinite(pricePerCase) || pricePerCase < 0) {
      setError(t('errorGeneric'));
      return;
    }
    setError(null);
    setMessage(null);
    setSaving(true);
    try {
      await updateProduct(product.id, { name: trimmed, pricePerCase });
      setProduct({ ...product, name: trimmed, pricePerCase });
      setMessage(t('saveSuccess'));
    } catch {
      setError(t('errorSave'));
    } finally {
      setSaving(false);
    }
  };

  const onToggleActive = async () => {
    if (!product) return;
    setError(null);
    setMessage(null);
    setToggling(true);
    try {
      const next = !product.active;
      await setProductActive(product.id, next);
      setProduct({ ...product, active: next });
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

  if (!product) {
    return (
      <View style={styles.centered}>
        <Text variant="bodyMedium" style={styles.error}>
          {error ?? t('errorProductNotFound')}
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
            <AppInput
              label={t('pricePerCase')}
              value={priceText}
              onChangeText={setPriceText}
              keyboardType="decimal-pad"
            />
            <Text variant="bodySmall" style={styles.status}>
              {product.active ? t('active') : t('inactive')}
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
                  : product.active
                    ? t('deactivate')
                    : t('activate')
              }
              variant={product.active ? 'danger' : 'primary'}
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
