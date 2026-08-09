import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { AiError, type AiFailure } from '@/lib/ai/client';
import { loadCredentials, type AiCredentials } from '@/lib/ai/credentials';
import { NotARecipeError, recipeFromText } from '@/lib/ai/recipe-from-text';
import { toFormValues } from '@/lib/imported-recipe';
import { setPendingImport } from '@/lib/pending-import';

type Failure = AiFailure | 'not-a-recipe';

const MESSAGES = {
  unauthorized: 'ai.errors.unauthorized',
  'rate-limited': 'ai.errors.rateLimited',
  unreachable: 'ai.errors.unreachable',
  timeout: 'ai.errors.timeout',
  'bad-response': 'ai.errors.badResponse',
  'not-a-recipe': 'paste.errors.notARecipe',
} as const satisfies Record<Failure, string>;

export default function PasteRecipeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useTheme();

  const [credentials, setCredentials] = useState<AiCredentials | null>(null);
  const [ready, setReady] = useState(false);
  const [pasted, setPasted] = useState('');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);

  useEffect(() => {
    void loadCredentials().then((stored) => {
      setCredentials(stored);
      setReady(true);
    });
  }, []);

  async function extract(withKey: AiCredentials) {
    setBusy(true);
    setFailure(null);

    try {
      const recipe = await recipeFromText(withKey, pasted.trim());

      // The pasted text is not a source URL, so provenance stays empty.
      setPendingImport(toFormValues(recipe, ''));
      router.back();
    } catch (error) {
      // The text stays in the field: it is what the user pasted, and losing it
      // on a rate limit would be the second annoyance in a row.
      if (error instanceof NotARecipeError) setFailure('not-a-recipe');
      else setFailure(error instanceof AiError ? error.reason : 'unreachable');
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return <ThemedView style={styles.container} />;

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {credentials === null ? (
          <>
            <ThemedText themeColor="textSecondary">{t('paste.needsKey')}</ThemedText>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.replace('/ai')}
              style={({ pressed }) => [
                styles.submit,
                {
                  backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement,
                },
              ]}
            >
              <ThemedText type="smallBold">{t('paste.configureKey')}</ThemedText>
            </Pressable>
          </>
        ) : (
          <>
            <ThemedText themeColor="textSecondary">{t('paste.description')}</ThemedText>

            <TextField
              label={t('paste.text')}
              value={pasted}
              onChangeText={setPasted}
              placeholder={t('paste.textPlaceholder')}
              multiline
              editable={!busy}
              error={failure === null ? null : t(MESSAGES[failure])}
            />

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: pasted.trim().length === 0 || busy }}
              disabled={pasted.trim().length === 0 || busy}
              onPress={() => void extract(credentials)}
              style={({ pressed }) => [
                styles.submit,
                {
                  backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement,
                  opacity: pasted.trim().length === 0 || busy ? 0.5 : 1,
                },
              ]}
            >
              <View style={styles.busy}>
                {busy && <ActivityIndicator />}
                <ThemedText type="smallBold">
                  {busy ? t('paste.working') : t('paste.submit')}
                </ThemedText>
              </View>
            </Pressable>

            <ThemedText type="small" themeColor="textSecondary">
              {t('paste.cost')}
            </ThemedText>
          </>
        )}
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
