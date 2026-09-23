import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Dialog, IconButton, Portal, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { deleteDraftOrder } from '@/src/data/repos/ordersRepo';
import { AppButton } from '@/src/ui/Form';
import { colors } from '@/src/theme/tokens';

type Props = {
  orderId: string;
  distributorId: string;
  onDeleted: () => void;
  onError?: (message: string) => void;
  compact?: boolean;
};

export function DeleteDraftOrderButton({
  orderId,
  distributorId,
  onDeleted,
  onError,
  compact = false,
}: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const onConfirm = async () => {
    setDeleting(true);
    try {
      await deleteDraftOrder(orderId, distributorId);
      setOpen(false);
      onDeleted();
    } catch {
      const message = t('errorDeleteOrder');
      onError?.(message);
      setOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      {compact ? (
        <IconButton
          icon="delete-outline"
          iconColor={colors.danger}
          accessibilityLabel={t('deleteOrder')}
          onPress={() => setOpen(true)}
          disabled={deleting}
        />
      ) : (
        <AppButton
          title={t('deleteOrder')}
          variant="danger"
          onPress={() => setOpen(true)}
          disabled={deleting}
          style={styles.button}
        />
      )}
      <Portal>
        <Dialog visible={open} onDismiss={() => !deleting && setOpen(false)}>
          <Dialog.Title>{t('deleteOrder')}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">{t('deleteDraftConfirm')}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <AppButton
              title={t('cancel')}
              variant="ghost"
              onPress={() => setOpen(false)}
              disabled={deleting}
            />
            <AppButton
              title={deleting ? t('loading') : t('deleteOrder')}
              variant="danger"
              onPress={onConfirm}
              disabled={deleting}
            />
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  button: { marginTop: 8 },
});
