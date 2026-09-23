import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { List, Surface, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { AppInput } from '@/src/ui/Form';
import { colors, radii, spacing } from '@/src/theme/tokens';

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
        <Surface style={styles.dropdown} elevation={2}>
          <ScrollView keyboardShouldPersistTaps="handled" style={styles.dropdownScroll}>
            {showCreate ? (
              <List.Item
                title={query.trim()}
                description={t('useNewShopName')}
                onPress={() => {
                  const nextLabel = query.trim();
                  onSelect({ id: '', label: nextLabel });
                  setQuery(nextLabel);
                  setOpen(false);
                }}
              />
            ) : null}
            {filtered.length === 0 && !showCreate ? (
              <Text variant="bodySmall" style={styles.empty}>
                {t('noMatches')}
              </Text>
            ) : (
              filtered.map((option) => (
                <List.Item
                  key={option.id}
                  title={option.label}
                  description={option.detail}
                  onPress={() => {
                    onSelect(option);
                    setQuery(option.label);
                    setOpen(false);
                  }}
                />
              ))
            )}
          </ScrollView>
        </Surface>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { zIndex: 2 },
  dropdown: {
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    maxHeight: 220,
  },
  dropdownScroll: { maxHeight: 220 },
  empty: {
    color: colors.textMuted,
    padding: spacing.md,
  },
});
