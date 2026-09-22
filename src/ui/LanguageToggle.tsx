import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { setAppLanguage, type AppLanguage } from '@/src/i18n';
import { colors, radii, spacing, typography } from '@/src/theme/tokens';

type Props = {
  style?: StyleProp<ViewStyle>;
};

export function LanguageToggle({ style }: Props) {
  const { i18n } = useTranslation();
  const current: AppLanguage = i18n.language?.startsWith('en') ? 'en' : 'bn';
  const next: AppLanguage = current === 'bn' ? 'en' : 'bn';
  const label = next === 'en' ? 'EN' : 'বাং';

  const onPress = () => {
    void setAppLanguage(next);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Switch language to ${next}`}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, style]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: 44,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
  label: { ...typography.label, color: colors.primary },
});
