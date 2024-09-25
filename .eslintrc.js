// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// clang-format off

const path = require('path');
const rulesDirPlugin = require('eslint-plugin-rulesdir');
rulesDirPlugin.RULES_DIR = path.join(__dirname, 'scripts', 'eslint_rules', 'lib');

module.exports = {
  root: true,

  env: {browser: true, es6: true},

  parser: '@typescript-eslint/parser',

  plugins: [
    '@typescript-eslint',
    'mocha',
    'rulesdir',
    'import',
    'jsdoc',
  ],

  parserOptions: {ecmaVersion: 9, sourceType: 'module'},

  /**
   * ESLint rules
   *
   * All available rules: http://eslint.org/docs/rules/
   */
  rules: {
    /**
     * Enforced rules
     */

    // syntax preferences
    quotes: ['error', 'single', {avoidEscape: true, allowTemplateLiterals: false}],
    semi: 'error',
    'no-extra-semi': 'error',
    'comma-style': ['error', 'last'],
    'wrap-iife': ['error', 'inside'],
    'spaced-comment': ['error', 'always', {markers: ['*']}],
    eqeqeq: 'error',
    'accessor-pairs': ['error', {getWithoutSet: false, setWithoutGet: false}],
    curly: 'error',
    'new-parens': 'error',
    'func-call-spacing': 'error',
    'arrow-parens': ['error', 'as-needed'],
    'eol-last': 'error',
    'object-shorthand': ['error', 'properties'],
    'no-useless-rename': 'error',

    // anti-patterns
    'no-caller': 'error',
    'no-case-declarations': 'error',
    'no-cond-assign': 'error',
    'no-console': ['error', {allow: ['assert', 'context', 'error', 'timeStamp', 'time', 'timeEnd', 'warn']}],
    'no-debugger': 'error',
    'no-dupe-keys': 'error',
    'no-duplicate-case': 'error',
    'no-else-return': ['error', {allowElseIf: false}],
    'no-empty-character-class': 'error',
    'no-global-assign': 'error',
    'no-implied-eval': 'error',
    'no-labels': 'error',
    'no-multi-str': 'error',
    'no-new-object': 'error',
    'no-octal-escape': 'error',
    'no-self-compare': 'error',
    'no-shadow-restricted-names': 'error',
    'no-unreachable': 'error',
    'no-unsafe-negation': 'error',
    'no-unused-vars': ['error', {args: 'none', vars: 'local'}],
    'no-var': 'error',
    'no-with': 'error',
    'prefer-const': 'error',
    radix: 'error',
    'valid-typeof': 'error',
    'no-return-assign': ['error', 'always'],
    'no-implicit-coercion': 'error',

    // es2015 features
    'require-yield': 'error',
    'template-curly-spacing': ['error', 'never'],

    // file whitespace
    'no-multiple-empty-lines': ['error', {max: 1}],
    'no-mixed-spaces-and-tabs': 'error',
    'no-trailing-spaces': 'error',
    'linebreak-style': ['error', 'unix'],

    /**
     * Disabled, aspirational rules
     */

    indent: ['off', 2, {SwitchCase: 1, CallExpression: {arguments: 2}, MemberExpression: 2}],

    // brace-style is disabled, as eslint cannot enforce 1tbs as default, but allman for functions
    'brace-style': ['off', 'allman', {allowSingleLine: true}],

    // key-spacing is disabled, as some objects use value-aligned spacing, some not.
    'key-spacing': ['off', {beforeColon: false, afterColon: true, align: 'value'}],

    'quote-props': ['error', 'as-needed'],

    // no-implicit-globals will prevent accidental globals
    'no-implicit-globals': 'off',
    'no-unused-private-class-members': 'error',

    // forbids interfaces starting with an I prefix.
    '@typescript-eslint/naming-convention':
        ['error', {selector: 'interface', format: ['PascalCase'], custom: {regex: '^I[A-Z]', match: false}}],
    '@typescript-eslint/explicit-member-accessibility': 'off',
    '@typescript-eslint/no-explicit-any': [
      'error',
      {
        ignoreRestArgs: true
      }
    ],

    // Closure does not properly typecheck default exports
    'import/no-default-export': 'error',

    /**
     * Catch duplicate import paths. For example this would catch the following example:
     * import {Foo} from './foo.js'
     * import * as FooModule from './foo.js'
     **/
    'import/no-duplicates': 'error',

    // Try to spot '// console.log()' left over from debugging
    'rulesdir/commented_out_console': 'error',

    // Prevent imports being commented out rather than deleted.
    'rulesdir/commented_out_import': 'error',

    // DevTools specific rules
    'rulesdir/es_modules_import': 'error',
    'rulesdir/check_license_header': 'error',
    /**
     * Ensures that JS Doc comments are properly aligned - all the starting
     * `*` are in the right place.
     */
    'jsdoc/check-alignment': 'error',
  },
  overrides: [{
    files: ['*.ts'],
    parserOptions: {
      allowAutomaticSingleRunInference: true,
      project: path.join(__dirname, 'config', 'typescript', 'tsconfig.eslint.json'),
    },
    rules: {
      '@typescript-eslint/explicit-member-accessibility': ['error', {accessibility: 'no-public'}],
      'comma-dangle': 'off',
      '@typescript-eslint/comma-dangle': ['error', 'always-multiline'],

      // run just the TypeScript unused-vars rule, else we get duplicate errors
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', {argsIgnorePattern: '^_'}],
      // run just the TypeScript semi rule, else we get duplicate errors
      semi: 'off',
      '@typescript-eslint/semi': 'error',
      '@typescript-eslint/member-delimiter-style': [
        'error', {
          multiline: {delimiter: 'semi', requireLast: true},
          singleline: {delimiter: 'comma', requireLast: false},
          overrides: {
            interface: {
              singleline: {delimiter: 'semi', requireLast: false},
              multiline: {delimiter: 'semi', requireLast: true}
            },
            typeLiteral: {
              singleline: {delimiter: 'comma', requireLast: false},
              multiline: {delimiter: 'comma', requireLast: true}
            }
          }
        }
      ],
      '@typescript-eslint/no-floating-promises': ['error', {ignoreVoid: true}],
      // func-call-spacing doesn't work well with .ts
      'func-call-spacing': 'off',
      '@typescript-eslint/func-call-spacing': 'error',

      /**
       * Enforce that enum members are explicitly defined:
       * const enum Foo { A = 'a' } rather than const enum Foo { A }
       */
      '@typescript-eslint/prefer-enum-initializers': 'error',
      /**
       * Ban non-null assertion operator, e.g.:
       * this.foo!.toLowerCase()
       */
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      'rulesdir/no_underscored_properties': 'error',
      'rulesdir/prefer_readonly_keyword': 'error',
      'rulesdir/inline_type_imports': 'error',
      'rulesdir/enforce_default_import_name': ['error', {
        // Enforce that any import of models/trace/trace.js names the import Trace.
        modulePath: path.join(__dirname, 'front_end', 'models', 'trace', 'trace.js'),
        importName: 'Trace'
      }]
    }
  }, {
    files : ['*.ts'],
    rules : {
      '@typescript-eslint/naming-convention' :
      [
        'error', {
          selector : ['function', 'accessor', 'method', 'property', 'parameterProperty'],
          format : ['camelCase'],
        },
        {
          selector: 'variable',
          filter: {
            // Ignore localization variables.
            regex: '^(UIStrings|str_)$',
            match: false
          },
          format: ['camelCase'],
        },
        {
          // We are using camelCase, PascalCase and UPPER_CASE for top-level constants, allow the for now.
          selector: 'variable',
          modifiers: ['const'],
          filter: {
            // Ignore localization variables.
            regex: '^(UIStrings|str_)$',
            match: false
          },
          format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
        },
        {
          selector : 'classProperty',
          modifiers : ['static', 'readonly'],
          format : ['UPPER_CASE', 'camelCase'],
        },
        {
          selector : 'enumMember',
          format : ['UPPER_CASE'],
        },
        {
          selector : ['typeLike'],
          format : ['PascalCase'],
        },
        {
          selector : 'parameter',
          format : ['camelCase'],
          leadingUnderscore : 'allow',
        },
        {
          // Public methods are currently in transition and may still have leading underscores.
          selector: 'method',
          modifiers: ['public'],
          format: ['camelCase'],
          leadingUnderscore: 'allow',
        },
        {
          selector: 'property',
          modifiers: ['public'],
          format: ['camelCase'],
          leadingUnderscore: 'allow',
        },
        {
          // Object literals may be constructed as arguments to external libraries which follow different styles.
          selector: ['objectLiteralMethod', 'objectLiteralProperty'],
          modifiers: ['public'],
          format: null,
        },
        {
          // Ignore type properties that require quotes
          selector : 'typeProperty',
          format : null,
          modifiers : ['requiresQuotes']
        }
      ]
    }
  }, {
    files: ['*.test.ts', 'test/**/*.ts', '**/testing/*.ts'],
    rules: {
      // errors on it('test') with no body
      'mocha/no-pending-tests' : 'error',

      // errors on {describe, it}.only
      'mocha/no-exclusive-tests' : 'error',

      'mocha/no-async-describe': 'error',
      'mocha/no-global-tests': 'error',
      'mocha/no-nested-tests': 'error',

      'rulesdir/check_test_definitions' : 'error',
      'rulesdir/avoid_assert_equal' : 'error',
      'rulesdir/no_repeated_tests' : 'error',
      'rulesdir/compare_arrays_with_assert_deepequal' : 'error',
      'rulesdir/ban_screenshot_test_outside_perf_panel' : 'error',
      'rulesdir/trace_engine_test_timeouts' : 'error',
      '@typescript-eslint/no-non-null-assertion' : 'off',
    },
    settings: {
      'mocha/additionalCustomNames': [
        { name: 'describeWithDevtoolsExtension', type: 'suite', interfaces: [ 'BDD', 'TDD' ] },
        { name: 'describeWithEnvironment', type: 'suite', interfaces: [ 'BDD', 'TDD' ] },
        { name: 'describeWithLocale', type: 'suite', interfaces: [ 'BDD', 'TDD' ] },
        { name: 'describeWithMockConnection', type: 'suite', interfaces: [ 'BDD', 'TDD' ] },
        { name: 'describeWithRealConnection', type: 'suite', interfaces: [ 'BDD', 'TDD' ] },
        { name: 'itScreenshot', type: 'testCase', interfaces: [ 'BDD', 'TDD' ] },
      ]
    }
  }],
};

// clang-format on
