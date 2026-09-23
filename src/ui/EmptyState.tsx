import { type ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, spacing } from '@/src/theme/tokens';
import { AppButton } from '@/src/ui/Form';

type Props = {
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ icon, message, actionLabel, onAction }: Props) {
  return (
    <View style={styles.wrap}>
      <MaterialCommunityIcons name={icon} size={40} color={colors.textMuted} />
      <Text variant="bodyMedium" style={styles.message}>
        {message}
      </Text>
      {actionLabel && onAction ? (
        <AppButton title={actionLabel} variant="ghost" onPress={onAction} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  message: { color: colors.textMuted, textAlign: 'center' },
});
