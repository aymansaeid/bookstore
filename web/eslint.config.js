import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier/flat';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import { reactRefresh } from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores(['dist', 'coverage']),

  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
      reactHooks.configs.flat['recommended-latest'],
      reactRefresh.configs.vite(),
      jsxA11y.flatConfigs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      // Relative imports that climb out of a feature are a smell; use the @/ alias.
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['../../*'], message: 'Use the @/ alias instead.' }] },
      ],
    },
  },

  {
    files: ['src/**/*.test.{ts,tsx}'],
    languageOptions: { globals: globals.node },
  },

  {
    files: ['eslint.config.js'],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },

  // Must stay last: turns off every stylistic rule Prettier owns.
  prettier,
]);
