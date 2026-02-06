const security = require('eslint-plugin-security');

module.exports = [
  {
    plugins: { security },
    rules: {
      ...security.configs.recommended.rules,
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  { ignores: ['node_modules/', 'public/'] },
];
