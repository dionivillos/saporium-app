import * as SecureStore from 'expo-secure-store';

/**
 * The user's own vendor API key.
 *
 * It lives in the device keychain and nowhere else: not in SQLite, not in a
 * backup, not in an export. That is not only hygiene — a key in the database
 * would leave the app's own export format carrying a secret, and the export is
 * a file people mail to themselves.
 */

export const AI_PROVIDERS = ['anthropic', 'openai'] as const;

export type AiProvider = (typeof AI_PROVIDERS)[number];

export type AiCredentials = {
  provider: AiProvider;
  apiKey: string;
};

const STORE_KEY = 'saporium.ai.credentials';

function isProvider(value: unknown): value is AiProvider {
  return AI_PROVIDERS.some((provider) => provider === value);
}

export async function saveCredentials(credentials: AiCredentials): Promise<void> {
  await SecureStore.setItemAsync(STORE_KEY, JSON.stringify(credentials), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function loadCredentials(): Promise<AiCredentials | null> {
  try {
    const stored = await SecureStore.getItemAsync(STORE_KEY);
    if (stored === null) return null;

    const parsed: unknown = JSON.parse(stored);
    if (typeof parsed !== 'object' || parsed === null) return null;

    const { provider, apiKey } = parsed as Partial<AiCredentials>;
    if (!isProvider(provider) || typeof apiKey !== 'string' || apiKey.length === 0) return null;

    return { provider, apiKey };
  } catch {
    // An unreadable keychain entry is the same as not having one: the user can
    // paste the key again, and refusing to start over would be worse.
    return null;
  }
}

export async function clearCredentials(): Promise<void> {
  await SecureStore.deleteItemAsync(STORE_KEY);
}

/** What the settings screen shows once a key is saved. Never the key itself. */
export function redact(apiKey: string): string {
  const tail = apiKey.slice(-4);
  return `••••••••${tail}`;
}
