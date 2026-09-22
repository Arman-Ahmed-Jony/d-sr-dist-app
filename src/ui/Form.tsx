import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { colors, radii, spacing, typography } from '@/src/theme/tokens';

export function AppButton({
  title,
  variant = 'primary',
  style,
  disabled,
  onPress,
}: {
  title: string;
  variant?: 'primary' | 'ghost' | 'danger';
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'ghost' && styles.buttonGhost,
        variant === 'danger' && styles.buttonDanger,
        (pressed || disabled) && styles.buttonPressed,
        style,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          variant === 'ghost' && styles.buttonTextGhost,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

export function AppInput(props: TextInputProps & { label?: string }) {
  const { label, style, ...rest } = props;
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[styles.input, style]}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  buttonGhost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonDanger: { backgroundColor: colors.danger },
  buttonPressed: { opacity: 0.85 },
  buttonText: { ...typography.label, color: colors.white },
  buttonTextGhost: { color: colors.text },
  field: { gap: spacing.xs, marginBottom: spacing.md },
  label: { ...typography.label, color: colors.text },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    ...typography.body,
    color: colors.text,
  },
});
