import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { ActivityIndicator, Card, SegmentedButtons, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/src/context/AuthContext';
import { createOrder, updateOrder } from '@/src/data/repos/ordersRepo';
import { listActiveProductsByDistributor } from '@/src/data/repos/productsRepo';
import { listShopsByDistributor } from '@/src/data/repos/shopsRepo';
import { computeLineTotal, computeOrderTotal } from '@/src/domain/orderCalc';
import { orderFormSchema } from '@/src/domain/orderSchema';
import { normalizeShopName } from '@/src/domain/normalizeShopName';
import type { LineAdjustmentMode, Order, Product, Shop } from '@/src/domain/types';
import { AppButton, AppInput } from '@/src/ui/Form';
import { SearchSelect } from '@/src/ui/SearchSelect';
import { DateField } from '@/src/ui/DateField';
import { colors, spacing } from '@/src/theme/tokens';

type DraftLine = {
  key: string;
  productId: string;
  quantityCases: string;
  adjustmentMode: LineAdjustmentMode;
  adjustmentValue: string;
  freeProductId: string;
};

function todayDate(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function newLine(): DraftLine {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    productId: '',
    quantityCases: '',
    adjustmentMode: 'discountAmount',
    adjustmentValue: '',
    freeProductId: '',
  };
}

function parseNonNeg(value: string): number {
  if (value.trim() === '') return 0;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : Number.NaN;
}

function linesFromOrder(order: Order): DraftLine[] {
  return order.lines.map((line) => ({
    key: `${line.productId}-${Math.random().toString(36).slice(2, 6)}`,
    productId: line.productId,
    quantityCases: String(line.quantityCases),
    adjustmentMode: line.adjustmentMode,
    adjustmentValue: String(
      line.adjustmentMode === 'freePcs' ? line.freePcs : line.discountAmount,
    ),
    freeProductId:
      line.adjustmentMode === 'freePcs'
        ? line.freeProductId || line.productId
        : '',
  }));
}

type Props = {
  order?: Order;
};

export function OrderForm({ order }: Props) {
  const { t } = useTranslation();
  const { profile, firebaseUser } = useAuth();
  const editing = Boolean(order);
  const [shops, setShops] = useState<Shop[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [shopId, setShopId] = useState(order?.shopId ?? '');
  const [shopQuery, setShopQuery] = useState(order?.shopName ?? '');
  const [ownerName, setOwnerName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [orderDate, setOrderDate] = useState(order?.orderDate ?? todayDate());
  const [deliveryDate, setDeliveryDate] = useState(order?.deliveryDate ?? addDays(todayDate(), 1));
  const [lines, setLines] = useState<DraftLine[]>(order ? linesFromOrder(order) : [newLine()]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!profile?.distributorId) return;
      setLoading(true);
      try {
        const [shopRows, productRows] = await Promise.all([
          listShopsByDistributor(profile.distributorId),
          listActiveProductsByDistributor(profile.distributorId),
        ]);
        if (!cancelled) {
          setShops(shopRows);
          setProducts(productRows);
        }
      } catch {
        if (!cancelled) setError(t('errorGeneric'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [profile?.distributorId, t]);

  const selectedShop = shops.find((shop) => shop.id === shopId) ?? null;
  const isNewShop = Boolean(
    shopQuery.trim() &&
      !selectedShop &&
      !shops.some((shop) => normalizeShopName(shop.name) === normalizeShopName(shopQuery)),
  );

  const productsById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  const lineTotals = lines.map((line) => {
    const product = productsById.get(line.productId);
    return computeLineTotal({
      pricePerCase: product?.pricePerCase ?? 0,
      quantityCases: parseNonNeg(line.quantityCases) || 0,
      adjustmentMode: line.adjustmentMode,
      adjustmentValue: parseNonNeg(line.adjustmentValue) || 0,
    });
  });
  const orderTotal = computeOrderTotal(lineTotals.map((lineTotal) => ({ lineTotal })));

  const updateLine = (key: string, patch: Partial<DraftLine>) => {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  };

  const onSubmit = async () => {
    if (!profile || !firebaseUser) return;
    setError(null);

    const parsedLines = lines.map((line) => ({
      productId: line.productId,
      quantityCases: parseNonNeg(line.quantityCases),
      quantityPcs: 0,
      adjustmentMode: line.adjustmentMode,
      adjustmentValue: parseNonNeg(line.adjustmentValue),
      freeProductId: line.adjustmentMode === 'freePcs' ? line.freeProductId : '',
    }));

    const result = orderFormSchema.safeParse({
      shopId: isNewShop ? undefined : shopId,
      shopName: isNewShop ? shopQuery.trim() : selectedShop?.name,
      ownerName: ownerName.trim() || undefined,
      address: address.trim() || undefined,
      phone: phone.trim() || undefined,
      orderDate,
      deliveryDate,
      lines: parsedLines,
    });

    if (!result.success) {
      const issue = result.error.issues[0];
      if (issue?.path[0] === 'shopId') setError(t('errorShopRequired'));
      else if (issue?.path.includes('freeProductId') || issue?.path.includes('productId')) {
        setError(t('errorProductRequired'));
      }
      else if (issue?.path.includes('quantityCases')) setError(t('errorCasesRequired'));
      else if (issue?.path[0] === 'deliveryDate') setError(t('errorDeliveryDate'));
      else if (issue?.message.includes('Duplicate')) setError(t('errorDuplicateProduct'));
      else if (issue?.path[0] === 'lines') setError(t('errorEmptyLines'));
      else setError(t('errorValidation'));
      return;
    }

    const shop = result.data.shopId
      ? { shopId: result.data.shopId }
      : {
          shopName: result.data.shopName ?? shopQuery.trim(),
          ownerName: result.data.ownerName,
          address: result.data.address,
          phone: result.data.phone,
        };

    setSubmitting(true);
    try {
      if (order) {
        await updateOrder({
          id: order.id,
          distributorId: profile.distributorId,
          createdBy: firebaseUser.uid,
          shop,
          orderDate: result.data.orderDate,
          deliveryDate: result.data.deliveryDate,
          lines: result.data.lines,
        });
      } else {
        await createOrder({
          distributorId: profile.distributorId,
          distributorName: profile.distributorId,
          srId: firebaseUser.uid,
          srName: profile.name,
          createdBy: firebaseUser.uid,
          shop,
          orderDate: result.data.orderDate,
          deliveryDate: result.data.deliveryDate,
          lines: result.data.lines,
          status: 'submitted',
        });
      }
      router.replace('/(sr)/(app)/orders');
    } catch {
      setError(editing ? t('errorUpdateOrder') : t('errorCreateOrder'));
    } finally {
      setSubmitting(false);
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
        <Card mode="outlined" style={styles.form}>
          <Card.Content>
          <SearchSelect
            label={t('shop')}
            placeholder={t('searchSelectShop')}
            allowCreate
            value={
              selectedShop
                ? { id: selectedShop.id, label: selectedShop.name, detail: selectedShop.area }
                : shopQuery.trim()
                  ? { id: '', label: shopQuery.trim() }
                  : null
            }
            options={shops.map((shop) => ({
              id: shop.id,
              label: shop.name,
              detail: [shop.area, shop.phone].filter(Boolean).join(' · '),
            }))}
            onSelect={(option) => {
              setShopId(option.id);
              setShopQuery(option.label);
            }}
            onQueryChange={(text) => {
              setShopQuery(text);
              const match = shops.find(
                (shop) => normalizeShopName(shop.name) === normalizeShopName(text),
              );
              setShopId(match?.id ?? '');
            }}
          />
          {isNewShop ? (
            <View style={styles.newShop}>
              <Text variant="bodySmall" style={styles.newShopHint}>
                {t('newShopHint')}
              </Text>
              <AppInput
                label={`${t('ownerName')} (${t('optional')})`}
                value={ownerName}
                onChangeText={setOwnerName}
              />
              <AppInput
                label={`${t('phone')} (${t('optional')})`}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
              <AppInput
                label={`${t('address')} (${t('optional')})`}
                value={address}
                onChangeText={setAddress}
              />
            </View>
          ) : null}

          <Text variant="bodySmall" style={styles.meta}>
            {t('srName')}: {profile?.name}
          </Text>
          <Text variant="bodySmall" style={styles.meta}>
            {t('distributorName')}: {profile?.distributorId}
          </Text>
          <Text variant="bodySmall" style={styles.meta}>
            {t('status')}: {order?.status ?? 'submitted'}
          </Text>

          <DateField label={t('orderDate')} value={orderDate} onChange={setOrderDate} />
          <DateField label={t('deliveryDate')} value={deliveryDate} onChange={setDeliveryDate} />
          </Card.Content>
        </Card>

        {lines.map((line, index) => {
          const product = productsById.get(line.productId);
          const freeProduct = productsById.get(line.freeProductId || line.productId);
          const usedIds = new Set(
            lines.filter((other) => other.key !== line.key && other.productId).map((other) => other.productId),
          );
          const available = products.filter((item) => !usedIds.has(item.id) || item.id === line.productId);

          return (
            <Card key={line.key} mode="outlined" style={styles.lineCard}>
              <Card.Content>
              <Text variant="labelLarge" style={styles.lineTitle}>
                {t('lines')} {index + 1}
              </Text>
              <SearchSelect
                label={t('products')}
                placeholder={t('searchSelectProduct')}
                value={
                  product
                    ? {
                        id: product.id,
                        label: product.name,
                        detail: `${t('pricePerCase')}: ${product.pricePerCase}`,
                      }
                    : null
                }
                options={available.map((item) => ({
                  id: item.id,
                  label: item.name,
                  detail: `${t('pricePerCase')}: ${item.pricePerCase}`,
                }))}
                onSelect={(option) => {
                  const followDefault =
                    !line.freeProductId || line.freeProductId === line.productId;
                  updateLine(line.key, {
                    productId: option.id,
                    freeProductId: followDefault ? option.id : line.freeProductId,
                  });
                }}
              />
              <Text variant="bodySmall" style={styles.meta}>
                {t('pricePerCase')}: {product?.pricePerCase ?? '—'}
              </Text>
              <AppInput
                label={t('quantityCases')}
                value={line.quantityCases}
                onChangeText={(text) => updateLine(line.key, { quantityCases: text })}
                keyboardType="decimal-pad"
              />

              <SegmentedButtons
                value={line.adjustmentMode}
                onValueChange={(value) =>
                  updateLine(line.key, {
                    adjustmentMode: value as LineAdjustmentMode,
                    freeProductId:
                      value === 'freePcs' ? line.freeProductId || line.productId : line.freeProductId,
                  })
                }
                buttons={[
                  { value: 'discountAmount', label: t('discountAmount') },
                  { value: 'freePcs', label: t('freePcs') },
                ]}
                style={styles.toggleRow}
              />

              {line.adjustmentMode === 'freePcs' ? (
                <SearchSelect
                  label={t('freeProduct')}
                  placeholder={t('searchSelectProduct')}
                  value={
                    freeProduct
                      ? {
                          id: freeProduct.id,
                          label: freeProduct.name,
                          detail: `${t('pricePerCase')}: ${freeProduct.pricePerCase}`,
                        }
                      : null
                  }
                  options={products.map((item) => ({
                    id: item.id,
                    label: item.name,
                    detail: `${t('pricePerCase')}: ${item.pricePerCase}`,
                  }))}
                  onSelect={(option) => updateLine(line.key, { freeProductId: option.id })}
                />
              ) : null}

              <AppInput
                label={
                  line.adjustmentMode === 'discountAmount' ? t('discountAmount') : t('freePcs')
                }
                value={line.adjustmentValue}
                onChangeText={(text) => updateLine(line.key, { adjustmentValue: text })}
                keyboardType="decimal-pad"
              />
              <Text variant="labelLarge" style={styles.lineTotal}>
                {t('lineTotal')}: {lineTotals[index]}
              </Text>
              {lines.length > 1 ? (
                <AppButton
                  title={t('removeLine')}
                  variant="ghost"
                  onPress={() => setLines((current) => current.filter((item) => item.key !== line.key))}
                />
              ) : null}
              </Card.Content>
            </Card>
          );
        })}

        <AppButton
          title={t('addLine')}
          variant="ghost"
          onPress={() => setLines((current) => [...current, newLine()])}
          style={styles.addLine}
        />

        {error ? (
          <Text variant="bodyMedium" style={styles.error}>
            {error}
          </Text>
        ) : null}

        <View style={styles.totalBar}>
          <Text variant="titleMedium">{t('orderTotal')}</Text>
          <Text variant="titleMedium" style={styles.totalValue}>
            {orderTotal}
          </Text>
        </View>

        <AppButton
          title={submitting ? t('loading') : editing ? t('saveOrder') : t('createOrder')}
          onPress={onSubmit}
          disabled={submitting}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, paddingBottom: spacing.xl },
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  form: { marginBottom: spacing.md },
  newShop: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.surfaceMuted,
  },
  newShopHint: { color: colors.textMuted, marginBottom: spacing.sm },
  meta: { color: colors.textMuted, marginBottom: spacing.sm },
  muted: { color: colors.textMuted },
  lineCard: { marginBottom: spacing.md },
  lineTitle: { color: colors.primary, marginBottom: spacing.sm },
  toggleRow: { marginBottom: spacing.md },
  lineTotal: { color: colors.text, marginBottom: spacing.sm },
  addLine: { marginBottom: spacing.md },
  error: { color: colors.danger, marginBottom: spacing.md },
  totalBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  totalValue: { color: colors.primary },
});
