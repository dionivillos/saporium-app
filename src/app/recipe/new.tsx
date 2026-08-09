import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { RecipeForm, type RecipeFormValues } from '@/components/recipe-form';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { db } from '@/db/client';
import { createRecipe } from '@/db/recipes';
import { clearDraft, draftKey, loadDraft, saveDraft } from '@/lib/draft';
import { loadCredentials } from '@/lib/ai/credentials';
import { takePendingImport } from '@/lib/pending-import';
import type { CreateRecipeInput } from '@/validations/recipe';

const KEY = draftKey();

export default function NewRecipeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [initial, setInitial] = useState<RecipeFormValues | null>(null);
  const [restored, setRestored] = useState(false);
  const [ready, setReady] = useState(false);
  // The form reads its initial values once, so an import arriving later has to
  // remount it rather than hope the prop is picked up.
  const [generation, setGeneration] = useState(0);
  const imported = useRef(false);
  // Store rule and our own principle 4: no AI surface without a key.
  const [hasKey, setHasKey] = useState(false);

  // Also runs on the way back from the import screen, which leaves this one
  // mounted underneath.
  useFocusEffect(
    useCallback(() => {
      const values = takePendingImport();
      if (values === null) return;

      imported.current = true;
      setInitial(values);
      setRestored(false);
      setReady(true);
      setGeneration((current) => current + 1);
    }, [])
  );

  useEffect(() => {
    void loadCredentials().then((credentials) => setHasKey(credentials !== null));
  }, []);

  useEffect(() => {
    void loadDraft(KEY).then((draft) => {
      // An import that landed first wins: it is the more recent intent.
      if (imported.current) return;

      setInitial(draft);
      setRestored(draft !== null);
      setReady(true);
    });
  }, []);

  function handleSubmit(input: CreateRecipeInput) {
    const id = createRecipe(db, input);
    void clearDraft(KEY);
    router.replace(`/recipe/${id}`);
  }

  // Mounting the form before the draft has loaded would discard it.
  if (!ready) return <ThemedView style={styles.container} />;

  return (
    <ThemedView style={styles.container}>
      {restored && (
        <View style={styles.notice}>
          <ThemedText type="small" themeColor="textSecondary">
            {t('recipes.form.draftRestored')}
          </ThemedText>
        </View>
      )}
      {initial === null && (
        // Offered where the intent starts, but only on a blank form: once there
        // is something in it, importing would mean throwing that away.
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/recipe/import?returnToForm=1')}
          style={styles.notice}
        >
          <ThemedText type="small" style={styles.link}>
            {t('import.fromForm')}
          </ThemedText>
        </Pressable>
      )}
      {initial === null && hasKey && (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/recipe/paste')}
          style={styles.notice}
        >
          <ThemedText type="small" style={styles.link}>
            {t('paste.fromForm')}
          </ThemedText>
        </Pressable>
      )}
      {initial === null && hasKey && (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/recipe/scan')}
          style={styles.notice}
        >
          <ThemedText type="small" style={styles.link}>
            {t('scan.fromForm')}
          </ThemedText>
        </Pressable>
      )}
      <RecipeForm
        key={generation}
        initialValues={initial ?? undefined}
        submitLabel={t('recipes.form.submit')}
        onSubmit={handleSubmit}
        onChange={(values) => void saveDraft(KEY, values)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  notice: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  link: {
    color: '#0A7EA4',
  },
});
