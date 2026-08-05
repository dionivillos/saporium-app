import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { DarkTheme, DefaultTheme, Link, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';

import { DatabaseGate } from '@/components/database-gate';
import { db } from '@/db/client';
import migrations from '@/db/migrations/migrations';
import { seedIfEmpty } from '@/db/seed';
import { useColorScheme } from '@/hooks/use-color-scheme';
import '@/i18n';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { t } = useTranslation();
  const { success, error } = useMigrations(db, migrations);

  useEffect(() => {
    if (success) seedIfEmpty(db);
  }, [success]);

  return (
    // react-native-gesture-handler needs this root to receive touches at all;
    // expo-router does not add it, and without it gestures inside screens can
    // be swallowed instead of reaching the view under the finger.
    <GestureHandlerRootView style={styles.root}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <StatusBar style="auto" />
        <DatabaseGate ready={success} error={error}>
          <Stack>
            <Stack.Screen
              name="index"
              options={{
                title: t('recipes.title'),
                headerRight: () => (
                  <Link
                    href="/backup"
                    accessibilityLabel={t('backup.title')}
                    style={styles.headerLink}
                  >
                    ⋯
                  </Link>
                ),
              }}
            />
            <Stack.Screen name="backup" options={{ title: t('backup.title') }} />
          </Stack>
        </DatabaseGate>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerLink: {
    fontSize: 22,
    paddingHorizontal: 4,
  },
});
