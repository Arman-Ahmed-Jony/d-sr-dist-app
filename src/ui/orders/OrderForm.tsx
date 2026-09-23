import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
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
import { colors, radii, spacing, typography } from '@/src/theme/tokens';

type DraftLine = {
  key: string;
  productId: string;
  quantityCases: string;
  quantityPcs: string;
  adjustmentMode: LineAdjustmentMode;
  adjustmentValue: string;
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
    quantityPcs: '',
    adjustmentMode: 'discountAmount',
    adjustmentValue: '',
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
    quantityPcs: String(line.quantityPcs ?? ''),
    adjustmentMode: line.adjustmentMode,
    adjustmentValue: String(
      line.adjustmentMode === 'freePcs' ? line.freePcs : line.discountAmount,
    ),
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
      quantityPcs: parseNonNeg(line.quantityPcs),
      adjustmentMode: line.adjustmentMode,
      adjustmentValue: parseNonNeg(line.adjustmentValue),
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
      else if (issue?.path.includes('productId')) setError(t('errorProductRequired'));
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
        <Text style={styles.muted}>{t('loading')}</Text>
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
              <Text style={styles.newShopHint}>{t('newShopHint')}</Text>
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

          <Text style={styles.meta}>
            {t('srName')}: {profile?.name}
          </Text>
          <Text style={styles.meta}>
            {t('distributorName')}: {profile?.distributorId}
          </Text>
          <Text style={styles.meta}>
            {t('status')}: {order?.status ?? 'submitted'}
          </Text>

          <DateField label={t('orderDate')} value={orderDate} onChange={setOrderDate} />
          <DateField label={t('deliveryDate')} value={deliveryDate} onChange={setDeliveryDate} />
        </View>

        {lines.map((line, index) => {
          const product = productsById.get(line.productId);
          const usedIds = new Set(
            lines.filter((other) => other.key !== line.key && other.productId).map((other) => other.productId),
          );
          const available = products.filter((item) => !usedIds.has(item.id) || item.id === line.productId);

          return (
            <View key={line.key} style={styles.lineCard}>
              <Text style={styles.lineTitle}>
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
                onSelect={(option) => updateLine(line.key, { productId: option.id })}
              />
              <Text style={styles.meta}>
                {t('pricePerCase')}: {product?.pricePerCase ?? '—'}
              </Text>
              <View style={styles.row}>
                <View style={styles.half}>
                  <AppInput
                    label={t('quantityCases')}
                    value={line.quantityCases}
                    onChangeText={(text) => updateLine(line.key, { quantityCases: text })}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.half}>
                  <AppInput
                    label={t('quantityPcs')}
                    value={line.quantityPcs}
                    onChangeText={(text) => updateLine(line.key, { quantityPcs: text })}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.toggleRow}>
                <Pressable
                  onPress={() => updateLine(line.key, { adjustmentMode: 'discountAmount' })}
                  style={[
                    styles.toggle,
                    line.adjustmentMode === 'discountAmount' && styles.toggleActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      line.adjustmentMode === 'discountAmount' && styles.toggleTextActive,
                    ]}
                  >
                    {t('discountAmount')}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => updateLine(line.key, { adjustmentMode: 'freePcs' })}
                  style={[styles.toggle, line.adjustmentMode === 'freePcs' && styles.toggleActive]}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      line.adjustmentMode === 'freePcs' && styles.toggleTextActive,
                    ]}
                  >
                    {t('freePcs')}
                  </Text>
                </Pressable>
              </View>

              <AppInput
                label={
                  line.adjustmentMode === 'discountAmount' ? t('discountAmount') : t('freePcs')
                }
                value={line.adjustmentValue}
                onChangeText={(text) => updateLine(line.key, { adjustmentValue: text })}
                keyboardType="decimal-pad"
              />
              <Text style={styles.lineTotal}>
                {t('lineTotal')}: {lineTotals[index]}
              </Text>
              {lines.length > 1 ? (
                <AppButton
                  title={t('removeLine')}
                  variant="ghost"
                  onPress={() => setLines((current) => current.filter((item) => item.key !== line.key))}
                />
              ) : null}
            </View>
          );
        })}

        <AppButton
          title={t('addLine')}
          variant="ghost"
          onPress={() => setLines((current) => [...current, newLine()])}
          style={styles.addLine}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.totalBar}>
          <Text style={styles.totalLabel}>{t('orderTotal')}</Text>
          <Text style={styles.totalValue}>{orderTotal}</Text>
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
  },
  form: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  newShop: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.surfaceMuted,
  },
  newShopHint: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.sm },
  meta: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.sm },
  muted: { ...typography.body, color: colors.textMuted },
  lineCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  lineTitle: { ...typography.label, color: colors.primary, marginBottom: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  half: { flex: 1 },
  toggleRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  toggle: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  toggleActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  toggleText: { ...typography.label, color: colors.text },
  toggleTextActive: { color: colors.white },
  lineTotal: { ...typography.label, color: colors.text, marginBottom: spacing.sm },
  addLine: { marginBottom: spacing.md },
  error: { color: colors.danger, marginBottom: spacing.md },
  totalBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  totalLabel: { ...typography.heading, color: colors.text },
  totalValue: { ...typography.heading, color: colors.primary },
});
