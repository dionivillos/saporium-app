# Saporium App

A fully offline, private, personal recipe book for your phone.

Saporium App lets you keep your own recipes on your own device. No accounts, no cloud, no
tracking — the app works entirely offline and collects zero data. Your recipes are yours:
everything is exportable to [schema.org/Recipe](https://schema.org/Recipe) JSON, an open
format readable by other recipe managers.

## Features (planned)

- Create and organize recipes with a fast, free-text-first form
- Photos, tags, local search, restorable trash
- One-file JSON backup: export and import your whole collection at any time
- Import recipes from any URL (schema.org parser — no AI needed)
- Optional AI import from pasted text or photos: on-device where available, or bring your
  own API key — never through our servers

## Principles

1. **Everything works offline.** No backend, no sync servers.
2. **Zero data collection.** No accounts, no telemetry, no crash reporters.
3. **Your data is yours.** Open, exportable storage format.
4. **AI never depends on us.** On-device or bring-your-own-key, always optional.

## Tech

React Native + Expo (TypeScript), `expo-sqlite` + Drizzle ORM, schema.org/Recipe JSON as
the interchange format. iOS first; Android planned.

## Status

Early development — pre-MVP. See the [milestones](../../milestones) for the roadmap and
[CLAUDE.md](CLAUDE.md) for project conventions and architecture decisions.

## License

[GPL-3.0](LICENSE). The source is open; the copyright holder distributes store binaries
under their own terms.
