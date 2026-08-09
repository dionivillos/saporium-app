import * as SecureStore from 'expo-secure-store';

import { clearCredentials, loadCredentials, redact, saveCredentials } from '@/lib/ai/credentials';

// A stand-in keychain, so the round trip is exercised rather than asserted on
// the calls made to a mock.
const keychain = new Map<string, string>();

jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'when-unlocked',
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

beforeEach(() => {
  keychain.clear();
  jest.mocked(SecureStore.setItemAsync).mockImplementation(async (key, value) => {
    keychain.set(key, value);
  });
  jest
    .mocked(SecureStore.getItemAsync)
    .mockImplementation(async (key) => keychain.get(key) ?? null);
  jest.mocked(SecureStore.deleteItemAsync).mockImplementation(async (key) => {
    keychain.delete(key);
  });
});

describe('credentials', () => {
  it('round trips what was saved', async () => {
    await saveCredentials({ provider: 'anthropic', apiKey: 'sk-ant-secret' });

    expect(await loadCredentials()).toEqual({ provider: 'anthropic', apiKey: 'sk-ant-secret' });
  });

  it('returns null when nothing has been saved', async () => {
    expect(await loadCredentials()).toBeNull();
  });

  it('forgets the key on clear', async () => {
    await saveCredentials({ provider: 'openai', apiKey: 'sk-openai' });
    await clearCredentials();

    expect(await loadCredentials()).toBeNull();
  });

  it('stores the key only in the keychain, under one entry', async () => {
    await saveCredentials({ provider: 'anthropic', apiKey: 'sk-ant-secret' });

    expect([...keychain.keys()]).toEqual(['saporium.ai.credentials']);
  });

  it('asks for an entry that never leaves the device', async () => {
    await saveCredentials({ provider: 'anthropic', apiKey: 'sk-ant-secret' });

    expect(jest.mocked(SecureStore.setItemAsync).mock.calls[0]?.[2]).toEqual({
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  });

  it('treats a corrupted entry as no key rather than crashing', async () => {
    keychain.set('saporium.ai.credentials', 'not json');

    expect(await loadCredentials()).toBeNull();
  });

  it('rejects an entry naming a provider it does not know', async () => {
    keychain.set('saporium.ai.credentials', JSON.stringify({ provider: 'acme', apiKey: 'x' }));

    expect(await loadCredentials()).toBeNull();
  });

  it('rejects an entry with an empty key', async () => {
    keychain.set('saporium.ai.credentials', JSON.stringify({ provider: 'openai', apiKey: '' }));

    expect(await loadCredentials()).toBeNull();
  });
});

describe('redact', () => {
  it('keeps only the last four characters, so a key can be recognised', () => {
    expect(redact('sk-ant-api03-abcdefgh1234')).toBe('••••••••1234');
  });

  it('never echoes the body of the key', () => {
    expect(redact('sk-ant-api03-abcdefgh1234')).not.toContain('abcdefgh');
  });
});
