import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/src/context/AuthContext';
import { createShop } from '@/src/data/repos/shopsRepo';
import { AppButton, AppInput } from '@/src/ui/Form';
import { colors, radii, spacing } from '@/src/theme/tokens';

type Props = {
  listHref: '/(distributor)/(app)/shops' | '/(sr)/shops';
};

export function ShopCreateView({ listHref }: Props) {
  const { t } = useTranslation();
  const { profile, firebaseUser } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [area, setArea] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    if (!profile?.distributorId || !firebaseUser) return;
    if (!name.trim()) {
      setError(t('errorGeneric'));
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await createShop({
        distributorId: profile.distributorId,
        createdBy: firebaseUser.uid,
        name,
        phone,
        address,
        area,
        ownerName,
      });
      router.replace(listHref);
    } catch {
      setError(t('errorCreateShop'));
    } finally {
      setSubmitting(false);
    }
  };

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
          <AppButton
            title={submitting ? t('loading') : t('createShop')}
            onPress={onSubmit}
            disabled={submitting}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, padding: spacing.lg, paddingBottom: spacing.xl },
  form: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  multiline: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  error: { color: colors.danger, marginBottom: spacing.md },
});
