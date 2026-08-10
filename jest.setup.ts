// jest-expo auto-mocks native modules, so `expo-crypto`'s randomUUID resolves
// to a stub that returns undefined. Id generation is not what any test is
// exercising, so delegate to Node's implementation instead.
jest.mock('expo-crypto', () => ({
  randomUUID: (): string => require('node:crypto').randomUUID(),
}));

// expo-image reaches for native APIs at import time. Nothing under test cares
// how a photo is decoded, only that it is rendered when there is one.
jest.mock('expo-image', () => ({
  Image: require('react-native').View,
}));

// The suite asserts on user-visible strings, so its outcome must not depend on
// the language of whatever machine runs it. Adding English made that real:
// without this, the same tests pass or fail depending on the device locale.
// The catalogs are compared against each other in their own test instead.
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'es' }],
}));
