import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Sheet, SheetOption, sheetStyles } from '@/components/sheet';
import { ThemedText } from '@/components/themed-text';
import { NATURAL_DIRECTION, SORT_FIELDS, type RecipeSort, type SortField } from '@/db/recipes';

type Props = {
  visible: boolean;
  sort: RecipeSort;
  onChange: (sort: RecipeSort) => void;
  onClose: () => void;
};

/**
 * Field first, then direction. Four fixed presets could not express "the
 * longest recipes" without listing every field twice, and the direction only
 * means something once you know what is being ordered.
 */
export function RecipeSortSheet({ visible, sort, onChange, onClose }: Props) {
  const { t } = useTranslation();

  /** Switching field starts from whichever way round that field usually reads. */
  function pickField(field: SortField) {
    onChange({ field, direction: NATURAL_DIRECTION[field] });
  }

  return (
    <Sheet visible={visible} title={t('recipes.sort.label')} onClose={onClose}>
      <View style={sheetStyles.group}>
        <ThemedText type="smallBold">{t('recipes.sort.field')}</ThemedText>
        <View style={sheetStyles.options}>
          {SORT_FIELDS.map((field) => (
            <SheetOption
              key={field}
              label={t(`recipes.sort.fields.${field}`)}
              selected={sort.field === field}
              onPress={() => pickField(field)}
            />
          ))}
        </View>
      </View>

      <View style={sheetStyles.group}>
        <ThemedText type="smallBold">{t('recipes.sort.direction')}</ThemedText>
        <View style={sheetStyles.options}>
          {(['asc', 'desc'] as const).map((direction) => (
            <SheetOption
              key={direction}
              // Worded per field: "oldest first" and "fewest servings" are the
              // same direction but nobody thinks of them with the same words.
              label={t(`recipes.sort.directions.${sort.field}.${direction}`)}
              selected={sort.direction === direction}
              onPress={() => onChange({ ...sort, direction })}
            />
          ))}
        </View>
      </View>
    </Sheet>
  );
}
