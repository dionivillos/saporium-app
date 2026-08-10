import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

import i18n, { resolveLocale, type Locale } from '@/i18n';
import {
  DEFAULT_PREFERENCES,
  loadPreferences,
  savePreferences,
  type Preferences,
} from '@/lib/preferences';

type Value = {
  preferences: Preferences;
  /** Ready once the stored choices are known, so nothing flashes the wrong way. */
  ready: boolean;
  setPreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
  /** What the theme choice resolves to right now. */
  scheme: 'light' | 'dark';
  /** What the locale choice resolves to right now. */
  locale: Locale;
};

const PreferencesContext = createContext<Value | null>(null);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void loadPreferences().then((stored) => {
      setPreferences(stored);
      setReady(true);
    });
  }, []);

  const locale: Locale = preferences.locale === 'system' ? resolveLocale() : preferences.locale;

  // i18next holds the language itself, so it has to be told rather than read.
  useEffect(() => {
    if (i18n.language !== locale) void i18n.changeLanguage(locale);
  }, [locale]);

  const setPreference = useCallback<Value['setPreference']>((key, value) => {
    setPreferences((current) => {
      const next = { ...current, [key]: value };
      void savePreferences(next);
      return next;
    });
  }, []);

  const scheme =
    preferences.theme === 'system'
      ? systemScheme === 'dark'
        ? 'dark'
        : 'light'
      : preferences.theme;

  const value = useMemo(
    () => ({ preferences, ready, setPreference, scheme, locale }),
    [preferences, ready, setPreference, scheme, locale]
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): Value {
  const value = useContext(PreferencesContext);
  if (value === null) throw new Error('usePreferences used outside PreferencesProvider');
  return value;
}

/**
 * For the one caller that must not insist: anything that merely paints should
 * fall back to the device rather than crash when it is rendered outside the
 * provider, which is what a component test does.
 */
export function usePreferencesIfAvailable(): Value | null {
  return useContext(PreferencesContext);
}
