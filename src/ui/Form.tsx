import { forwardRef } from 'react';
import {
  StyleSheet,
  type KeyboardTypeOptions,
  type StyleProp,
  type TextStyle,
  type View,
  type ViewStyle,
} from 'react-native';
import { Button, TextInput } from 'react-native-paper';
import { colors, spacing } from '@/src/theme/tokens';

type AppButtonProps = {
  title: string;
  variant?: 'primary' | 'ghost' | 'danger';
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  onPress?: () => void;
};

export const AppButton = forwardRef<View, AppButtonProps>(function AppButton(
  { title, variant = 'primary', style, disabled, onPress },
  ref,
) {
  return (
    <Button
      ref={ref}
      mode={variant === 'ghost' ? 'outlined' : 'contained'}
      onPress={onPress}
      disabled={disabled}
      buttonColor={variant === 'danger' ? colors.danger : undefined}
      textColor={variant === 'ghost' ? colors.text : undefined}
      contentStyle={styles.buttonContent}
      style={style}
    >
      {title}
    </Button>
  );
});

type AppInputProps = {
  label?: string;
  style?: StyleProp<TextStyle>;
  value?: string;
  onChangeText?: (text: string) => void;
  onFocus?: () => void;
  placeholder?: string;
  editable?: boolean;
  autoCorrect?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
  multiline?: boolean;
  autoComplete?: 'email' | 'password' | 'off';
  returnKeyType?: 'done' | 'go' | 'next' | 'search' | 'send';
  onSubmitEditing?: () => void;
};

const NUMERIC_KEYBOARDS = new Set<KeyboardTypeOptions>([
  'decimal-pad',
  'numeric',
  'number-pad',
]);

function sanitizeNumericInput(text: string, integersOnly: boolean): string {
  if (integersOnly) return text.replace(/\D/g, '');
  const cleaned = text.replace(/[^\d.]/g, '');
  const dot = cleaned.indexOf('.');
  if (dot === -1) return cleaned;
  return `${cleaned.slice(0, dot + 1)}${cleaned.slice(dot + 1).replace(/\./g, '')}`;
}

export function AppInput({ style, keyboardType, onChangeText, ...rest }: AppInputProps) {
  const isNumeric = keyboardType != null && NUMERIC_KEYBOARDS.has(keyboardType);
  const integersOnly = keyboardType === 'number-pad';

  return (
    <TextInput
      mode="outlined"
      dense={false}
      style={StyleSheet.flatten([styles.field, style])}
      keyboardType={keyboardType}
      inputMode={isNumeric ? (integersOnly ? 'numeric' : 'decimal') : undefined}
      onChangeText={
        isNumeric && onChangeText
          ? (text) => onChangeText(sanitizeNumericInput(text, integersOnly))
          : onChangeText
      }
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  buttonContent: { minHeight: 48 },
  field: { marginBottom: spacing.md },
});
