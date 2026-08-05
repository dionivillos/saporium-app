// jest-expo auto-mocks native modules, so `expo-crypto`'s randomUUID resolves
// to a stub that returns undefined. Id generation is not what any test is
// exercising, so delegate to Node's implementation instead.
jest.mock('expo-crypto', () => ({
  randomUUID: (): string => require('node:crypto').randomUUID(),
}));
