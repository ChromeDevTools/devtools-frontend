const path = require('path');
const rulesDirPlugin = require('eslint-plugin-rulesdir')
rulesDirPlugin.RULES_DIR = path.join(__dirname, 'scripts', 'eslint_rules', 'lib');

module.exports = {
  'root': true,

  'env': {'browser': true, 'es6': true},

  'parser': '@typescript-eslint/parser',

  'plugins': [
    '@typescript-eslint',
    'mocha',
    'rulesdir',
  ],

  'parserOptions': {'ecmaVersion': 9, 'sourceType': 'module'},

  /**
     * ESLint rules
     *
     * All available rules: http://eslint.org/docs/rules/
     *
     * Rules take the following form:
     *   "rule-name", [severity, { opts }]
     * Severity: 2 == error, 1 == warning, 0 == off.
     */
  'rules': {
    /**
         * Enforced rules
         */


    // syntax preferences
    'quotes': [2, 'single', {'avoidEscape': true, 'allowTemplateLiterals': false}],
    'semi': 2,
    'no-extra-semi': 2,
    'comma-style': [2, 'last'],
    'wrap-iife': [2, 'inside'],
    'spaced-comment': [2, 'always', {'markers': ['*']}],
    'eqeqeq': [2],
    'accessor-pairs': [2, {'getWithoutSet': false, 'setWithoutGet': false}],
    'curly': 2,
    'new-parens': 2,
    'func-call-spacing': 2,
    'arrow-parens': [2, 'as-needed'],
    'eol-last': 2,

    // anti-patterns
    'no-caller': 2,
    'no-case-declarations': 2,
    'no-cond-assign': 2,
    'no-console': [2, {'allow': ['assert', 'context', 'error', 'timeStamp', 'time', 'timeEnd', 'warn']}],
    'no-debugger': 2,
    'no-dupe-keys': 2,
    'no-duplicate-case': 2,
    'no-else-return': [2, {'allowElseIf': false}],
    'no-empty-character-class': 2,
    'no-implied-eval': 2,
    'no-labels': 2,
    'no-multi-str': 2,
    'no-new-object': 2,
    'no-octal-escape': 2,
    'no-self-compare': 2,
    'no-shadow-restricted-names': 2,
    'no-unreachable': 2,
    'no-unsafe-negation': 2,
    'no-unused-vars': [2, {'args': 'none', 'vars': 'local'}],
    'no-var': 2,
    'no-with': 2,
    'prefer-const': 2,
    'radix': 2,
    'valid-typeof': 2,

    // es2015 features
    'require-yield': 2,
    'template-curly-spacing': [2, 'never'],

    // spacing details
    'space-infix-ops': 2,
    'space-in-parens': [2, 'never'],
    'space-before-function-paren': [2, {'anonymous': 'never', 'named': 'never', 'asyncArrow': 'always'}],
    'no-whitespace-before-property': 2,
    'keyword-spacing': [
      2, {
        'overrides': {
          'if': {'after': true},
          'else': {'after': true},
          'for': {'after': true},
          'while': {'after': true},
          'do': {'after': true},
          'switch': {'after': true},
          'return': {'after': true}
        }
      }
    ],
    'arrow-spacing': [2, {'after': true, 'before': true}],

    // file whitespace
    'no-multiple-empty-lines': [2, {'max': 2}],
    'no-mixed-spaces-and-tabs': 2,
    'no-trailing-spaces': 2,
    'linebreak-style': [2, 'unix'],

    /**
         * Disabled, aspirational rules
         */

    'indent': [0, 2, {'SwitchCase': 1, 'CallExpression': {'arguments': 2}, 'MemberExpression': 2}],

    // brace-style is disabled, as eslint cannot enforce 1tbs as default, but allman for functions
    'brace-style': [0, 'allman', {'allowSingleLine': true}],

    // key-spacing is disabled, as some objects use value-aligned spacing, some not.
    'key-spacing': [0, {'beforeColon': false, 'afterColon': true, 'align': 'value'}],
    // quote-props is diabled, as property quoting styles are too varied to enforce.
    'quote-props': [0, 'as-needed'],

    // no-implicit-globals will prevent accidental globals
    'no-implicit-globals': [0],

    '@typescript-eslint/interface-name-prefix': [2, {'prefixWithI': 'never'}],
    '@typescript-eslint/explicit-member-accessibility': [0],

    // errors on it('test') with no body
    'mocha/no-pending-tests': 2,
    // errors on {describe, it}.only
    'mocha/no-exclusive-tests': 2,

    // DevTools specific rules
    'rulesdir/es_modules_import': 2,
    'rulesdir/check_license_header': 2,
  },
  'overrides': [{
    'files': ['*.ts'],
    'rules': {
      '@typescript-eslint/explicit-member-accessibility': [2, {'accessibility': 'explicit'}],
      'comma-dangle': [2, 'always-multiline'],
      // run just the TypeScript unused-vars rule, else we get duplicate errors
      'no-unused-vars': 0,
      '@typescript-eslint/no-unused-vars': [2],
    }
  }]
};
