import { ScrollView, StyleSheet, View } from 'react-native';
import { Chip, Modal, Portal, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import type { OrderStatus } from '@/src/domain/types';
import type {
  OrderTableFilters,
  OrderTableGroupBy,
  OrderTableSortKey,
  OrderTableView,
} from '@/src/domain/orderTable';
import { AppButton } from '@/src/ui/Form';
import { SearchSelect } from '@/src/ui/SearchSelect';
import { DateField } from '@/src/ui/DateField';
import { colors, spacing } from '@/src/theme/tokens';

const STATUSES: OrderStatus[] = ['draft', 'submitted', 'confirmed', 'cancelled'];

type NamedOption = { id: string; label: string };

type Props = {
  visible: boolean;
  onClose: () => void;
  view: OrderTableView;
  onViewChange: (view: OrderTableView) => void;
  filters: OrderTableFilters;
  onFiltersChange: (patch: OrderTableFilters) => void;
  groupBy: OrderTableGroupBy;
  onGroupByChange: (groupBy: OrderTableGroupBy) => void;
  shops: NamedOption[];
  srs: NamedOption[];
  products: NamedOption[];
};

export function sortKeyLabel(key: OrderTableSortKey, t: (key: string) => string): string {
  switch (key) {
    case 'shop':
      return t('shop');
    case 'sr':
      return t('srName');
    case 'status':
      return t('status');
    case 'orderDate':
      return t('orderDate');
    case 'deliveryDate':
      return t('deliveryDate');
    case 'money':
      return t('orderTotal');
    case 'cases':
      return t('quantityCases');
    case 'product':
      return t('products');
    case 'freePcs':
      return t('freePcs');
    case 'lineTotal':
      return t('lineTotal');
    default:
      return key;
  }
}

export function groupByLabel(key: OrderTableGroupBy, t: (key: string) => string): string {
  switch (key) {
    case 'none':
      return t('groupNone');
    case 'shop':
      return t('shop');
    case 'sr':
      return t('srName');
    case 'status':
      return t('status');
    case 'orderDate':
      return t('orderDate');
    case 'product':
      return t('products');
    default:
      return key;
  }
}

function ChoiceChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Chip selected={active} onPress={onPress} compact style={styles.chip}>
      {label}
    </Chip>
  );
}

function OptionalDate({
  label,
  value,
  onChange,
  anyLabel,
  clearLabel,
}: {
  label: string;
  value?: Date;
  onChange: (date?: Date) => void;
  anyLabel: string;
  clearLabel: string;
}) {
  if (!value) {
    return (
      <View style={styles.dateField}>
        <Text variant="labelLarge" style={styles.dateLabel}>
          {label}
        </Text>
        <AppButton title={anyLabel} variant="ghost" onPress={() => onChange(new Date())} />
      </View>
    );
  }
  return (
    <View style={styles.dateField}>
      <DateField label={label} value={value} onChange={onChange} />
      <AppButton title={clearLabel} variant="ghost" onPress={() => onChange(undefined)} />
    </View>
  );
}

export function OrderTableCriteriaSheet({
  visible,
  onClose,
  view,
  onViewChange,
  filters,
  onFiltersChange,
  groupBy,
  onGroupByChange,
  shops,
  srs,
  products,
}: Props) {
  const { t } = useTranslation();
  const allOption = { id: '', label: t('all') };
  const selectedShop = shops.find((shop) => shop.id === filters.shopId);
  const selectedSr = srs.find((sr) => sr.id === filters.srId);
  const selectedProduct = products.find((product) => product.id === filters.productId);

  const groupKeys: OrderTableGroupBy[] =
    view === 'order'
      ? ['none', 'shop', 'sr', 'status', 'orderDate']
      : ['none', 'shop', 'sr', 'status', 'orderDate', 'product'];

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onClose} contentContainerStyle={styles.panel}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.panelContent}>
          <Text variant="titleLarge" style={styles.title}>
            {t('tableFilters')}
          </Text>

          <View style={styles.section}>
            <Text variant="labelLarge" style={styles.sectionLabel}>
              {t('viewMode')}
            </Text>
            <View style={styles.chipRow}>
              <ChoiceChip
                label={t('viewOrders')}
                active={view === 'order'}
                onPress={() => onViewChange('order')}
              />
              <ChoiceChip
                label={t('viewLines')}
                active={view === 'line'}
                onPress={() => onViewChange('line')}
              />
            </View>
          </View>

          <SearchSelect
            label={t('shop')}
            placeholder={t('searchSelectShop')}
            value={selectedShop ? { id: selectedShop.id, label: selectedShop.label } : allOption}
            options={[allOption, ...shops]}
            onSelect={(option) => onFiltersChange({ shopId: option.id || undefined })}
          />
          <SearchSelect
            label={t('srName')}
            placeholder={t('searchSelectSr')}
            value={selectedSr ? { id: selectedSr.id, label: selectedSr.label } : allOption}
            options={[allOption, ...srs]}
            onSelect={(option) => onFiltersChange({ srId: option.id || undefined })}
          />
          <SearchSelect
            label={t('products')}
            placeholder={t('searchSelectProduct')}
            value={
              selectedProduct
                ? { id: selectedProduct.id, label: selectedProduct.label }
                : allOption
            }
            options={[allOption, ...products]}
            onSelect={(option) => onFiltersChange({ productId: option.id || undefined })}
          />

          <View style={styles.section}>
            <Text variant="labelLarge" style={styles.sectionLabel}>
              {t('status')}
            </Text>
            <View style={styles.chipRow}>
              <ChoiceChip
                label={t('all')}
                active={!filters.status}
                onPress={() => onFiltersChange({ status: undefined })}
              />
              {STATUSES.map((status) => (
                <ChoiceChip
                  key={status}
                  label={status}
                  active={filters.status === status}
                  onPress={() => onFiltersChange({ status })}
                />
              ))}
            </View>
          </View>

          <View style={styles.dateRow}>
            <OptionalDate
              label={t('orderDateFrom')}
              value={filters.orderDateFrom}
              onChange={(date) => onFiltersChange({ orderDateFrom: date })}
              anyLabel={t('anyDate')}
              clearLabel={t('clearDate')}
            />
            <OptionalDate
              label={t('orderDateTo')}
              value={filters.orderDateTo}
              onChange={(date) => onFiltersChange({ orderDateTo: date })}
              anyLabel={t('anyDate')}
              clearLabel={t('clearDate')}
            />
          </View>
          <View style={styles.dateRow}>
            <OptionalDate
              label={t('deliveryDateFrom')}
              value={filters.deliveryDateFrom}
              onChange={(date) => onFiltersChange({ deliveryDateFrom: date })}
              anyLabel={t('anyDate')}
              clearLabel={t('clearDate')}
            />
            <OptionalDate
              label={t('deliveryDateTo')}
              value={filters.deliveryDateTo}
              onChange={(date) => onFiltersChange({ deliveryDateTo: date })}
              anyLabel={t('anyDate')}
              clearLabel={t('clearDate')}
            />
          </View>

          <View style={styles.section}>
            <Text variant="labelLarge" style={styles.sectionLabel}>
              {t('groupBy')}
            </Text>
            <View style={styles.chipRow}>
              {groupKeys.map((key) => (
                <ChoiceChip
                  key={key}
                  label={groupByLabel(key, t)}
                  active={
                    groupBy === key ||
                    (view === 'order' && key === 'none' && groupBy === 'product')
                  }
                  onPress={() => onGroupByChange(key)}
                />
              ))}
            </View>
          </View>

          <AppButton title={t('done')} onPress={onClose} />
        </ScrollView>
      </Modal>
    </Portal>
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
  panelContent: { padding: spacing.lg, paddingBottom: spacing.xl },
  title: { color: colors.primary, marginBottom: spacing.md },
  section: { marginBottom: spacing.md },
  sectionLabel: { color: colors.text, marginBottom: spacing.xs },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: { marginRight: 0 },
  dateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  dateField: { flexGrow: 1, flexBasis: 140, marginBottom: spacing.sm },
  dateLabel: { color: colors.text, marginBottom: spacing.xs },
});
