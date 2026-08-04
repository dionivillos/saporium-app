CREATE TABLE `ingredients` (
	`id` text PRIMARY KEY NOT NULL,
	`recipe_id` text NOT NULL,
	`position` integer NOT NULL,
	`name` text NOT NULL,
	`quantity` text,
	`unit` text,
	`raw_text` text,
	`group_name` text,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_ingredients_recipe` ON `ingredients` (`recipe_id`,`position`);--> statement-breakpoint
CREATE TABLE `recipe_tags` (
	`recipe_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`recipe_id`, `tag_id`),
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_recipe_tags_tag` ON `recipe_tags` (`tag_id`);--> statement-breakpoint
CREATE TABLE `recipes` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`difficulty` text,
	`prep_time_minutes` integer,
	`cook_time_minutes` integer,
	`total_time_minutes` integer,
	`servings_min` integer DEFAULT 1 NOT NULL,
	`servings_max` integer,
	`tips` text,
	`cover_image_path` text,
	`source_url` text,
	`language` text DEFAULT 'es' NOT NULL,
	`deleted_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_recipes_deleted_at` ON `recipes` (`deleted_at`);--> statement-breakpoint
CREATE INDEX `idx_recipes_title` ON `recipes` (`title`);--> statement-breakpoint
CREATE TABLE `steps` (
	`id` text PRIMARY KEY NOT NULL,
	`recipe_id` text NOT NULL,
	`position` integer NOT NULL,
	`content` text NOT NULL,
	`image_path` text,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_steps_recipe` ON `steps` (`recipe_id`,`position`);--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_unique` ON `tags` (`name`);