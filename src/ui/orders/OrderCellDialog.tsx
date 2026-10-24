import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Dialog, Portal, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import type { OrderCellField, OrderCellPatch } from '@/src/domain/orderCell';
import type { Order, OrderStatus, Product } from '@/src/domain/types';
import { listActiveProductsByDistributor } from '@/src/data/repos/productsRepo';
import { AppButton, AppInput } from '@/src/ui/Form';
import { DateField } from '@/src/ui/DateField';
import { SearchSelect } from '@/src/ui/SearchSelect';
import type { TranslationKey } from '@/src/i18n/bn';
import { statusLabel } from '@/src/ui/StatusChip';
import { colors, spacing } from '@/src/theme/tokens';

const EDIT_STATUSES: OrderStatus[] = ['submitted', 'confirmed', 'cancelled', 'delivered', 'bounced'];

export type OrderCellTarget = {
  order: Order;
  productId?: string;
  field: OrderCellField;
};

type Props = {
  target: OrderCellTarget | null;
  distributorId?: string;
  saving: boolean;
  error: string | null;
  onDismiss: () => void;
  onSave: (patch: OrderCellPatch) => void;
};

function lineFor(target: OrderCellTarget) {
  if (target.productId) return target.order.lines.find((line) => line.productId === target.productId);
  return target.order.lines.length === 1 ? target.order.lines[0] : undefined;
}

function fieldLabel(
  field: OrderCellField,
  t: (key: TranslationKey) => string,
): string {
  switch (field) {
    case 'cases':
      return t('quantityCases');
    case 'product':
      return t('products');
    case 'freePcs':
      return t('freePcs');
    case 'discount':
      return t('discountAmount');
    case 'orderDate':
      return t('orderDate');
    case 'deliveryDate':
      return t('deliveryDate');
    case 'status':
      return t('status');
  }
}

export function OrderCellDialog({ target, distributorId, saving, error, onDismiss, onSave }: Props) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [date, setDate] = useState(() => new Date());
  const [status, setStatus] = useState<OrderStatus>('submitted');
  const [productId, setProductId] = useState('');
  const [productName, setProductName] = useState('');
  const [pricePerCase, setPricePerCase] = useState(0);
  const [freeProductId, setFreeProductId] = useState('');
  const [freeProductName, setFreeProductName] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!target) return;
    const line = lineFor(target);
    setLocalError(null);
    if (target.field === 'cases') setText(line ? String(line.quantityCases) : '');
    if (target.field === 'freePcs') {
      setText(line ? String(line.freePcs) : '');
      setFreeProductId(line?.freeProductId || line?.productId || '');
      setFreeProductName(line?.freeProductName || line?.productName || '');
    }
    if (target.field === 'discount') setText(line ? String(line.discountAmount) : '');
    if (target.field === 'product') {
      setProductId(line?.productId ?? '');
      setProductName(line?.productName ?? '');
      setPricePerCase(line?.pricePerCase ?? 0);
    }
    if (target.field === 'orderDate') setDate(target.order.orderDate);
    if (target.field === 'deliveryDate') setDate(target.order.deliveryDate);
    if (target.field === 'status') setStatus(target.order.status);
  }, [target]);

  useEffect(() => {
    if (!target || (target.field !== 'freePcs' && target.field !== 'product') || !distributorId) return;
    void listActiveProductsByDistributor(distributorId)
      .then(setProducts)
      .catch((loadError) => {
        console.error('listActiveProductsByDistributor failed', loadError);
      });
  }, [target, distributorId]);

  const title = target ? fieldLabel(target.field, t) : '';
  const line = target ? lineFor(target) : undefined;

  function save() {
    if (!target || saving) return;
    setLocalError(null);
    if (target.field === 'cases' || target.field === 'freePcs' || target.field === 'discount') {
      const value = Number(text);
      if (!Number.isFinite(value) || value < 0 || (target.field === 'cases' && value <= 0)) {
        setLocalError(target.field === 'cases' ? t('errorCasesRequired') : t('errorUpdateOrder'));
        return;
      }
      if (target.field === 'cases') {
        onSave({ field: 'cases', productId: target.productId, quantityCases: value });
        return;
      }
      if (target.field === 'freePcs') {
        onSave({
          field: 'freePcs',
          productId: target.productId,
          freePcs: value,
          freeProductId,
          freeProductName,
        });
        return;
      }
      onSave({ field: 'discount', productId: target.productId, discountAmount: value });
      return;
    }
    if (target.field === 'product') {
      if (!productId || productId === line?.productId) {
        onDismiss();
        return;
      }
      onSave({
        field: 'product',
        productId: target.productId,
        nextProductId: productId,
        nextProductName: productName,
        pricePerCase,
      });
      return;
    }
    if (target.field === 'orderDate') {
      onSave({ field: 'orderDate', orderDate: date });
      return;
    }
    if (target.field === 'deliveryDate') {
      onSave({ field: 'deliveryDate', deliveryDate: date });
      return;
    }
    if (target.field === 'status') {
      if (status === target.order.status) {
        onDismiss();
        return;
      }
      onSave({ field: 'status', status });
    }
  }

  return (
    <Portal>
      <Dialog visible={target != null} onDismiss={() => !saving && onDismiss()}>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Content>
          {target ? (
            <ScrollView keyboardShouldPersistTaps="handled" style={styles.scroll}>
              <Text variant="bodySmall" style={styles.meta}>
                {line?.productName ? `${target.order.shopName} · ${line.productName}` : target.order.shopName}
              </Text>
              {target.field === 'cases' || target.field === 'freePcs' || target.field === 'discount' ? (
                <AppInput
                  label={title}
                  value={text}
                  onChangeText={setText}
                  keyboardType="decimal-pad"
                />
              ) : null}
              {target.field === 'product' ? (
                <SearchSelect
                  label={t('products')}
                  placeholder={t('searchSelectProduct')}
                  value={productId ? { id: productId, label: productName || productId } : null}
                  options={products
                    .filter(
                      (product) =>
                        product.id === line?.productId ||
                        !target.order.lines.some((item) => item.productId === product.id),
                    )
                    .map((product) => ({
                      id: product.id,
                      label: product.name,
                      detail: `${t('pricePerCase')}: ${product.pricePerCase}`,
                    }))}
                  onSelect={(option) => {
                    const product = products.find((item) => item.id === option.id);
                    setProductId(option.id);
                    setProductName(option.label);
                    setPricePerCase(product?.pricePerCase ?? 0);
                  }}
                />
              ) : null}
              {target.field === 'freePcs' ? (
                <SearchSelect
                  label={t('freeProduct')}
                  placeholder={t('searchSelectProduct')}
                  value={
                    freeProductId
                      ? { id: freeProductId, label: freeProductName || freeProductId }
                      : null
                  }
                  options={products.map((product) => ({ id: product.id, label: product.name }))}
                  onSelect={(option) => {
                    setFreeProductId(option.id);
                    setFreeProductName(option.label);
                  }}
                />
              ) : null}
              {target.field === 'orderDate' || target.field === 'deliveryDate' ? (
                <DateField label={title} value={date} onChange={setDate} />
              ) : null}
              {target.field === 'status' ? (
                <View style={styles.statuses}>
                  {EDIT_STATUSES.map((item) => (
                    <AppButton
                      key={item}
                      title={statusLabel(item, t)}
                      variant={item === status ? 'primary' : 'ghost'}
                      onPress={() => setStatus(item)}
                    />
                  ))}
                </View>
              ) : null}
              {localError || error ? (
                <Text variant="bodyMedium" style={styles.error}>
                  {localError || error}
                </Text>
              ) : null}
            </ScrollView>
          ) : null}
        </Dialog.Content>
        <Dialog.Actions>
          <AppButton title={t('cancel')} variant="ghost" onPress={onDismiss} disabled={saving} />
          <AppButton title={saving ? t('loading') : t('save')} onPress={save} disabled={saving} />
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  scroll: { maxHeight: 420 },
  meta: { color: colors.textMuted, marginBottom: spacing.md },
  statuses: { gap: spacing.sm },
  error: { color: colors.danger, marginTop: spacing.sm },
});
