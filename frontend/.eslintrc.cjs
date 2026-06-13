module.exports = {
  root: true,
  env: {browser: true, es2020: true},
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: [
    'dist',
    'wailsjs',
    'node_modules',
    '.eslintrc.cjs',
    'vite.config.ts',
    'hypr/', // stale nested Wails scaffold, not part of the app
  ],
  parser: '@typescript-eslint/parser',
  rules: {
    // The Wails bindings and event payloads are loosely typed; `any` is pragmatic here.
    '@typescript-eslint/no-explicit-any': 'off',
    // The React root element is known to exist.
    '@typescript-eslint/no-non-null-assertion': 'off',
    // Fire-and-forget .catch(() => {}) is intentional for non-critical persistence calls.
    '@typescript-eslint/no-empty-function': 'off',
  },
}
