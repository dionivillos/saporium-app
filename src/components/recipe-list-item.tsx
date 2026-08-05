import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { RecipeMeta } from '@/components/recipe-meta';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { Recipe } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';
import { photoUri } from '@/lib/photos';

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
      {recipe.coverImagePath !== null && (
        <Image
          source={{ uri: photoUri(recipe.coverImagePath) }}
          style={styles.thumbnail}
          contentFit="cover"
          accessibilityIgnoresInvertColors
        />
      )}
      <View style={styles.text}>
        <ThemedText style={styles.title} numberOfLines={2}>
          {recipe.title}
        </ThemedText>
        <RecipeMeta recipe={recipe} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    gap: Spacing.three,
  },
  text: {
    flex: 1,
    gap: Spacing.one,
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: Spacing.two,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: 600,
  },
});
