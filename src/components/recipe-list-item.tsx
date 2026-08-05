import { Pressable, StyleSheet } from 'react-native';

import { RecipeMeta } from '@/components/recipe-meta';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { Recipe } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  recipe: Recipe;
  onPress: () => void;
};

/** A plain row for now — the photo-forward card redesign is a later task. */
export function RecipeListItem({ recipe, onPress }: Props) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? theme.backgroundSelected : theme.background },
      ]}
    >
      <ThemedText style={styles.title} numberOfLines={2}>
        {recipe.title}
      </ThemedText>
      <RecipeMeta recipe={recipe} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    gap: Spacing.one,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: 600,
  },
});
