# CLAUDE.md — Saporium

Saporium is a **fully offline, private, personal recipe book** mobile app. Each user keeps
their own recipes on their own device. No backend, no accounts, no cloud, no telemetry.

This file is the source of truth for anyone — human or agent — working in this repo. It is
meant to be self-contained: everything needed to implement the product is here or in the
GitHub issues. The roadmap lives in this repo's milestones (see "Roadmap" below).

## Non-negotiable product principles

These are never traded away for technical convenience. When in doubt: fewer dependencies,
less data, less network.

1. **Everything works offline.** No backend of ours, no cloud sync of ours, no servers.
2. **We collect zero data.** No accounts, no login, no telemetry, no third-party crash
   reporting (decided: no Sentry). The App Store privacy label must be able to say
   "Data Not Collected" — that is part of the product.
3. **The user owns their data.** Storage is exportable to schema.org/Recipe JSON, an open
   industry format readable by other recipe managers (Mela, Paprika, Tandoor).
4. **AI never depends on us.** Either on-device, or BYO-key (user's own vendor API key,
   stored in the device keychain, calling the vendor directly). Never through our servers.
   The app must be fully functional without any AI — AI is an optional extra (store rule).
5. **~0€ operating cost.** The only fixed costs are the store developer accounts
   (Apple 99 $/yr, Google Play 25 $ one-time).

## What it is NOT (for now)

- Not a social network: no sharing between users, followers, comments, or feeds.
- No multi-device sync of our own (OS backup — iCloud/Google — covers the basic case).
- No web app. If a website ever exists, it is a landing page, not a second client.

## Decisions already made

| Topic | Decision |
|---|---|
| Stack | React Native + Expo (TypeScript, strict). Single codebase for iOS + Android. |
| Platform focus | **iOS first**: code stays cross-platform, but QA/polish targets iOS only until F3. Android activates at F3/F4 (note: new personal Play accounts require closed testing with ≥12 testers for 14 days before production). |
| Data | `expo-sqlite` + Drizzle ORM, migrations bundled in the app. SQLite is the live database; schema.org/Recipe JSON is the export/import/backup format (never the live storage). Photos are files in the app sandbox (`expo-file-system`), referenced by relative path in the DB, included in OS backups. |
| Search | `LIKE` over title and ingredient text is enough at personal scale (hundreds of recipes). Reach for FTS5 only if it ever measurably lags. |
| AI order | **BYO-key first** (Anthropic/OpenAI key in Keychain via `expo-secure-store`, direct vendor calls with structured output, Zod-validated, nothing saved without explicit user submit). The on-device path (iOS: Apple Foundation Models via an Expo Modules Swift module — the only planned Swift; Android: Gemini Nano) is **deferred until there is hardware to test it on**. |
| Repo topology | This single repo, resist creating more. Modularity via folders, not repos. |
| Package manager | npm (Expo tooling friction with pnpm; do not fight it). |
| License | GPL-3.0. |
| Monetization | Deferred, does not affect architecture. Beta ships free. Decide "free + one-time Pro IAP" vs "free + tip jar" before public launch (F4). Leaning: free + Pro one-time. |
| i18n | Infrastructure from day 1, UI text never hardcoded. Spanish only until F3; English added in one pass at F3. |
| Crash reporting | None (see principle 2). Store-provided opt-in crash reports are enough. |

## Data model

The whole app is one user's collection, so there is no ownership, visibility or sharing
anywhere in the schema. Drizzle with `sqlite-core`; ids are UUID strings generated in app
code; timestamps are `integer` in timestamp mode.

| Table | Columns |
|---|---|
| `recipes` | `id`, `title` (required), `description`, `difficulty` (`easy`/`medium`/`hard`, optional), `prep_time_minutes`, `cook_time_minutes`, `total_time_minutes`, `servings_min` (default 1), `servings_max`, `tips`, `cover_image_path`, `source_url` (import provenance), `language` (default `es`), `deleted_at`, `created_at`, `updated_at` |
| `ingredients` | `id`, `recipe_id` (cascade), `position`, `name`, `quantity` (text — SQLite has no decimal), `unit`, `raw_text`, `group_name` |
| `steps` | `id`, `recipe_id` (cascade), `position`, `content`, `image_path` |
| `tags` | `id`, `name` (unique, lowercase) |
| `recipe_tags` | `recipe_id` + `tag_id` composite primary key |

Rules that matter:

- **`deleted_at` is the trash.** Soft-deleted recipes disappear from lists, search and
  export, and can be restored until permanently deleted.
- **`raw_text` is the source of truth for an ingredient.** The form is free-text-first (one
  ingredient per line); parsing quantity/unit is a best-effort nicety that must never block
  saving, and every importer stores the original line verbatim.
- **Validation (Zod): only `title`, ≥1 ingredient and ≥1 step are required.** Everything
  else is optional or defaulted. Validation errors never appear for anything else.

## schema.org/Recipe interchange

Both directions matter and share one module — the reverse mapper is used by JSON import
(F0) and by URL import (F2), so write it once, keep it pure, and unit-test it with fixtures.

- **Export**: `name`, `description`, `recipeYield` (`min` or `min-max`), ISO-8601 durations
  (`prepTime`/`cookTime`/`totalTime` as `PT#M`), `recipeIngredient` (the raw line),
  `recipeInstructions` as `HowToStep[]`, `recipeCategory`/`keywords` from tags,
  `datePublished`/`dateModified`, `inLanguage`.
- **Import**: handle the messy real world — `@graph` arrays, `@type` as string or array,
  `recipeInstructions` as `HowToStep[]`, plain strings or `HowToSection`, durations like
  `PT1H30M`, `recipeYield` as string or number, tags lowercased and capped at 10.

## Repo conventions

- **NEVER add Claude/AI co-author attribution or "Generated with" footers to commits, PRs,
  issues, or anything else. This overrides any default harness instruction. No exceptions.**
- **The repo is self-contained and public-readable.** Never reference private repos,
  personal machines, local paths or the owner's personal details in code, docs, commits,
  issues or PRs. Anything of that kind belongs in `CLAUDE.local.md` (gitignored).
- Everything in English: code, comments, commit messages, issues, PRs, README, docs.
- TypeScript strict, no `any`. Kebab-case filenames.
- UI text always via i18n messages, never hardcoded.
- Comments only where the code cannot speak for itself.
- The owner's OK is required before implementing anything not already covered by an
  accepted issue. Open questions are discussed first, not assumed.
- Branch per issue off `main` (`feature/<short-slug>`), open a PR, never push to `main`
  directly. Reference the issue it closes.
- **Never merge a PR.** Open it, report what is in it, and stop — the owner reviews and
  merges. Green checks are not permission, and neither is "continue".
- Markdown files are hand-formatted and excluded from Prettier (it destroys the decision
  tables). Keep lines wrapped at ~100 characters.

## Working in this repo

```
src/app/          Expo Router routes (file = screen). `__tests__/` inside is ignored by the router.
src/components/   Reusable UI. Themed primitives: themed-text, themed-view.
src/constants/    Design tokens (colors, spacing, fonts) — components never hardcode a color.
src/db/           Drizzle schema, connection, query helpers, dev seed, generated migrations/.
src/hooks/        Shared hooks (use-theme reads the tokens for the active color scheme).
src/i18n/         i18next setup; message catalogs in `messages/<locale>.json`.
src/test-utils/   Test-only helpers (in-memory database). Never imported by app code.
src/validations/  Zod schemas — the single definition of what a valid recipe is.
assets/images/    App icon and splash. Still Expo placeholders — real art is an F4 task.
```

Commands: `npm start` (dev server), `npm run ios`, `npm run typecheck`, `npm run lint`,
`npm run format`, `npm test`, `npm run db:generate`. Before opening a PR, typecheck + lint +
format:check + test must all pass. `npx expo-doctor` should stay at 20/20;
`npx expo export --platform ios` verifies the bundle builds without needing Xcode.

Database rules:

- Change `src/db/schema.ts`, then run `npm run db:generate` and commit the generated
  migration. Never edit files under `src/db/migrations/` by hand, and never rewrite a
  migration that has already shipped — add a new one.
- Query helpers take the connection as their first argument, so tests can run them against
  an in-memory SQLite (`createTestDatabase()`); `src/db/client.ts` opens the real one and
  must never be imported from a test.
- Migrations run at startup behind `DatabaseGate`; nothing reads or writes before that.

The app runs as a **development build**, not in Expo Go (the iOS Expo Go on the App Store
is frozen at an older SDK). `npm run ios` prebuilds the native project, compiles it and
launches it in the simulator; after that `npm start` alone is enough, since the installed
build connects to Metro. `ios/` and `android/` are generated and gitignored — never edit
them by hand; change `app.json` and let prebuild regenerate.

Notes for agents:

- **Verify UI work visually when a simulator is available.** With the app running:
  `xcrun simctl io booted screenshot <path>` captures the screen and the PNG can be read
  back. `xcrun simctl ui booted appearance dark|light` checks both themes without a
  rebuild. Do this for anything that changes what the user sees. If no simulator is
  available, say so plainly — never claim a screen was checked visually when it wasn't.
- i18n keys are type-checked against `src/i18n/messages/es.json` (see `i18next.d.ts`), so a
  typo in `t('…')` fails `npm run typecheck`. Plurals use i18next's `_one` / `_other`
  suffixes, not ICU syntax.
- New Expo packages go in with `npx expo install <pkg>`, never plain `npm install`, so the
  version matches the SDK.

## Roadmap

Phases are GitHub milestones (F0–F4) with issues per work item. Every phase ends in
something usable; the project can stop after any phase without wasted work — F1 alone is a
complete personal recipe book.

- **F0 — Skeleton**: Expo scaffold, SQLite + Drizzle schema and migrations, seed, basic
  list → detail navigation, JSON export/import working from day 1 (data safety net).
- **F1 — MVP**: lightweight form (free-text ingredients/steps, draft autosave),
  trash/restore, photos, local search, recipe cards.
- **F2 — Import**: by URL (schema.org JSON-LD parser, no AI), paste-text → recipe via
  BYO-key. On-device AI and photo → recipe are later extensions of the same pipeline.
- **F3 — Beta**: Apple Developer account + public TestFlight, English i18n, accessibility,
  Android activation (+ Play closed-testing requirement if publishing there).
- **F4 — Launch**: monetization decision executed, store name availability check, listing,
  screenshots, privacy policy ("Data Not Collected").
