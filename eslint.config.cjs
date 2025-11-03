module.exports = [
  {
    ignores: ['node_modules/**', 'dist/**', 'build/**', 'public/**', '.vscode/**', '.idea/**', 'coverage/**', 'functions/lib/**']
  },
  {
    files: ['src/**/*.{js,jsx,ts,tsx}', 'functions/src/**/*.{js,ts}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parser: require('@typescript-eslint/parser'),
      parserOptions: {
        ecmaFeatures: { jsx: true },
        project: './tsconfig.json',
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        global: 'readonly',
      }
    },
    plugins: {
      '@typescript-eslint': require('@typescript-eslint/eslint-plugin'),
      'react': require('eslint-plugin-react'),
      'react-hooks': require('eslint-plugin-react-hooks'),
      'import': require('eslint-plugin-import'),
      'jsx-a11y': require('eslint-plugin-jsx-a11y'),
    },
    rules: {
      // Essential TypeScript rules
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      // Essential ESLint rules
      'no-unused-vars': 'off', // Turned off in favor of @typescript-eslint/no-unused-vars
      'no-console': 'warn',
      'prefer-const': 'warn',
      // React accessibility rules
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/no-static-element-interactions': 'warn',
      'jsx-a11y/no-noninteractive-element-interactions': 'warn',
      'jsx-a11y/label-has-associated-control': 'warn',
      'jsx-a11y/media-has-caption': 'warn',
      'jsx-a11y/alt-text': 'warn',
      'react/prop-types': 'off',
      'import/no-unresolved': 'off',
      'jsx-a11y/anchor-is-valid': 'off'
    }
  }
];
