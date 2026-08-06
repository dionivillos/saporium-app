import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { KeepAwakeToggle } from '@/components/keep-awake-toggle';
import { RecipeCover } from '@/components/recipe-cover';
import { RecipeMetaBadges } from '@/components/recipe-meta';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { RecipeWithDetails } from '@/db/recipes';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  recipe: RecipeWithDetails;
  /** Omitted where the recipe cannot be deleted from. */
  onDelete?: () => void;
};

/**
 * Read while cooking: generous spacing, large-ish type, ingredients and steps
 * scannable at arm's length.
 */
export function RecipeDetail({ recipe, onDelete }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();

  const groups = groupIngredients(recipe);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* Full-bleed: the hero is the one place the content margin gets in the way. */}
      <RecipeCover
        id={recipe.id}
        title={recipe.title}
        coverImagePath={recipe.coverImagePath}
        tags={recipe.tags}
        style={styles.cover}
        glyphSize={72}
      />

      <View style={styles.body}>
        <View style={styles.header}>
          <ThemedText style={styles.title}>{recipe.title}</ThemedText>
          {recipe.description !== null && (
            <ThemedText themeColor="textSecondary">{recipe.description}</ThemedText>
          )}
          <RecipeMetaBadges recipe={recipe} />
        </View>

        <KeepAwakeToggle />

        {/* Boxed, because in the kitchen this is the list you keep glancing back at. */}
        <View style={[styles.panel, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="subtitle">{t('recipes.detail.ingredients')}</ThemedText>
          {groups.map((group) => (
            <View key={group.name ?? '__default'} style={styles.group}>
              {group.name !== null && <ThemedText type="smallBold">{group.name}</ThemedText>}
              {group.items.map((ingredient) => (
                <View key={ingredient.id} style={styles.ingredient}>
                  <ThemedText themeColor="textSecondary">•</ThemedText>
                  <ThemedText style={[styles.flex, styles.bodyText]}>
                    {ingredientLabel(ingredient)}
                  </ThemedText>
                </View>
              ))}
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle">{t('recipes.detail.steps')}</ThemedText>
          {recipe.steps.map((step, index) => (
            <View key={step.id} style={styles.step}>
              <View style={[styles.stepNumber, { backgroundColor: theme.backgroundSelected }]}>
                <ThemedText type="smallBold">{index + 1}</ThemedText>
              </View>
              <ThemedText style={[styles.flex, styles.stepText]}>{step.content}</ThemedText>
            </View>
          ))}
        </View>

        {recipe.tips !== null && (
          <View style={[styles.panel, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="subtitle">{t('recipes.detail.tips')}</ThemedText>
            <ThemedText style={styles.bodyText}>{recipe.tips}</ThemedText>
          </View>
        )}

        {recipe.tags.length > 0 && (
          <View style={styles.tags}>
            {recipe.tags.map((tag) => (
              <View key={tag} style={[styles.tag, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText type="small" themeColor="textSecondary">
                  #{tag}
                </ThemedText>
              </View>
            ))}
          </View>
        )}

        {onDelete !== undefined && (
          <Pressable
            accessibilityRole="button"
            onPress={onDelete}
            style={({ pressed }) => [
              styles.delete,
              { backgroundColor: pressed ? theme.backgroundSelected : 'transparent' },
            ]}
          >
            <ThemedText type="smallBold" style={styles.deleteLabel}>
              {t('recipes.delete.action')}
            </ThemedText>
          </Pressable>
        )}
      </View>
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
  // Without an explicit flex the ScrollView sizes itself to its content inside
  // a flex parent, overflowing the screen instead of scrolling.
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: Spacing.six,
  },
  cover: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  body: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    gap: Spacing.five,
  },
  header: {
    gap: Spacing.three,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: 700,
  },
  section: {
    gap: Spacing.three,
  },
  panel: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.three,
  },
  group: {
    gap: Spacing.two,
  },
  ingredient: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  bodyText: {
    fontSize: 17,
    lineHeight: 26,
  },
  step: {
    flexDirection: 'row',
    gap: Spacing.three,
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.half,
  },
  stepText: {
    fontSize: 17,
    lineHeight: 26,
  },
  flex: {
    flex: 1,
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
  delete: {
    marginTop: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
  deleteLabel: {
    fontSize: 16,
    color: '#C0392B',
  },
});
