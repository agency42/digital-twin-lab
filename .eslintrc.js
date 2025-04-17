module.exports = {
  env: {
    browser: true,
    node: true,
    es2021: true
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    ecmaVersion: 12,
    sourceType: 'module',
    ecmaFeatures: { jsx: true }
  },
  plugins: [
    '@typescript-eslint',
    'import',
    'react',
    'react-hooks',
    'node',
    'promise'
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:node/recommended',
    'plugin:promise/recommended'
  ],
  settings: {
    react: { version: 'detect' }
  },
  rules: {
    // custom rule overrides
  }
};
