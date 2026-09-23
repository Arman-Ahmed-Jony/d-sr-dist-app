import { createElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { TextInput } from 'react-native-paper';
import { colors, spacing } from '@/src/theme/tokens';

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
      <TextInput
        mode="outlined"
        label={label}
        value={toInputDate(value)}
        render={(innerProps) =>
          createElement('input', {
            type: 'date',
            value: toInputDate(value),
            onChange: (event: { target: { value: string } }) => {
              const next = event.target.value;
              const [year, month, day] = next.split('-').map(Number);
              if (!year || !month || !day) return;
              onChange(new Date(year, month - 1, day));
            },
            style: {
              ...(typeof innerProps.style === 'object' && innerProps.style ? innerProps.style : {}),
              width: '100%',
              border: 'none',
              background: 'transparent',
              fontSize: 16,
              color: colors.text,
              outline: 'none',
            },
          })
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: spacing.md },
});
