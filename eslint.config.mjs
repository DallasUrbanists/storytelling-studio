import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  { ignores: ['node_modules/**', '.local/**', '.worktrees/**'] },
  { ...js.configs.recommended, files: ['scripts/**/*.mjs', 'apps/*/src/**/*.mjs'],
    languageOptions: { globals: { console: 'readonly', process: 'readonly', fetch: 'readonly', AbortSignal: 'readonly', setTimeout: 'readonly' } } },
  ...tseslint.configs.recommended.map((config) => ({ ...config, files: ['packages/**/*.ts', 'apps/local-service/src/**/*.ts', 'apps/studio/src/**/*.ts'] })),
];
