import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { AiError, type AiFailure } from '@/lib/ai/client';
import { loadCredentials, type AiCredentials } from '@/lib/ai/credentials';
import { NotARecipeError, recipeFromImages } from '@/lib/ai/extract-recipe';
import { toInlineImage } from '@/lib/ai/photo-input';
import { toFormValues } from '@/lib/imported-recipe';
import { setPendingImport } from '@/lib/pending-import';

type Failure = AiFailure | 'not-a-recipe' | 'unreadable';

const MESSAGES = {
  unauthorized: 'ai.errors.unauthorized',
  'rate-limited': 'ai.errors.rateLimited',
  unreachable: 'ai.errors.unreachable',
  timeout: 'ai.errors.timeout',
  'bad-response': 'ai.errors.badResponse',
  'not-a-recipe': 'scan.errors.notARecipe',
  unreadable: 'scan.errors.unreadable',
} as const satisfies Record<Failure, string>;

/** A recipe can run over two pages; more than this is a sign of a wrong turn. */
const MAX_PHOTOS = 4;

export default function ScanRecipeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useTheme();

  const [credentials, setCredentials] = useState<AiCredentials | null>(null);
  const [ready, setReady] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);

  useEffect(() => {
    void loadCredentials().then((stored) => {
      setCredentials(stored);
      setReady(true);
    });
  }, []);

  async function add(from: 'camera' | 'library') {
    const permission =
      from === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(t('recipes.form.photoPermission'));
      return;
    }

    const result =
      from === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality: 1 })
        : await ImagePicker.launchImageLibraryAsync({ quality: 1, allowsMultipleSelection: true });

    if (result.canceled) return;

    setFailure(null);
    setPhotos((current) =>
      [...current, ...result.assets.map((asset) => asset.uri)].slice(0, MAX_PHOTOS)
    );
  }

  async function read(withKey: AiCredentials) {
    setBusy(true);
    setFailure(null);

    try {
      const images = await Promise.all(photos.map(toInlineImage));
      const recipe = await recipeFromImages(withKey, images);

      // A photograph has no source URL, so provenance stays empty.
      setPendingImport(toFormValues(recipe, ''));
      router.back();
    } catch (error) {
      // The photos stay on screen: retaking them after a rate limit would be
      // the second annoyance in a row.
      if (error instanceof NotARecipeError) setFailure('not-a-recipe');
      else if (error instanceof AiError) setFailure(error.reason);
      else setFailure('unreadable');
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return <ThemedView style={styles.container} />;

  if (credentials === null) {
    return (
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText themeColor="textSecondary">{t('scan.needsKey')}</ThemedText>
          <Action label={t('paste.configureKey')} onPress={() => router.replace('/ai')} />
        </ScrollView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText themeColor="textSecondary">{t('scan.description')}</ThemedText>

        {photos.length > 0 && (
          <View style={styles.photos}>
            {photos.map((uri) => (
              <Image key={uri} source={{ uri }} style={styles.photo} contentFit="cover" />
            ))}
          </View>
        )}

        <View style={styles.row}>
          <Action
            label={t('scan.take')}
            disabled={busy || photos.length >= MAX_PHOTOS}
            onPress={() => void add('camera')}
            grow
          />
          <Action
            label={t('scan.choose')}
            disabled={busy || photos.length >= MAX_PHOTOS}
            onPress={() => void add('library')}
            grow
          />
        </View>

        {photos.length > 0 && (
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => setPhotos([])}
            style={styles.clear}
          >
            <ThemedText type="small" themeColor="textSecondary">
              {t('scan.clear')}
            </ThemedText>
          </Pressable>
        )}

        {failure !== null && (
          <ThemedText type="small" style={{ color: theme.danger }}>
            {t(MESSAGES[failure])}
          </ThemedText>
        )}

        <Action
          label={busy ? t('scan.working') : t('scan.submit')}
          disabled={photos.length === 0 || busy}
          busy={busy}
          onPress={() => void read(credentials)}
        />

        <ThemedText type="small" themeColor="textSecondary">
          {t('scan.cost')}
        </ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

function Action({
  label,
  onPress,
  disabled,
  busy,
  grow,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  grow?: boolean;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        grow === true && styles.grow,
        {
          backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement,
          opacity: disabled === true ? 0.5 : 1,
        },
      ]}
    >
      <View style={styles.actionLabel}>
        {busy === true && <ActivityIndicator />}
        <ThemedText type="smallBold">{label}</ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  photos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  photo: {
    width: 96,
    height: 128,
    borderRadius: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  grow: {
    flex: 1,
  },
  action: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
  actionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  clear: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
});
