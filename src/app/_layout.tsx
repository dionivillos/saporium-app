import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

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
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StatusBar style="auto" />
      <DatabaseGate ready={success} error={error}>
        <Stack>
          <Stack.Screen name="index" options={{ title: t('recipes.title') }} />
        </Stack>
      </DatabaseGate>
    </ThemeProvider>
  );
}
