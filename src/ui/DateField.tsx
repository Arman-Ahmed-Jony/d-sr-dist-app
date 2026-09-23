import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { TextInput } from 'react-native-paper';
import { DatePickerModal } from 'react-native-paper-dates';
import { useTranslation } from 'react-i18next';
import { spacing } from '@/src/theme/tokens';

type Props = {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
};

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function appLocale(language?: string): 'en' | 'bn' {
  return language?.startsWith('en') ? 'en' : 'bn';
}

export function DateField({ label, value, onChange }: Props) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const locale = appLocale(i18n.language);
  const display = value.toLocaleDateString(locale === 'bn' ? 'bn-BD' : 'en-US');

  return (
    <View style={styles.field}>
      <TextInput
        mode="outlined"
        label={label}
        value={display}
        editable={false}
        showSoftInputOnFocus={false}
        onPressIn={() => setOpen(true)}
        right={<TextInput.Icon icon="calendar" onPress={() => setOpen(true)} />}
      />
      <DatePickerModal
        locale={locale}
        mode="single"
        visible={open}
        date={value}
        onDismiss={() => setOpen(false)}
        onConfirm={({ date }) => {
          setOpen(false);
          if (date) onChange(startOfDay(date));
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: spacing.md },
});
