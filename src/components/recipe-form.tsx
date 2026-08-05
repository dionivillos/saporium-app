import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { PhotoField } from '@/components/photo-field';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  parseIngredientLines,
  parseOptionalNumber,
  parseStepText,
  parseTagText,
} from '@/lib/recipe-text';
import { DIFFICULTIES, type CreateRecipeInput, type Difficulty } from '@/validations/recipe';

/**
 * Everything the form holds, as text. Kept in this shape rather than as a
 * half-built recipe so a draft can be saved and restored verbatim, including
 * input the user has not finished typing.
 */
export type RecipeFormValues = {
  title: string;
  ingredients: string;
  steps: string;
  description: string;
  difficulty: Difficulty | null;
  prepTime: string;
  cookTime: string;
  servingsMin: string;
  servingsMax: string;
  tips: string;
  tags: string;
  coverImagePath: string | null;
};

export const EMPTY_FORM: RecipeFormValues = {
  title: '',
  ingredients: '',
  steps: '',
  description: '',
  difficulty: null,
  prepTime: '',
  cookTime: '',
  servingsMin: '',
  servingsMax: '',
  tips: '',
  tags: '',
  coverImagePath: null,
};

export function toCreateInput(values: RecipeFormValues): CreateRecipeInput {
  const servingsMin = parseOptionalNumber(values.servingsMin);

  return {
    title: values.title.trim(),
    description: values.description.trim() || null,
    difficulty: values.difficulty,
    prepTimeMinutes: parseOptionalNumber(values.prepTime),
    cookTimeMinutes: parseOptionalNumber(values.cookTime),
    servingsMin: servingsMin !== null && servingsMin > 0 ? servingsMin : 1,
    servingsMax: parseOptionalNumber(values.servingsMax),
    tips: values.tips.trim() || null,
    coverImagePath: values.coverImagePath,
    ingredients: parseIngredientLines(values.ingredients),
    steps: parseStepText(values.steps),
    tags: parseTagText(values.tags),
  };
}

type Errors = Partial<Record<'title' | 'ingredients' | 'steps', string>>;

type Props = {
  initialValues?: RecipeFormValues;
  submitLabel: string;
  onSubmit: (input: CreateRecipeInput) => void;
  onChange?: (values: RecipeFormValues) => void;
};

export function RecipeForm({ initialValues, submitLabel, onSubmit, onChange }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [values, setValues] = useState<RecipeFormValues>(initialValues ?? EMPTY_FORM);
  const [errors, setErrors] = useState<Errors>({});
  const [showDetails, setShowDetails] = useState(false);

  function update<K extends keyof RecipeFormValues>(key: K, value: RecipeFormValues[K]) {
    const next = { ...values, [key]: value };
    setValues(next);
    onChange?.(next);
  }

  function handleSubmit() {
    const input = toCreateInput(values);
    // Only the three genuinely required things are ever reported.
    const found: Errors = {};
    if (input.title.length === 0) found.title = t('recipes.form.titleRequired');
    if (input.ingredients.length === 0) found.ingredients = t('recipes.form.ingredientsRequired');
    if (input.steps.length === 0) found.steps = t('recipes.form.stepsRequired');

    setErrors(found);
    if (Object.keys(found).length > 0) return;

    onSubmit(input);
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
        <TextField
          label={t('recipes.form.title')}
          placeholder={t('recipes.form.titlePlaceholder')}
          value={values.title}
          error={errors.title}
          onChangeText={(text) => update('title', text)}
        />

        <TextField
          label={t('recipes.form.ingredients')}
          placeholder={t('recipes.form.ingredientsPlaceholder')}
          value={values.ingredients}
          error={errors.ingredients}
          multiline
          onChangeText={(text) => update('ingredients', text)}
        />

        <TextField
          label={t('recipes.form.steps')}
          placeholder={t('recipes.form.stepsPlaceholder')}
          value={values.steps}
          error={errors.steps}
          multiline
          onChangeText={(text) => update('steps', text)}
        />

        <Pressable
          accessibilityRole="button"
          onPress={() => setShowDetails((open) => !open)}
          style={styles.disclosure}
        >
          <ThemedText type="smallBold" themeColor="textSecondary">
            {showDetails ? '▾' : '▸'} {t('recipes.form.moreDetails')}
          </ThemedText>
        </Pressable>

        {showDetails && (
          <View style={styles.details}>
            <PhotoField
              value={values.coverImagePath}
              onChange={(path) => update('coverImagePath', path)}
            />

            <TextField
              label={t('recipes.form.description')}
              placeholder={t('recipes.form.descriptionPlaceholder')}
              value={values.description}
              onChangeText={(text) => update('description', text)}
            />

            <View style={styles.field}>
              <ThemedText type="smallBold">{t('recipes.form.difficulty')}</ThemedText>
              <View style={styles.chips}>
                {DIFFICULTIES.map((level) => {
                  const selected = values.difficulty === level;
                  return (
                    <Pressable
                      key={level}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => update('difficulty', selected ? null : level)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: selected
                            ? theme.backgroundSelected
                            : theme.backgroundElement,
                        },
                      ]}
                    >
                      <ThemedText type="small">{t(`recipes.difficulty.${level}`)}</ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.flex}>
                <TextField
                  label={t('recipes.form.prepTime')}
                  value={values.prepTime}
                  keyboardType="number-pad"
                  onChangeText={(text) => update('prepTime', text)}
                />
              </View>
              <View style={styles.flex}>
                <TextField
                  label={t('recipes.form.cookTime')}
                  value={values.cookTime}
                  keyboardType="number-pad"
                  onChangeText={(text) => update('cookTime', text)}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.flex}>
                <TextField
                  label={t('recipes.form.servingsMin')}
                  value={values.servingsMin}
                  keyboardType="number-pad"
                  onChangeText={(text) => update('servingsMin', text)}
                />
              </View>
              <View style={styles.flex}>
                <TextField
                  label={t('recipes.form.servingsMax')}
                  value={values.servingsMax}
                  keyboardType="number-pad"
                  onChangeText={(text) => update('servingsMax', text)}
                />
              </View>
            </View>

            <TextField
              label={t('recipes.form.tips')}
              placeholder={t('recipes.form.tipsPlaceholder')}
              value={values.tips}
              multiline
              onChangeText={(text) => update('tips', text)}
            />

            <TextField
              label={t('recipes.form.tags')}
              placeholder={t('recipes.form.tagsPlaceholder')}
              value={values.tags}
              onChangeText={(text) => update('tags', text)}
            />
            <ThemedText type="small" themeColor="textSecondary">
              {t('recipes.form.tagsHint')}
            </ThemedText>
          </View>
        )}

        <Pressable
          accessibilityRole="button"
          onPress={handleSubmit}
          style={({ pressed }) => [
            styles.submit,
            { backgroundColor: pressed ? theme.backgroundSelected : theme.text },
          ]}
        >
          <ThemedText type="smallBold" style={[styles.submitLabel, { color: theme.background }]}>
            {submitLabel}
          </ThemedText>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    padding: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  field: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  disclosure: {
    paddingVertical: Spacing.two,
  },
  details: {
    gap: Spacing.four,
  },
  chips: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
  },
  submit: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
  submitLabel: {
    fontSize: 17,
  },
});
