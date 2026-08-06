import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { effectiveTotalMinutes, splitDuration } from '@/lib/duration';
import { useTheme } from '@/hooks/use-theme';
import type { Recipe } from '@/db/schema';

type Props = {
  recipe: Recipe;
};

/** Time, servings and difficulty as text, skipping whatever the recipe lacks. */
function useMetaParts(recipe: Recipe): string[] {
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

  return parts;
}

/** Time · servings · difficulty on one line, for dense rows. */
export function RecipeMeta({ recipe }: Props) {
  const parts = useMetaParts(recipe);

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

type BadgeProps = Props & {
  /** Badges sit on the page in the detail and inside a card in the list. */
  on?: 'page' | 'card';
};

/** The same facts as chips, for cards and the detail header. */
export function RecipeMetaBadges({ recipe, on = 'page' }: BadgeProps) {
  const theme = useTheme();
  const parts = useMetaParts(recipe);
  const backgroundColor = on === 'card' ? theme.background : theme.backgroundElement;

  return (
    <View style={styles.badges}>
      {parts.map((part) => (
        <View key={part} style={[styles.badge, { backgroundColor }]}>
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
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  badge: {
    paddingHorizontal: Spacing.two + Spacing.half,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.two,
  },
});
