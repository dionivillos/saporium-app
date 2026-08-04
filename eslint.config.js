// https://docs.expo.dev/guides/using-eslint/
const typescriptPlugin = require('@typescript-eslint/eslint-plugin');
const eslintConfigPrettier = require('eslint-config-prettier');
const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  eslintConfigPrettier,
  {
    ignores: ['dist/*', '.expo/*', 'coverage/*', 'docs/local/*', 'src/db/migrations/*'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: { '@typescript-eslint': typescriptPlugin },
    rules: {
      // CLAUDE.md: TypeScript strict, no `any`.
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
];
