import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Home for everything that is not the recipe collection itself. */
export default function MoreScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Entry
          title={t('appearance.title')}
          description={t('appearance.description')}
          onPress={() => router.push('/appearance')}
        />
        <Entry
          title={t('import.title')}
          description={t('import.description')}
          onPress={() => router.push('/recipe/import')}
        />
        <Entry
          title={t('trash.title')}
          description={t('trash.description')}
          onPress={() => router.push('/trash')}
        />
        <Entry
          title={t('ai.title')}
          description={t('ai.description')}
          onPress={() => router.push('/ai')}
        />
        <Entry
          title={t('backup.title')}
          description={t('backup.exportDescription')}
          onPress={() => router.push('/backup')}
        />
      </ScrollView>
    </ThemedView>
  );
}

function Entry({
  title,
  description,
  onPress,
}: {
  title: string;
  description: string;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.entry,
        { backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement },
      ]}
    >
      <ThemedText type="smallBold" style={styles.entryTitle}>
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
  entry: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
  entryTitle: {
    fontSize: 17,
    lineHeight: 24,
  },
});
