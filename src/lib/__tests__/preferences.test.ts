import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_PREFERENCES, loadPreferences, savePreferences } from '@/lib/preferences';

const store = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

beforeEach(() => {
  store.clear();
  jest.mocked(AsyncStorage.getItem).mockImplementation(async (key) => store.get(key) ?? null);
  jest.mocked(AsyncStorage.setItem).mockImplementation(async (key, value) => {
    store.set(key, value);
  });
});

describe('preferences', () => {
  it('follows the device until the user says otherwise', async () => {
    expect(await loadPreferences()).toEqual(DEFAULT_PREFERENCES);
  });

  it('round trips a choice', async () => {
    await savePreferences({ theme: 'dark', locale: 'en' });

    expect(await loadPreferences()).toEqual({ theme: 'dark', locale: 'en' });
  });

  it('keeps the setting next to one it cannot read', async () => {
    store.set('saporium.preferences', JSON.stringify({ theme: 'dark', locale: 'klingon' }));

    // A language we no longer ship should not drag the theme back with it.
    expect(await loadPreferences()).toEqual({ theme: 'dark', locale: 'system' });
  });

  it('ignores a theme it does not know', async () => {
    store.set('saporium.preferences', JSON.stringify({ theme: 'sepia', locale: 'en' }));

    expect(await loadPreferences()).toEqual({ theme: 'system', locale: 'en' });
  });

  it('falls back rather than throwing on a corrupted entry', async () => {
    store.set('saporium.preferences', 'not json');

    expect(await loadPreferences()).toEqual(DEFAULT_PREFERENCES);
  });

  it('accepts every language the app actually ships', async () => {
    await savePreferences({ theme: 'light', locale: 'es' });
    expect((await loadPreferences()).locale).toBe('es');

    await savePreferences({ theme: 'light', locale: 'en' });
    expect((await loadPreferences()).locale).toBe('en');
  });
});
