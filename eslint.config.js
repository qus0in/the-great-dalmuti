import js from '@eslint/js';
import globals from 'globals';
import compat from 'eslint-plugin-compat';
import eslintConfigPrettier from 'eslint-config-prettier';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-var': 'error',
      'prefer-const': 'error',
      'no-param-reassign': ['error', { props: true }],
      'max-lines-per-function': [
        'error',
        { max: 30, skipBlankLines: true, skipComments: true },
      ],
      complexity: ['error', 10],
      'max-depth': ['error', 3],
      'max-params': ['error', 3],
      eqeqeq: ['error', 'always'],
      'prefer-template': 'error',
      'prefer-destructuring': [
        'error',
        {
          VariableDeclarator: { array: false, object: true },
          AssignmentExpression: { array: false, object: false },
        },
      ],
      'prefer-arrow-callback': 'error',
      'no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-console': 'error',
      'require-await': 'error',
      'no-async-promise-executor': 'error',
      'no-promise-executor-return': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ExportDefaultDeclaration',
          message:
            'Default export is forbidden. Use named exports (Decision 44).',
        },
        {
          selector: 'ClassDeclaration:not([superClass.name="Error"])',
          message:
            'Classes are forbidden except extending Error (Decisions 43, 55).',
        },
        {
          selector: 'ClassExpression:not([superClass.name="Error"])',
          message:
            'Classes are forbidden except extending Error (Decisions 43, 55).',
        },
        {
          selector: 'CallExpression[callee.name="require"]',
          message:
            'CommonJS require is forbidden. Use ESM imports (Decision 44).',
        },
      ],
    },
  },
  {
    files: ['src/ui/server.js', 'src/**/logger.js'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['src/ui/public/**/*.js'],
    ...compat.configs['flat/recommended'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
  eslintConfigPrettier,
];
