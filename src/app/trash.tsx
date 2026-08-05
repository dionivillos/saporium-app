import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { RecipeMeta } from '@/components/recipe-meta';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { db } from '@/db/client';
import { deleteRecipePermanently, listTrashedRecipes, restoreRecipe } from '@/db/recipes';
import type { Recipe } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';
import { deletePhoto } from '@/lib/photos';

export default function TrashScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  const refresh = useCallback(() => setRecipes(listTrashedRecipes(db)), []);
  useFocusEffect(refresh);

  function handleRestore(id: string) {
    restoreRecipe(db, id);
    refresh();
  }

  function handleDeleteForever(recipe: Recipe) {
    Alert.alert(
      t('trash.deleteForeverTitle'),
      t('trash.deleteForeverDescription', { title: recipe.title }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('trash.deleteForever'),
          style: 'destructive',
          onPress: () => {
            // The row goes first: an orphaned file is harmless, a broken
            // reference is not.
            deleteRecipePermanently(db, recipe.id);
            deletePhoto(recipe.coverImagePath);
            refresh();
          },
        },
      ]
    );
  }

  if (recipes.length === 0) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="subtitle">{t('trash.empty')}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={recipes}
        keyExtractor={(recipe) => recipe.id}
        style={styles.scroll}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: theme.border }]} />
        )}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <ThemedText style={styles.title} numberOfLines={2}>
              {item.title}
            </ThemedText>
            <RecipeMeta recipe={item} />
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => handleRestore(item.id)}
                style={({ pressed }) => [
                  styles.action,
                  {
                    backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement,
                  },
                ]}
              >
                <ThemedText type="small">{t('trash.restore')}</ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => handleDeleteForever(item)}
                style={({ pressed }) => [
                  styles.action,
                  {
                    backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement,
                  },
                ]}
              >
                <ThemedText type="small" style={styles.destructive}>
                  {t('trash.deleteForever')}
                </ThemedText>
              </Pressable>
            </View>
          </View>
        )}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  list: {
    paddingVertical: Spacing.two,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  row: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    gap: Spacing.two,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: 600,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  action: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
  },
  destructive: {
    color: '#C0392B',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: Spacing.four,
  },
});
