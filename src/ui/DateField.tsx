import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Button, TextInput } from 'react-native-paper';
import { spacing } from '@/src/theme/tokens';

type Props = {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
};

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function DateField({ label, value, onChange }: Props) {
  const [open, setOpen] = useState(false);

  const onNativeChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setOpen(false);
    if (event.type === 'dismissed') {
      setOpen(false);
      return;
    }
    if (date) onChange(startOfDay(date));
  };

  return (
    <View style={styles.field}>
      <TextInput
        mode="outlined"
        label={label}
        value={value.toLocaleDateString()}
        editable={false}
        onPressIn={() => setOpen(true)}
        right={<TextInput.Icon icon="calendar" onPress={() => setOpen(true)} />}
      />
      {open ? (
        <DateTimePicker
          value={value}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={onNativeChange}
        />
      ) : null}
      {open && Platform.OS === 'ios' ? (
        <Button mode="text" onPress={() => setOpen(false)} style={styles.done}>
          OK
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: spacing.md },
  done: { alignSelf: 'flex-end' },
});
