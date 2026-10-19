import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Checkbox, Modal, Portal, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { AppButton } from '@/src/ui/Form';
import { colors, spacing } from '@/src/theme/tokens';

type Option = { id: string; label: string };

type Props = {
  visible: boolean;
  shops: Option[];
  products: Option[];
  exporting: boolean;
  onClose: () => void;
  onDownload: (shopIds: Set<string>, productIds: Set<string>) => void;
};

function checkState(selected: number, total: number): 'checked' | 'unchecked' | 'indeterminate' {
  if (selected === 0 || total === 0) return 'unchecked';
  if (selected === total) return 'checked';
  return 'indeterminate';
}

function toggleId(current: Set<string>, id: string): Set<string> {
  const next = new Set(current);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

function toggleAll(current: Set<string>, options: Option[]): Set<string> {
  if (options.every((option) => current.has(option.id))) return new Set();
  return new Set(options.map((option) => option.id));
}

export function InvoiceExportSheet({ visible, shops, products, exporting, onClose, onDownload }: Props) {
  const { t } = useTranslation();
  const [shopIds, setShopIds] = useState<Set<string>>(new Set());
  const [productIds, setProductIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!visible) return;
    setShopIds(new Set(shops.map((shop) => shop.id)));
    setProductIds(new Set(products.map((product) => product.id)));
  }, [visible, shops, products]);

  const canDownload = shopIds.size > 0 && productIds.size > 0 && !exporting;

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={() => {
          if (!exporting) onClose();
        }}
        contentContainerStyle={styles.panel}
      >
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <Text variant="titleLarge" style={styles.title}>
            {t('exportPick')}
          </Text>
          <CheckList
            title={t('shop')}
            allLabel={t('all')}
            options={shops}
            selected={shopIds}
            onToggle={(id) => setShopIds((current) => toggleId(current, id))}
            onToggleAll={() => setShopIds((current) => toggleAll(current, shops))}
          />
          <CheckList
            title={t('products')}
            allLabel={t('all')}
            options={products}
            selected={productIds}
            onToggle={(id) => setProductIds((current) => toggleId(current, id))}
            onToggleAll={() => setProductIds((current) => toggleAll(current, products))}
          />
          <AppButton
            title={exporting ? t('loading') : t('downloadExcel')}
            onPress={() => onDownload(shopIds, productIds)}
            disabled={!canDownload}
          />
        </ScrollView>
      </Modal>
    </Portal>
  );
}

function CheckList({
  title,
  allLabel,
  options,
  selected,
  onToggle,
  onToggleAll,
}: {
  title: string;
  allLabel: string;
  options: Option[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
}) {
  const chosen = options.filter((option) => selected.has(option.id)).length;
  return (
    <View style={styles.section}>
      <View style={styles.row}>
        <Checkbox status={checkState(chosen, options.length)} onPress={onToggleAll} color={colors.primary} />
        <Text variant="labelLarge" onPress={onToggleAll}>
          {`${title} · ${allLabel}`}
        </Text>
      </View>
      {options.map((option) => (
        <View key={option.id} style={styles.row}>
          <Checkbox
            status={selected.has(option.id) ? 'checked' : 'unchecked'}
            onPress={() => onToggle(option.id)}
            color={colors.primary}
          />
          <Text variant="bodyMedium" style={styles.option} onPress={() => onToggle(option.id)} numberOfLines={2}>
            {option.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.background,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xl,
    maxHeight: '85%',
    borderRadius: 14,
  },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  title: { color: colors.primary, marginBottom: spacing.md },
  section: { marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 40 },
  option: { flex: 1 },
});
