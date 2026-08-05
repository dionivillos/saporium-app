import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

type Props = {
  ready: boolean;
  error?: Error;
  children: ReactNode;
};

/**
 * Holds the app back until migrations have run. Nothing may read or write the
 * database before that, and a failure here means the user's recipes are not
 * reachable — so it is surfaced rather than swallowed.
 */
export function DatabaseGate({ ready, error, children }: Props) {
  const { t } = useTranslation();

  if (error) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="subtitle" style={styles.text}>
          {t('database.error')}
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.text}>
          {error.message}
        </ThemedText>
      </ThemedView>
    );
  }

  if (!ready) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  text: {
    textAlign: 'center',
  },
});
