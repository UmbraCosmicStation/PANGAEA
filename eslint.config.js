import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**'] },

  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  // apps/web — React + 브라우저 환경
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },

  // packages/core — 프레임워크/DOM 무의존 경계 (웹OS 장기 전략의 핵심 규율)
  {
    files: ['packages/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', 'react/*', 'react-dom/*', 'zustand', 'zustand/*'],
              message: '@pangaea/core는 프레임워크 무의존이어야 합니다. UI/State 레이어로 옮기세요.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'window', message: '@pangaea/core는 DOM 무의존이어야 합니다.' },
        { name: 'document', message: '@pangaea/core는 DOM 무의존이어야 합니다.' },
        { name: 'navigator', message: '@pangaea/core는 DOM 무의존이어야 합니다.' },
        { name: 'localStorage', message: '@pangaea/core는 DOM 무의존이어야 합니다.' },
      ],
    },
  },
);
