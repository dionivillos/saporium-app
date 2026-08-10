import { Pressable, StyleSheet, View } from 'react-native';

import { RecipeCover } from '@/components/recipe-cover';
import { RecipeMetaBadges } from '@/components/recipe-meta';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { RecipeListEntry } from '@/db/recipes';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  recipe: RecipeListEntry;
  onPress: () => void;
};

/** How many tags fit before the row starts wrapping into a second line. */
const VISIBLE_TAGS = 3;

/**
 * Photo-forward and full width: a personal collection is dozens of recipes, not
 * thousands, so browsing it should feel like turning pages rather than reading
 * an index.
 */
export function RecipeCard({ recipe, onPress }: Props) {
  const theme = useTheme();
  const visibleTags = recipe.tags.slice(0, VISIBLE_TAGS);
  const overflow = recipe.tags.length - visibleTags.length;

  // One announcement per card, so VoiceOver reads a recipe in a single swipe
  // instead of four fragments the listener has to reassemble.
  const spoken = [recipe.title, recipe.description, ...recipe.tags]
    .filter((part): part is string => part !== null && part !== '')
    .join('. ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={spoken}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement,
          borderColor: theme.border,
        },
      ]}
    >
      <RecipeCover coverImagePath={recipe.coverImagePath} style={styles.cover} />

      <View
        style={styles.body}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <ThemedText style={styles.title} maxFontSizeMultiplier={1.8}>
          {recipe.title}
        </ThemedText>

        {recipe.description !== null && (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
            {recipe.description}
          </ThemedText>
        )}

        <RecipeMetaBadges recipe={recipe} on="card" />

        {visibleTags.length > 0 && (
          <View style={styles.tags}>
            {visibleTags.map((tag) => (
              <ThemedText key={tag} type="small" themeColor="textSecondary">
                #{tag}
              </ThemedText>
            ))}
            {overflow > 0 && (
              <ThemedText type="small" themeColor="textSecondary">
                +{overflow}
              </ThemedText>
            )}
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  cover: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  body: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  title: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: 700,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
