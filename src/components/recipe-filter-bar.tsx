import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { RecipeFilters } from '@/db/recipes';
import type { Recipe } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';

const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;

type Props = {
  filters: RecipeFilters;
  onChange: (filters: RecipeFilters) => void;
  /** Tags in use, so the row never offers a filter that matches nothing. */
  tags: string[];
};

export function RecipeFilterBar({ filters, onChange, tags }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();

  /** Tapping the active value clears it, so a filter needs no separate reset. */
  function toggleDifficulty(value: Recipe['difficulty']) {
    onChange({ ...filters, difficulty: filters.difficulty === value ? null : value });
  }

  function toggleTag(value: string) {
    onChange({ ...filters, tag: filters.tag === value ? null : value });
  }

  return (
    <View style={styles.bar}>
      <TextInput
        accessibilityLabel={t('common.search')}
        value={filters.search}
        onChangeText={(search) => onChange({ ...filters, search })}
        placeholder={t('recipes.search.placeholder')}
        placeholderTextColor={theme.textSecondary}
        autoCorrect={false}
        clearButtonMode="while-editing"
        returnKeyType="search"
        style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.chips}
      >
        {DIFFICULTIES.map((difficulty) => (
          <Chip
            key={difficulty}
            label={t(`recipes.difficulty.${difficulty}`)}
            selected={filters.difficulty === difficulty}
            onPress={() => toggleDifficulty(difficulty)}
          />
        ))}
        {tags.map((tag) => (
          <Chip
            key={tag}
            label={`#${tag}`}
            selected={filters.tag === tag}
            onPress={() => toggleTag(tag)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected || pressed ? theme.backgroundSelected : theme.backgroundElement,
          borderColor: selected ? theme.text : 'transparent',
        },
      ]}
    >
      <ThemedText type="small">{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    gap: Spacing.two,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  input: {
    marginHorizontal: Spacing.four,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + Spacing.one,
    fontSize: 16,
    lineHeight: 22,
  },
  chips: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + Spacing.half,
    borderRadius: 999,
    borderWidth: 1,
  },
});
