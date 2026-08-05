import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { effectiveTotalMinutes, splitDuration } from '@/lib/duration';
import type { Recipe } from '@/db/schema';

type Props = {
  recipe: Recipe;
};

/** Time · servings · difficulty. Omits whatever the recipe does not have. */
export function RecipeMeta({ recipe }: Props) {
  const { t } = useTranslation();
  const parts: string[] = [];

  const total = effectiveTotalMinutes(recipe);
  if (total !== null) {
    const { hours, minutes } = splitDuration(total);
    if (hours === 0) parts.push(t('common.minutes', { value: minutes }));
    else if (minutes === 0) parts.push(t('common.hours', { count: hours }));
    else parts.push(t('common.hoursMinutes', { hours, minutes }));
  }

  if (recipe.servingsMax !== null && recipe.servingsMax !== recipe.servingsMin) {
    parts.push(t('common.servingsRange', { min: recipe.servingsMin, max: recipe.servingsMax }));
  } else {
    parts.push(t('common.servings', { count: recipe.servingsMin }));
  }

  if (recipe.difficulty !== null) {
    parts.push(t(`recipes.difficulty.${recipe.difficulty}`));
  }

  return (
    <View style={styles.row}>
      {parts.map((part, index) => (
        <View key={part} style={styles.item}>
          {index > 0 && (
            <ThemedText type="small" themeColor="textSecondary" accessibilityElementsHidden>
              ·
            </ThemedText>
          )}
          <ThemedText type="small" themeColor="textSecondary">
            {part}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginRight: Spacing.two,
  },
});
