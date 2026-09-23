import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { SegmentedButtons } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { setAppLanguage, type AppLanguage } from '@/src/i18n';

type Props = {
  style?: StyleProp<ViewStyle>;
};

export function LanguageToggle({ style }: Props) {
  const { i18n } = useTranslation();
  const current: AppLanguage = i18n.language?.startsWith('en') ? 'en' : 'bn';

  return (
    <SegmentedButtons
      value={current}
      onValueChange={(value) => {
        void setAppLanguage(value as AppLanguage);
      }}
      buttons={[
        { value: 'en', label: 'EN' },
        { value: 'bn', label: 'বাং' },
      ]}
      style={[styles.toggle, style]}
      density="medium"
    />
  );
}

const styles = StyleSheet.create({
  toggle: { minWidth: 120 },
});
