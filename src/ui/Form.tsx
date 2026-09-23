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
};

export function AppInput({ style, ...rest }: AppInputProps) {
  return <TextInput mode="outlined" style={[styles.field, style]} {...rest} />;
}

const styles = StyleSheet.create({
  field: { marginBottom: spacing.md },
});
