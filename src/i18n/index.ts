import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { bn } from './bn';
import { en } from './en';

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    compatibilityJSON: 'v4',
    resources: {
      bn: { translation: bn },
      en: { translation: en },
    },
    lng: 'bn',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });
}

export default i18n;
