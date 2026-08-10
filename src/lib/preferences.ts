import AsyncStorage from '@react-native-async-storage/async-storage';

import { resources, type Locale } from '@/i18n';

/**
 * What the user has chosen about the app itself, as opposed to their recipes.
 *
 * Both settings default to following the device, and that is a value like any
 * other rather than the absence of one: someone who has never opened this
 * screen and someone who deliberately picked "follow the phone" should end up
 * in the same place, and the screen should be able to say which it is.
 */

export type ThemeChoice = 'system' | 'light' | 'dark';
export type LocaleChoice = 'system' | Locale;

export type Preferences = {
  theme: ThemeChoice;
  locale: LocaleChoice;
};

export const DEFAULT_PREFERENCES: Preferences = { theme: 'system', locale: 'system' };

const STORAGE_KEY = 'saporium.preferences';

function isTheme(value: unknown): value is ThemeChoice {
  return value === 'system' || value === 'light' || value === 'dark';
}

function isLocale(value: unknown): value is LocaleChoice {
  return value === 'system' || (typeof value === 'string' && value in resources);
}

export async function loadPreferences(): Promise<Preferences> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored === null) return DEFAULT_PREFERENCES;

    const parsed: unknown = JSON.parse(stored);
    if (typeof parsed !== 'object' || parsed === null) return DEFAULT_PREFERENCES;

    const { theme, locale } = parsed as Partial<Preferences>;

    // Each setting is read on its own: a value we no longer understand should
    // not throw away the one next to it.
    return {
      theme: isTheme(theme) ? theme : DEFAULT_PREFERENCES.theme,
      locale: isLocale(locale) ? locale : DEFAULT_PREFERENCES.locale,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export async function savePreferences(preferences: Preferences): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // The choice still applies for this session; losing it must not break the
    // screen the user is looking at.
  }
}
