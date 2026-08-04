import { relations, sql } from 'drizzle-orm';
import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// The whole database belongs to one person, so nothing here models ownership,
// visibility or sharing. Ids are UUID strings generated in app code; timestamps
// are epoch integers.

const timestamps = {
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
};

export const recipes = sqliteTable(
  'recipes',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    description: text('description'),
    difficulty: text('difficulty', { enum: ['easy', 'medium', 'hard'] }),
    prepTimeMinutes: integer('prep_time_minutes'),
    cookTimeMinutes: integer('cook_time_minutes'),
    totalTimeMinutes: integer('total_time_minutes'),
    servingsMin: integer('servings_min').notNull().default(1),
    servingsMax: integer('servings_max'),
    tips: text('tips'),
    /** Relative path inside the app sandbox, never an absolute path. */
    coverImagePath: text('cover_image_path'),
    /** Where the recipe was imported from, when it was imported. */
    sourceUrl: text('source_url'),
    language: text('language').notNull().default('es'),
    /** Set when the recipe is in the trash; restorable until purged. */
    deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
    ...timestamps,
  },
  (t) => [index('idx_recipes_deleted_at').on(t.deletedAt), index('idx_recipes_title').on(t.title)]
);

export const ingredients = sqliteTable(
  'ingredients',
  {
    id: text('id').primaryKey(),
    recipeId: text('recipe_id')
      .notNull()
      .references(() => recipes.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    name: text('name').notNull(),
    /** Text, not a number: SQLite has no decimal type. */
    quantity: text('quantity'),
    unit: text('unit'),
    /** The line exactly as the user typed or the importer found it. */
    rawText: text('raw_text'),
    groupName: text('group_name'),
  },
  (t) => [index('idx_ingredients_recipe').on(t.recipeId, t.position)]
);

export const steps = sqliteTable(
  'steps',
  {
    id: text('id').primaryKey(),
    recipeId: text('recipe_id')
      .notNull()
      .references(() => recipes.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    content: text('content').notNull(),
    imagePath: text('image_path'),
  },
  (t) => [index('idx_steps_recipe').on(t.recipeId, t.position)]
);

export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  /** Always stored lowercase. */
  name: text('name').notNull().unique(),
});

export const recipeTags = sqliteTable(
  'recipe_tags',
  {
    recipeId: text('recipe_id')
      .notNull()
      .references(() => recipes.id, { onDelete: 'cascade' }),
    tagId: text('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.recipeId, t.tagId] }), index('idx_recipe_tags_tag').on(t.tagId)]
);

// ─── Relations (enable the query builder's `with` joins) ─────────────────────

export const recipesRelations = relations(recipes, ({ many }) => ({
  ingredients: many(ingredients),
  steps: many(steps),
  recipeTags: many(recipeTags),
}));

export const ingredientsRelations = relations(ingredients, ({ one }) => ({
  recipe: one(recipes, { fields: [ingredients.recipeId], references: [recipes.id] }),
}));

export const stepsRelations = relations(steps, ({ one }) => ({
  recipe: one(recipes, { fields: [steps.recipeId], references: [recipes.id] }),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  recipeTags: many(recipeTags),
}));

export const recipeTagsRelations = relations(recipeTags, ({ one }) => ({
  recipe: one(recipes, { fields: [recipeTags.recipeId], references: [recipes.id] }),
  tag: one(tags, { fields: [recipeTags.tagId], references: [tags.id] }),
}));

export type Recipe = typeof recipes.$inferSelect;
export type Ingredient = typeof ingredients.$inferSelect;
export type Step = typeof steps.$inferSelect;
export type Tag = typeof tags.$inferSelect;
