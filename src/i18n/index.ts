import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { bn } from './bn';
import { en } from './en';
import './paperDates';

export type AppLanguage = 'bn' | 'en';

const LANGUAGE_STORAGE_KEY = 'sr-dist.language';

export async function setAppLanguage(lang: AppLanguage): Promise<void> {
  await i18n.changeLanguage(lang);
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
}

export async function hydrateLanguage(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === 'bn' || stored === 'en') {
      await i18n.changeLanguage(stored);
    }
  } catch {
    // keep default
  }
}

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
  void hydrateLanguage();
}

export default i18n;
