import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { RecipeMeta } from '@/components/recipe-meta';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { RecipeWithDetails } from '@/db/recipes';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  recipe: RecipeWithDetails;
};

/**
 * Read while cooking: generous spacing, large-ish type, ingredients and steps
 * scannable at arm's length.
 */
export function RecipeDetail({ recipe }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();

  const groups = groupIngredients(recipe);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>{recipe.title}</ThemedText>
        {recipe.description !== null && (
          <ThemedText themeColor="textSecondary">{recipe.description}</ThemedText>
        )}
        <RecipeMeta recipe={recipe} />
      </View>

      <View style={styles.section}>
        <ThemedText type="subtitle">{t('recipes.detail.ingredients')}</ThemedText>
        {groups.map((group) => (
          <View key={group.name ?? '__default'} style={styles.group}>
            {group.name !== null && <ThemedText type="smallBold">{group.name}</ThemedText>}
            {group.items.map((ingredient) => (
              <View key={ingredient.id} style={styles.ingredient}>
                <ThemedText themeColor="textSecondary">•</ThemedText>
                <ThemedText style={styles.flex}>{ingredientLabel(ingredient)}</ThemedText>
              </View>
            ))}
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <ThemedText type="subtitle">{t('recipes.detail.steps')}</ThemedText>
        {recipe.steps.map((step, index) => (
          <View key={step.id} style={styles.step}>
            <ThemedText style={[styles.stepNumber, { color: theme.textSecondary }]}>
              {index + 1}
            </ThemedText>
            <ThemedText style={[styles.flex, styles.stepText]}>{step.content}</ThemedText>
          </View>
        ))}
      </View>

      {recipe.tips !== null && (
        <View style={[styles.section, styles.tips, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="subtitle">{t('recipes.detail.tips')}</ThemedText>
          <ThemedText>{recipe.tips}</ThemedText>
        </View>
      )}

      {recipe.tags.length > 0 && (
        <View style={styles.tags}>
          {recipe.tags.map((tag) => (
            <View key={tag} style={[styles.tag, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="small" themeColor="textSecondary">
                {tag}
              </ThemedText>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function ingredientLabel(ingredient: RecipeWithDetails['ingredients'][number]): string {
  // rawText is what the user actually wrote; fall back to the parsed parts.
  return (
    ingredient.rawText ??
    [ingredient.quantity, ingredient.unit, ingredient.name].filter(Boolean).join(' ')
  );
}

type IngredientGroup = {
  name: string | null;
  items: RecipeWithDetails['ingredients'];
};

function groupIngredients(recipe: RecipeWithDetails): IngredientGroup[] {
  const groups: IngredientGroup[] = [];

  for (const ingredient of recipe.ingredients) {
    const name = ingredient.groupName ?? null;
    const last = groups.at(-1);

    if (last && last.name === name) last.items.push(ingredient);
    else groups.push({ name, items: [ingredient] });
  }

  return groups;
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.six,
    gap: Spacing.five,
  },
  header: {
    gap: Spacing.two,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: 700,
  },
  section: {
    gap: Spacing.three,
  },
  group: {
    gap: Spacing.two,
  },
  ingredient: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  step: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  stepNumber: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: 700,
    minWidth: 20,
  },
  stepText: {
    fontSize: 17,
    lineHeight: 26,
  },
  flex: {
    flex: 1,
  },
  tips: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  tag: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 999,
  },
});
