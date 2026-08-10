import { useColorScheme as useSystemColorScheme } from 'react-native';

import { usePreferencesIfAvailable } from '@/hooks/use-preferences';

/**
 * The active colour scheme: the user's choice when they have made one, and the
 * device's otherwise. Everything that paints reads this rather than React
 * Native's hook directly, so an in-app override reaches the whole tree.
 */
export function useColorScheme(): 'light' | 'dark' {
  const preferences = usePreferencesIfAvailable();
  const system = useSystemColorScheme();

  return preferences?.scheme ?? (system === 'dark' ? 'dark' : 'light');
}
