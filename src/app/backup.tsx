import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { exportRecipes, importRecipes } from '@/db/backup';
import { db } from '@/db/client';
import { useTheme } from '@/hooks/use-theme';

function exportFileName(): string {
  const today = new Date().toISOString().slice(0, 10);
  return `saporium-${today}.json`;
}

export default function BackupScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleExport() {
    setBusy(true);
    setMessage(null);
    try {
      const json = exportRecipes(db);
      if (JSON.parse(json).length === 0) {
        setMessage(t('backup.exportEmpty'));
        return;
      }

      const file = new File(Paths.cache, exportFileName());
      if (file.exists) file.delete();
      file.create();
      file.write(json);

      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/json',
        UTI: 'public.json',
        dialogTitle: t('backup.export'),
      });
    } catch {
      setMessage(t('backup.exportError'));
    } finally {
      setBusy(false);
    }
  }

  async function handleImport() {
    setBusy(true);
    setMessage(null);
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'public.json'],
        copyToCacheDirectory: true,
      });
      if (picked.canceled) return;

      const asset = picked.assets[0];
      if (!asset) return;

      const contents = await new File(asset.uri).text();
      const { imported, skipped } = importRecipes(db, contents);

      const parts: string[] = [
        imported === 0 ? t('backup.importedNone') : t('backup.imported', { count: imported }),
      ];
      if (skipped > 0) parts.push(t('backup.importSkipped', { count: skipped }));
      setMessage(parts.join(' '));
    } catch (error) {
      setMessage(
        error instanceof SyntaxError ? t('backup.importInvalid') : t('backup.importError')
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Action
          title={t('backup.export')}
          description={t('backup.exportDescription')}
          disabled={busy}
          onPress={handleExport}
        />
        <Action
          title={t('backup.import')}
          description={t('backup.importDescription')}
          disabled={busy}
          onPress={handleImport}
        />

        {busy && <ActivityIndicator />}
        {message !== null && (
          <View style={[styles.message, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText>{message}</ThemedText>
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

type ActionProps = {
  title: string;
  description: string;
  disabled: boolean;
  onPress: () => void;
};

function Action({ title, description, disabled, onPress }: ActionProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        {
          backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      <ThemedText type="smallBold" style={styles.actionTitle}>
        {title}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {description}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  action: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
  actionTitle: {
    fontSize: 17,
    lineHeight: 24,
  },
  message: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
});
