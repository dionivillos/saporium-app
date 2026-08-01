import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  decimal,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

// ─── Timestamps reutilizables ────────────────────────────────────────────────

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};

// ─── Tablas principales ──────────────────────────────────────────────────────

export const profiles = pgTable(
  'profiles',
  {
    id: uuid('id').primaryKey(), // referencia a auth.users.id de Supabase
    username: text('username').unique().notNull(),
    displayName: text('display_name').notNull(),
    bio: text('bio'),
    avatarUrl: text('avatar_url'),
    locale: text('locale').notNull().default('es'),
    themePreference: text('theme_preference').notNull().default('system'),
    isAdmin: boolean('is_admin').notNull().default(false),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    check('profiles_theme_check', sql`${t.themePreference} IN ('system', 'light', 'dark')`),
    index('idx_profiles_search').using('gin', sql`to_tsvector('spanish', ${t.displayName})`),
  ]
);

export const recipes = pgTable(
  'recipes',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    authorId: uuid('author_id')
      .notNull()
      .references(() => profiles.id),
    title: text('title').notNull(),
    description: text('description'),
    difficulty: text('difficulty').notNull(),
    prepTimeMinutes: integer('prep_time_minutes'),
    cookTimeMinutes: integer('cook_time_minutes'),
    totalTimeMinutes: integer('total_time_minutes'),
    servingsMin: integer('servings_min').notNull(),
    servingsMax: integer('servings_max'),
    tips: text('tips'),
    coverImageUrl: text('cover_image_url'),
    visibility: text('visibility').notNull().default('public'),
    forkedFromId: uuid('forked_from_id'),
    language: text('language').notNull().default('es'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    check('recipes_difficulty_check', sql`${t.difficulty} IN ('easy', 'medium', 'hard')`),
    check('recipes_visibility_check', sql`${t.visibility} IN ('public', 'private', 'draft')`),
    index('idx_recipes_author').on(t.authorId),
    index('idx_recipes_visibility').on(t.visibility),
    index('idx_recipes_deleted').on(t.deletedAt),
    index('idx_recipes_title_search').using('gin', sql`to_tsvector('spanish', ${t.title})`),
  ]
);

export const ingredients = pgTable(
  'ingredients',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    recipeId: uuid('recipe_id')
      .notNull()
      .references(() => recipes.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    name: text('name').notNull(),
    quantity: decimal('quantity'),
    unit: text('unit'),
    rawText: text('raw_text'),
    groupName: text('group_name'),
  },
  (t) => [index('idx_ingredients_recipe').on(t.recipeId, t.position)]
);

export const steps = pgTable(
  'steps',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    recipeId: uuid('recipe_id')
      .notNull()
      .references(() => recipes.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    content: text('content').notNull(),
    imageUrl: text('image_url'),
  },
  (t) => [index('idx_steps_recipe').on(t.recipeId, t.position)]
);

export const tags = pgTable('tags', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text('name').unique().notNull(),
});

export const recipeTags = pgTable(
  'recipe_tags',
  {
    recipeId: uuid('recipe_id')
      .notNull()
      .references(() => recipes.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (t) => [
    primaryKey({ columns: [t.recipeId, t.tagId] }),
    index('idx_recipe_tags_tag').on(t.tagId),
  ]
);

// ─── Tablas post-MVP (estructura lista, lógica pendiente) ────────────────────

export const favorites = pgTable(
  'favorites',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    recipeId: uuid('recipe_id')
      .notNull()
      .references(() => recipes.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.recipeId] }),
    index('idx_favorites_user').on(t.userId),
  ]
);

export const ratings = pgTable(
  'ratings',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    recipeId: uuid('recipe_id')
      .notNull()
      .references(() => recipes.id, { onDelete: 'cascade' }),
    score: integer('score').notNull(),
    hasCooked: boolean('has_cooked').notNull().default(true),
    ...timestamps,
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.recipeId] }),
    check('ratings_score_check', sql`${t.score} BETWEEN 1 AND 5`),
  ]
);

export const follows = pgTable(
  'follows',
  {
    followerId: uuid('follower_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    followingId: uuid('following_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.followerId, t.followingId] }),
    check('follows_no_self_check', sql`${t.followerId} != ${t.followingId}`),
    index('idx_follows_follower').on(t.followerId),
    index('idx_follows_following').on(t.followingId),
  ]
);

export const comments = pgTable('comments', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  recipeId: uuid('recipe_id')
    .notNull()
    .references(() => recipes.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id')
    .notNull()
    .references(() => profiles.id),
  content: text('content').notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  ...timestamps,
});
