import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/src/context/AuthContext';
import { getShop, updateShop } from '@/src/data/repos/shopsRepo';
import { listOrdersByShop } from '@/src/data/repos/ordersRepo';
import type { Order, Shop } from '@/src/domain/types';
import { AppButton, AppInput } from '@/src/ui/Form';
import { colors, radii, spacing, typography } from '@/src/theme/tokens';

type Props = {
  shopId: string;
};

export function ShopDetailView({ shopId }: Props) {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [shop, setShop] = useState<Shop | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [area, setArea] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!shopId || !profile?.distributorId) {
      setLoading(false);
      if (!shopId) {
        setShop(null);
        setError(t('errorShopNotFound'));
      }
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const row = await getShop(shopId);
      if (!row || row.distributorId !== profile.distributorId) {
        setShop(null);
        setOrders([]);
        setError(t('errorShopNotFound'));
        return;
      }
      setShop(row);
      setName(row.name);
      setPhone(row.phone);
      setAddress(row.address);
      setArea(row.area);
      setOwnerName(row.ownerName);

      try {
        const shopOrders = await listOrdersByShop(row.id);
        setOrders(shopOrders);
      } catch (ordersErr) {
        console.error('listOrdersByShop failed', ordersErr);
        setOrders([]);
      }
    } catch (e) {
      console.error('getShop failed', e);
      setError(t('errorShopNotFound'));
      setShop(null);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [shopId, profile?.distributorId, t]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onSave = async () => {
    if (!shop) return;
    if (!name.trim()) {
      setError(t('errorGeneric'));
      return;
    }
    setError(null);
    setMessage(null);
    setSaving(true);
    try {
      await updateShop(shop.id, { name, phone, address, area, ownerName });
      setShop({
        ...shop,
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        area: area.trim(),
        ownerName: ownerName.trim(),
      });
      setMessage(t('saveSuccess'));
    } catch {
      setError(t('errorSave'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.muted}>{t('loading')}</Text>
      </View>
    );
  }

  if (!shop) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error ?? t('errorShopNotFound')}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.form}>
          <AppInput label={t('name')} value={name} onChangeText={setName} autoCapitalize="words" />
          <AppInput
            label={t('ownerName')}
            value={ownerName}
            onChangeText={setOwnerName}
            autoCapitalize="words"
          />
          <AppInput
            label={t('phone')}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          <AppInput label={t('area')} value={area} onChangeText={setArea} />
          <AppInput
            label={t('address')}
            value={address}
            onChangeText={setAddress}
            multiline
            style={styles.multiline}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <AppButton
            title={saving ? t('loading') : t('save')}
            onPress={onSave}
            disabled={saving}
          />
        </View>

        <Text style={styles.sectionTitle}>{t('previousOrders')}</Text>
        {orders.length === 0 ? (
          <Text style={styles.muted}>{t('emptyShopOrders')}</Text>
        ) : (
          orders.map((order) => {
            const total = order.lines.reduce((sum, line) => sum + line.lineTotal, 0);
            return (
              <View key={order.id} style={styles.orderRow}>
                <Text style={styles.orderTitle}>
                  {order.createdAt.toLocaleDateString()} · {order.status}
                </Text>
                <Text style={styles.orderMeta}>
                  {order.lines.length} {t('lines')} · {total}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, padding: spacing.lg, paddingBottom: spacing.xl },
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  form: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  multiline: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  sectionTitle: {
    ...typography.heading,
    color: colors.text,
    marginBottom: spacing.md,
  },
  orderRow: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  orderTitle: { ...typography.label, color: colors.text },
  orderMeta: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  error: { color: colors.danger, marginBottom: spacing.md },
  message: { color: colors.success, marginBottom: spacing.md },
  muted: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
});
