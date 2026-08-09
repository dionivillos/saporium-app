import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchPage, normalizeUrl, PageFetchError, type FetchFailure } from '@/lib/fetch-page';
import { recipeFromHtml } from '@/lib/html-recipe';
import { toFormValues } from '@/lib/imported-recipe';
import { setPendingImport } from '@/lib/pending-import';

type Failure = FetchFailure | 'unsupported';

const MESSAGES = {
  'invalid-url': 'import.errors.invalidUrl',
  insecure: 'import.errors.insecure',
  timeout: 'import.errors.timeout',
  'too-many-redirects': 'import.errors.unreachable',
  'too-large': 'import.errors.tooLarge',
  'not-html': 'import.errors.unsupported',
  unreachable: 'import.errors.unreachable',
  unsupported: 'import.errors.unsupported',
} as const satisfies Record<Failure, string>;

export default function ImportRecipeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useTheme();
  const { returnToForm } = useLocalSearchParams<{ returnToForm?: string }>();

  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);

  async function importRecipe() {
    setBusy(true);
    setFailure(null);

    try {
      const target = normalizeUrl(url);
      const recipe = recipeFromHtml(await fetchPage(target));

      if (recipe === null) {
        setFailure('unsupported');
        return;
      }

      // Nothing is saved here: the form is where the user accepts it.
      setPendingImport(toFormValues(recipe, target));

      // Coming from the form means it is still underneath, waiting to be
      // filled in; coming from anywhere else there is no form to go back to.
      if (returnToForm === '1') router.back();
      else router.replace('/recipe/new');
    } catch (error) {
      setFailure(error instanceof PageFetchError ? error.reason : 'unreachable');
    } finally {
      setBusy(false);
    }
  }

  const ready = url.trim().length > 0 && !busy;

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ThemedText themeColor="textSecondary">{t('import.description')}</ThemedText>

        <TextField
          label={t('import.url')}
          value={url}
          onChangeText={setUrl}
          placeholder={t('import.urlPlaceholder')}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          inputMode="url"
          returnKeyType="go"
          editable={!busy}
          onSubmitEditing={() => ready && void importRecipe()}
          error={failure === null ? null : t(MESSAGES[failure])}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !ready }}
          disabled={!ready}
          onPress={() => void importRecipe()}
          style={({ pressed }) => [
            styles.submit,
            {
              backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement,
              opacity: ready ? 1 : 0.5,
            },
          ]}
        >
          {busy ? (
            <View style={styles.busy}>
              <ActivityIndicator />
              <ThemedText type="smallBold">{t('import.working')}</ThemedText>
            </View>
          ) : (
            <ThemedText type="smallBold">{t('import.submit')}</ThemedText>
          )}
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  submit: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
  busy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
