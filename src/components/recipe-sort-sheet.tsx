import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Sheet, SheetOption, sheetStyles } from '@/components/sheet';
import { RECIPE_SORTS, type RecipeSort } from '@/db/recipes';

type Props = {
  visible: boolean;
  sort: RecipeSort;
  onChange: (sort: RecipeSort) => void;
  onClose: () => void;
};

/**
 * One choice, always active, so there is nothing to clear — picking an order
 * closes the sheet, which is the whole interaction.
 */
export function RecipeSortSheet({ visible, sort, onChange, onClose }: Props) {
  const { t } = useTranslation();

  return (
    <Sheet visible={visible} title={t('recipes.sort.label')} onClose={onClose}>
      <View style={sheetStyles.options}>
        {RECIPE_SORTS.map((option) => (
          <SheetOption
            key={option}
            label={t(`recipes.sort.${option}`)}
            selected={sort === option}
            onPress={() => {
              onChange(option);
              onClose();
            }}
          />
        ))}
      </View>
    </Sheet>
  );
}
