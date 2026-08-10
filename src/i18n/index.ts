import { getLocales } from 'expo-localization';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './messages/en.json';
import es from './messages/es.json';

/**
 * Spanish, not English, and deliberately: it is the language the app was
 * written in and the one its first users speak, so an unrecognised device
 * language lands somewhere the owner can read rather than somewhere merely
 * more common.
 */
export const defaultLocale = 'es';

/** Add a language here and its catalog under `messages/` to ship it. */
export const resources = {
  es: { translation: es },
  en: { translation: en },
} as const;

export type Locale = keyof typeof resources;

/** Every language with a catalog, for the in-app picker. */
export const AVAILABLE_LOCALES = Object.keys(resources) as Locale[];

function isSupported(code: string | null): code is Locale {
  return code !== null && code in resources;
}

/** First device language we ship a catalog for, or the default. */
export function resolveLocale(): Locale {
  return (
    getLocales()
      .map((locale) => locale.languageCode)
      .find(isSupported) ?? defaultLocale
  );
}

const i18n = createInstance();

i18n.use(initReactI18next).init({
  resources,
  lng: resolveLocale(),
  fallbackLng: defaultLocale,
  // React already escapes interpolated values.
  interpolation: { escapeValue: false },
});

export default i18n;
