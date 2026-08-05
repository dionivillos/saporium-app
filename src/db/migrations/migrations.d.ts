// Hand-written types for the `migrations.js` bundle drizzle-kit generates.
// Shape matches drizzle-orm/expo-sqlite/migrator's MigrationConfig.
declare const migrations: {
  journal: {
    entries: { idx: number; when: number; tag: string; breakpoints: boolean }[];
  };
  migrations: Record<string, string>;
};

export default migrations;
