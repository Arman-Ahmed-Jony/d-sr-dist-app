import { Chip } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import type { OrderStatus } from '@/src/domain/types';
import type { TranslationKey } from '@/src/i18n/bn';
import { colors } from '@/src/theme/tokens';

const STATUS_KEY: Record<OrderStatus, TranslationKey> = {
  draft: 'statusDraft',
  submitted: 'statusSubmitted',
  confirmed: 'statusConfirmed',
  cancelled: 'statusCancelled',
  delivered: 'statusDelivered',
  bounced: 'statusBounced',
  partial: 'statusPartial',
};

export function statusLabel(status: OrderStatus, t: (key: TranslationKey) => string): string {
  return t(STATUS_KEY[status]);
}

export function StatusChip({
  status,
  pending,
  onPress,
}: {
  status: OrderStatus;
  pending?: boolean;
  onPress?: () => void;
}) {
  const { t } = useTranslation();
  if (pending) {
    return (
      <Chip compact onPress={onPress} style={{ backgroundColor: colors.surfaceMuted }}>
        {t('statusPending')}
      </Chip>
    );
  }
  const selected = status === 'submitted' || status === 'confirmed';
  const style =
    status === 'confirmed' || status === 'delivered'
      ? { backgroundColor: colors.surfaceMuted }
      : status === 'cancelled' || status === 'bounced'
        ? { backgroundColor: '#F9D2CF' }
        : status === 'partial'
          ? { backgroundColor: '#F8E3C8' }
          : status === 'submitted'
            ? undefined
            : { backgroundColor: colors.surfaceMuted };

  return (
    <Chip
      compact
      onPress={onPress}
      selected={selected || status === 'delivered'}
      selectedColor={status === 'cancelled' || status === 'bounced' ? colors.danger : undefined}
      style={style}
    >
      {statusLabel(status, t)}
    </Chip>
  );
}
