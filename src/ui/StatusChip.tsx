import { Chip } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import type { OrderStatus } from '@/src/domain/types';
import { colors } from '@/src/theme/tokens';

const STATUS_KEY = {
  draft: 'statusDraft',
  submitted: 'statusSubmitted',
  confirmed: 'statusConfirmed',
  cancelled: 'statusCancelled',
} as const;

export function StatusChip({ status, pending }: { status: OrderStatus; pending?: boolean }) {
  const { t } = useTranslation();
  if (pending) {
    return (
      <Chip compact style={{ backgroundColor: colors.surfaceMuted }}>
        {t('statusPending')}
      </Chip>
    );
  }
  const selected = status === 'submitted' || status === 'confirmed';
  const style =
    status === 'confirmed'
      ? { backgroundColor: colors.surfaceMuted }
      : status === 'cancelled'
        ? { backgroundColor: '#F9D2CF' }
        : status === 'submitted'
          ? undefined
          : { backgroundColor: colors.surfaceMuted };

  return (
    <Chip compact selected={selected} selectedColor={status === 'cancelled' ? colors.danger : undefined} style={style}>
      {t(STATUS_KEY[status])}
    </Chip>
  );
}
