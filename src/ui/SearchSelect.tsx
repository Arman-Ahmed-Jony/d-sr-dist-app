import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppInput } from '@/src/ui/Form';
import { colors, radii, spacing, typography } from '@/src/theme/tokens';

export type SearchSelectOption = {
  id: string;
  label: string;
  detail?: string;
};

type Props = {
  label: string;
  value: SearchSelectOption | null;
  options: SearchSelectOption[];
  onSelect: (option: SearchSelectOption) => void;
  onQueryChange?: (query: string) => void;
  placeholder?: string;
  disabled?: boolean;
  allowCreate?: boolean;
};

export function SearchSelect({
  label,
  value,
  options,
  onSelect,
  onQueryChange,
  placeholder,
  disabled,
  allowCreate,
}: Props) {
  const { t } = useTranslation();
  const [query, setQuery] = useState(value?.label ?? '');
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 12);
    return options
      .filter(
        (option) =>
          option.label.toLowerCase().includes(q) ||
          (option.detail ?? '').toLowerCase().includes(q),
      )
      .slice(0, 12);
  }, [options, query]);

  const exactMatch = options.some(
    (option) => option.label.trim().toLowerCase() === query.trim().toLowerCase(),
  );
  const showCreate = Boolean(allowCreate && query.trim() && !exactMatch);
  const displayValue = open ? query : (value?.label ?? query);

  return (
    <View style={styles.wrap}>
      <AppInput
        label={label}
        value={displayValue}
        onChangeText={(text) => {
          setQuery(text);
          setOpen(true);
          onQueryChange?.(text);
        }}
        onFocus={() => {
          setQuery(value?.label ?? query);
          setOpen(true);
        }}
        placeholder={placeholder}
        editable={!disabled}
        autoCorrect={false}
        autoCapitalize="none"
      />
      {open && !disabled ? (
        <View style={styles.dropdown}>
          <ScrollView keyboardShouldPersistTaps="handled" style={styles.dropdownScroll}>
            {showCreate ? (
              <Pressable
                onPress={() => {
                  const label = query.trim();
                  onSelect({ id: '', label });
                  setQuery(label);
                  setOpen(false);
                }}
                style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
              >
                <Text style={styles.optionLabel}>{query.trim()}</Text>
                <Text style={styles.optionDetail}>{t('useNewShopName')}</Text>
              </Pressable>
            ) : null}
            {filtered.length === 0 && !showCreate ? (
              <Text style={styles.empty}>{t('noMatches')}</Text>
            ) : (
              filtered.map((option) => (
                <Pressable
                  key={option.id}
                  onPress={() => {
                    onSelect(option);
                    setQuery(option.label);
                    setOpen(false);
                  }}
                  style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
                >
                  <Text style={styles.optionLabel}>{option.label}</Text>
                  {option.detail ? <Text style={styles.optionDetail}>{option.detail}</Text> : null}
                </Pressable>
              ))
            )}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { zIndex: 2 },
  dropdown: {
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    maxHeight: 220,
  },
  dropdownScroll: { maxHeight: 220 },
  option: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionPressed: { backgroundColor: colors.surfaceMuted },
  optionLabel: { ...typography.label, color: colors.text },
  optionDetail: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  empty: {
    ...typography.caption,
    color: colors.textMuted,
    padding: spacing.md,
  },
});
