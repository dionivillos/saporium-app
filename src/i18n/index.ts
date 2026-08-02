import { getLocales } from 'expo-localization';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import es from './messages/es.json';

export const defaultLocale = 'es';

/** Add a language here and its catalog under `messages/` to ship it. */
export const resources = {
  es: { translation: es },
} as const;

export type Locale = keyof typeof resources;

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
