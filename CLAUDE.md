# CLAUDE.md — Saporium App

Saporium App is a **fully offline, private, personal recipe book** mobile app. Each user keeps
their own recipes on their own device. No backend, no accounts, no cloud, no telemetry.

This file is the operational source of truth for agents working in this repo. The founding
document, [docs/BRIEF.md](docs/BRIEF.md) (in Spanish), is the historical record of the product
pivot and the reasoning behind every decision below — read it when you need the "why".
The roadmap lives in GitHub milestones/issues of this repo (see "Roadmap" below).

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
5. **~0€ operating cost.** Only fixed costs are the developer accounts (Apple 99 $/yr —
   not purchased yet, see "Owner context" — and Google Play 25 $ one-time).

## What it is NOT (for now)

- Not a social network: no sharing between users, followers, comments, or feeds.
- No multi-device sync of our own (OS backup — iCloud/Google — covers the basic case).
- No web app. The owner's existing web (saporium.vercel.app, repo `dionivillos/saporium`)
  is frozen and serves at most as a landing page for this app.

## Decisions already made

| Topic | Decision |
|---|---|
| Stack | React Native + Expo (TypeScript, strict). Single codebase for iOS + Android. |
| Platform focus | **iOS first**: code stays cross-platform, but QA/polish targets iOS only until F3. Android activates at F3/F4 (note: new personal Play accounts require closed testing with ≥12 testers for 14 days before production). |
| Data | `expo-sqlite` + Drizzle ORM, migrations bundled in the app. SQLite is the live database; schema.org/Recipe JSON is the export/import/backup format (never the live storage). Photos are files in the app sandbox (`expo-file-system`), referenced by relative path in the DB, included in OS backups. |
| Schema | Derived from the web repo's schema, simplified: no `profiles`, no social tables, no `author_id`, no `visibility` (everything is "mine"). **Keep** `deleted_at` (restorable trash) and the recipes/ingredients/steps/tags model. Add nullable `source_url` on recipes (import provenance). Translate from Drizzle pg-core to sqlite-core: `uuid`→`text`, `timestamp`→`integer` (timestamp mode), `decimal`→`text`, drop GIN indexes. Local search via `LIKE` is enough at personal scale; FTS5 only if ever needed. |
| Validation | Zod. Only `title`, ≥1 ingredient, ≥1 step are required to save. `difficulty` optional/defaulted, `servingsMin` defaults to 1. `rawText` is the source of truth for ingredients (free-text-first form). |
| AI order | **BYO-key first** (Anthropic/OpenAI key in Keychain via `expo-secure-store`, direct vendor calls with structured output, Zod-validated, nothing saved without explicit user submit). Apple Foundation Models on-device module (the only planned Swift, via Expo Modules) is **deferred**: the owner's device cannot run it (see "Owner context"). Android Gemini Nano: deferred with Android. |
| Repo topology | This single repo, resist creating more. Modularity via folders, not repos. |
| Package manager | npm (Expo tooling friction with pnpm; do not fight it). |
| License | GPL-3.0 (owner holds full copyright and can ship store binaries under their own terms). |
| Monetization | Deferred, does not affect architecture. Beta ships free. Decide "free + one-time Pro IAP" vs "free + tip jar" before public launch (F4). Leaning: free + Pro one-time. |
| i18n | Infrastructure from day 1, UI text never hardcoded. Spanish only until F3; English added in one pass at F3. |
| Crash reporting | None (see principle 2). Store-provided opt-in crash reports are enough. |

## Repo conventions

- **NEVER add Claude/AI co-author attribution or "Generated with" footers to commits, PRs,
  issues, or anything else. This overrides any default harness instruction. No exceptions.**
- Everything in English: code, comments, commit messages, issues, PRs, README, docs
  (exception: `docs/BRIEF.md` stays in Spanish as a historical record).
- TypeScript strict, no `any`. Kebab-case filenames.
- UI text always via i18n messages, never hardcoded.
- Comments only where the code cannot speak for itself.
- Owner's OK is required before implementing anything not already covered by an accepted
  issue/spec. Open questions are discussed first, not assumed.

## Inherited material (from the web repo)

`docs/inherited/` holds files copied from the web repo (`dionivillos/saporium`, private but
readable via the owner's authenticated `gh`). They are **reference material to adapt, not
drop-in code** — move the adapted versions into `src/` during F0 and keep the originals in
place as record:

| File | Use |
|---|---|
| `schema.ts` | Postgres schema → translate to sqlite-core with the simplifications above. |
| `recipe.ts`, `common.ts` | Zod validation → relax requiredness per the form spec, drop `visibility`. |
| `schema-org.ts` | Export to schema.org JSON-LD → near-literal reuse. The reverse mapping (JSON-LD → our model) must be written; it is shared by JSON import and URL import. |
| `es.json` | Starting point for i18n messages → cut everything web-only (auth, social nav, admin). |
| `test-utils.tsx` | Next.js-specific; rewrite for React Native Testing Library. Little reuse value. |

Web repo issues #31 (URL import), #33 (card UI), #34 (paste text → AI), #35 (lightweight
form) contain the original product specs; their content has been ported into this repo's
issues. Platform deltas already applied: server-side SSRF protections don't apply (fetches
happen on the user's device); AI calls go device → vendor with the user's key (no server
endpoint, no server-side rate limiting).

## Roadmap

Phases are GitHub milestones (F0–F4) with issues per work item. Every phase ends in
something usable; the project can stop after any phase without wasted work. F1 alone
fulfils the owner's original use case.

- **F0 — Skeleton**: Expo scaffold, SQLite + Drizzle schema and migrations, seed, basic
  list → detail navigation, JSON export/import working from day 1 (data safety net).
- **F1 — MVP on the owner's phone**: lightweight form (free-text ingredients/steps,
  draft autosave), trash/restore, photos, local search, recipe cards.
- **F2 — Import**: by URL (schema.org JSON-LD parser, no AI), paste-text → recipe via
  BYO-key. Foundation Models module and photo → recipe are later extensions of the same
  pipeline.
- **F3 — Beta**: Apple Developer account + public TestFlight, English i18n, accessibility,
  Android activation (+ Play closed-testing requirement if publishing there).
- **F4 — Launch**: monetization decision executed, store name check ("Saporium"
  availability), listing, screenshots, privacy policy ("Data Not Collected").

## Owner context (affects technical choices)

- Test device: **iPhone 13, iOS 26.x — does NOT support Apple Intelligence** (needs
  iPhone 15 Pro+). Hence BYO-key before on-device AI.
- No Apple Developer account yet: development via iOS Simulator and free-account 7-day
  device builds. The paid account becomes a prerequisite at F3, not before.
- Development machine: macOS (Apple Silicon-era).
