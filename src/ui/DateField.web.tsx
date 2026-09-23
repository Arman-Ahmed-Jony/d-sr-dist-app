import { createElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '@/src/theme/tokens';

type Props = {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
};

function toInputDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function DateField({ label, value, onChange }: Props) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.webInputWrap}>
        {createElement('input', {
          type: 'date',
          value: toInputDate(value),
          onChange: (event: { target: { value: string } }) => {
            const next = event.target.value;
            const [year, month, day] = next.split('-').map(Number);
            if (!year || !month || !day) return;
            onChange(new Date(year, month - 1, day));
          },
          style: webInputStyle,
        })}
      </View>
    </View>
  );
}

const webInputStyle = {
  width: '100%',
  border: 'none',
  background: 'transparent',
  fontSize: 16,
  color: colors.text,
  padding: 0,
  outline: 'none',
} as const;

const styles = StyleSheet.create({
  field: { gap: spacing.xs, marginBottom: spacing.md },
  label: { ...typography.label, color: colors.text },
  webInputWrap: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
});
