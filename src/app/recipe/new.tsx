import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { RecipeForm, type RecipeFormValues } from '@/components/recipe-form';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { db } from '@/db/client';
import { createRecipe } from '@/db/recipes';
import { clearDraft, draftKey, loadDraft, saveDraft } from '@/lib/draft';
import { takePendingImport } from '@/lib/pending-import';
import type { CreateRecipeInput } from '@/validations/recipe';

const KEY = draftKey();

export default function NewRecipeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [initial, setInitial] = useState<RecipeFormValues | null>(null);
  const [restored, setRestored] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // An import arrives already filled in and wins over a stored draft, which
    // stays on disk in case the user backs out without saving either.
    const imported = takePendingImport();

    void (imported !== null ? Promise.resolve(null) : loadDraft(KEY)).then((draft) => {
      setInitial(imported ?? draft);
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
          onPress={() => router.replace('/recipe/import')}
          style={styles.notice}
        >
          <ThemedText type="small" style={styles.link}>
            {t('import.fromForm')}
          </ThemedText>
        </Pressable>
      )}
      <RecipeForm
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
