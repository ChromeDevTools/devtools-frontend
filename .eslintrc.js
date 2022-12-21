// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// clang-format off

const path = require('path');
const rulesDirPlugin = require('eslint-plugin-rulesdir');
rulesDirPlugin.RULES_DIR = path.join(__dirname, 'scripts', 'eslint_rules', 'lib');

module.exports = {
  'root': true,

  'env': {'browser': true, 'es6': true},

  'parser': '@typescript-eslint/parser',

  'plugins': [
    '@typescript-eslint',
    'mocha',
    'rulesdir',
    'import',
    'jsdoc',
  ],

  'parserOptions': {'ecmaVersion': 9, 'sourceType': 'module'},

  /**
   * ESLint rules
   *
   * All available rules: http://eslint.org/docs/rules/
   *
   * Rules take the following form:
   *   'rule-name', [severity, { opts }]
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
    'no-global-assign': 2,
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
    'no-return-assign': [2, 'always'],
    'no-implicit-coercion': 2,

    // es2015 features
    'require-yield': 2,
    'template-curly-spacing': [2, 'never'],

    // file whitespace
    'no-multiple-empty-lines': [2, {'max': 1}],
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
    'no-unused-private-class-members': 2,

    // forbids interfaces starting with an I prefix.
    '@typescript-eslint/naming-convention':
        [2, {'selector': 'interface', 'format': ['PascalCase'], 'custom': {'regex': '^I[A-Z]', 'match': false}}],
    '@typescript-eslint/explicit-member-accessibility': [0],
    '@typescript-eslint/no-explicit-any': 2,

    // Closure does not properly typecheck default exports
    'import/no-default-export': 2,

    // Try to spot '// console.log()' left over from debugging
    'rulesdir/commented_out_console': 2,

    // Prevent imports being commented out rather than deleted.
    'rulesdir/commented_out_import': 2,

    // DevTools specific rules
    'rulesdir/es_modules_import': 2,
    'rulesdir/check_license_header': 2,
    /**
     * Ensures that JS Doc comments are properly aligned - all the starting
     * `*` are in the right place.
     */
    'jsdoc/check-alignment': 2,
  },
  'overrides': [{
    'files': ['*.ts'],
    'parserOptions': {
      'allowAutomaticSingleRunInference': true,
      'project': './config/typescript/tsconfig.eslint.json',
    },
    'rules': {
      '@typescript-eslint/explicit-member-accessibility': [2, {'accessibility': 'no-public'}],
      'comma-dangle': 'off',
      '@typescript-eslint/comma-dangle': [2, 'always-multiline'],

      // run just the TypeScript unused-vars rule, else we get duplicate errors
      'no-unused-vars': 0,
      '@typescript-eslint/no-unused-vars': [2, {'argsIgnorePattern': '^_'}],
      // run just the TypeScript semi rule, else we get duplicate errors
      'semi': 0,
      '@typescript-eslint/semi': ['error'],
      '@typescript-eslint/member-delimiter-style': [
        'error', {
          'multiline': {'delimiter': 'semi', 'requireLast': true},
          'singleline': {'delimiter': 'comma', 'requireLast': false},
          'overrides': {
            'interface': {
              'singleline': {'delimiter': 'semi', 'requireLast': false},
              'multiline': {'delimiter': 'semi', 'requireLast': true}
            },
            'typeLiteral': {
              'singleline': {'delimiter': 'comma', 'requireLast': false},
              'multiline': {'delimiter': 'comma', 'requireLast': true}
            }
          }
        }
      ],
      '@typescript-eslint/no-floating-promises': [2, {ignoreVoid: true}],
      // func-call-spacing doesn't work well with .ts
      'func-call-spacing': 0,
      '@typescript-eslint/func-call-spacing': 2,

      /**
       * Enforce that enum members are explicitly defined:
       * const enum Foo { A = 'a' } rather than const enum Foo { A }
       */
      '@typescript-eslint/prefer-enum-initializers': 2,
      /**
       * Ban non-null assertion operator, e.g.:
       * this.foo!.toLowerCase()
       */
      '@typescript-eslint/no-non-null-assertion': 2,
      '@typescript-eslint/consistent-type-imports': 2,
      'rulesdir/const_enum': 2,
      'rulesdir/no_underscored_properties': 2,
      'rulesdir/prefer_readonly_keyword': 2,
      'rulesdir/inline_type_imports': 2,
    }
  }]
};

// clang-format on
