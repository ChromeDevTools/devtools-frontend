const { eslintConfig } = require('./package.json')

eslintConfig.parser = '@typescript-eslint/parser'
eslintConfig.extends.push(
  'plugin:@typescript-eslint/eslint-recommended',
  'plugin:@typescript-eslint/recommended'
)

eslintConfig.rules = {
  'node/no-unsupported-features/es-syntax': 'off',
  'comma-dangle': ['error', 'only-multiline'],
  semi: ['error', 'always'],
  'space-before-function-paren': ['error', 'never']
}

module.exports = eslintConfig
