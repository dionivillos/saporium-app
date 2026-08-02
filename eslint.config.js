// https://docs.expo.dev/guides/using-eslint/
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

module.exports = [
  ...expoConfig,
  prettierConfig,
  {
    ignores: ['dist/*', '.expo/*', 'coverage/*', 'docs/local/*'],
  },
  {
    rules: {
      // CLAUDE.md: TypeScript strict, no `any`.
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
];
