import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import playwright from 'eslint-plugin-playwright';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: ['node_modules', 'playwright-report', 'test-results', 'blob-report', 'coverage', 'dist'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    },
  },
  {
    files: ['tests/**/*.ts'],
    plugins: { playwright },
    // Specs import `test`/`expect` from the repo's fixtures, not straight from
    // @playwright/test, so tell the plugin which names are the Playwright ones.
    settings: {
      playwright: {
        globalAliases: { test: ['test'], expect: ['expect'] },
      },
    },
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      // A skipped test is an assertion that stopped existing. Known defects are
      // pinned with `@known-defect`, never skipped, so this can be an error.
      'playwright/no-skipped-test': 'error',
      // `force: true` hides a real reachability/actionability bug.
      'playwright/no-force-option': 'error',
      // Arbitrary sleeps paper over a missing await/poll.
      'playwright/no-wait-for-timeout': 'error',
      // An expectation inside `if` only runs when that branch happens to be taken.
      'playwright/no-conditional-expect': 'error',
      // Every test must assert something. A page object's `assertLoaded()` does
      // not count here - this rule only sees `expect` - so tests that navigate
      // also assert the landing element explicitly.
      'playwright/expect-expect': 'error',
      // These two matchers pass on values that cannot be trusted.
      'playwright/no-restricted-matchers': [
        'error',
        {
          toBeTruthy:
            'Use a value assertion (toBe/toEqual/toMatch/toBeGreaterThan): toBeTruthy passes on any non-empty value.',
          toBeDefined:
            'Use a value assertion (toBe/toEqual/toMatch/toBeGreaterThan): toBeDefined passes on null and "" too.',
        },
      ],
    },
  },
  {
    files: ['src/fixtures/**/*.ts'],
    ...playwright.configs['flat/recommended'],
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      // Fixture files do not own expectations; the specs that use them do.
      'playwright/expect-expect': 'off',
    },
  },
  prettier,
);
