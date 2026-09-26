import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import fr from './fr.json';
import en from './en.json';

export const i18n = new I18n({
  fr,
  en,
});

i18n.enableFallback = true;
i18n.defaultLocale = 'fr';

const LOCALE_STORAGE_KEY = '@zender237/locale';

let currentLocale = 'fr';

const listeners = new Set();

export async function initializeAppLocale() {
  try {
    const storedLocale =
      await AsyncStorage.getItem(
        LOCALE_STORAGE_KEY
      );

    const deviceLocale =
      Localization.getLocales?.()[0]?.languageCode;

    currentLocale =
      storedLocale === 'fr' ||
      storedLocale === 'en'
        ? storedLocale
        : deviceLocale === 'en'
          ? 'en'
          : 'fr';
  } catch {
    currentLocale = 'fr';
  }

  i18n.locale = currentLocale;

  listeners.forEach((listener) => {
    listener(currentLocale);
  });

  return currentLocale;
}

export async function setAppLocale(locale) {
  const nextLocale =
    locale === 'en'
      ? 'en'
      : 'fr';

  currentLocale = nextLocale;
  i18n.locale = nextLocale;

  await AsyncStorage.setItem(
    LOCALE_STORAGE_KEY,
    nextLocale
  );

  listeners.forEach((listener) => {
    listener(nextLocale);
  });

  return nextLocale;
}

export function getAppLocale() {
  return currentLocale;
}

export function subscribeToLocale(listener) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

try {
  i18n.locale =
    Localization.getLocales?.()[0]?.languageCode ===
    'en'
      ? 'en'
      : 'fr';
} catch {
  i18n.locale = 'fr';
}

export default i18n;