// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import stylisticPlugin from '@stylistic/eslint-plugin';
import eslintPlugin from 'eslint-plugin-eslint-plugin';
import importPlugin from 'eslint-plugin-import';
import jsdocPlugin from 'eslint-plugin-jsdoc';
import mochaPlugin from 'eslint-plugin-mocha';
import {defineConfig, globalIgnores} from 'eslint/config';
import globals from 'globals';
import {join} from 'path';
import typescriptEslint from 'typescript-eslint';

import rulesdirPlugin from './scripts/eslint_rules/rules-dir.mjs';

export default defineConfig([
  globalIgnores([
    // Git submodules that are not in third_party
    'build/',
    'buildtools/',

    // Don't include the common build directory
    'out/',
    // Don't include third party code
    'third_party/',

    'front_end/diff/diff_match_patch.js',
    'front_end/models/javascript_metadata/NativeFunctions.js',
    // All of these scripts are auto-generated so don't lint them.
    'front_end/generated/ARIAProperties.js',
    'front_end/generated/Deprecation.ts',
    'front_end/generated/InspectorBackendCommands.js',
    'front_end/generated/protocol-mapping.d.ts',
    'front_end/generated/protocol-proxy-api.d.ts',
    'front_end/generated/protocol.ts',
    // Any third_party addition has its source code checked out into
    // third_party/X/package, so we ignore that code as it's not code we author or
    // own.
    'front_end/third_party/*/package/',
    // Any JS files are also not authored by devtools-frontend, so we ignore those.
    'front_end/third_party/**/*',
    // Lighthouse doesn't have a package/ folder but has other nested folders, so
    // we ignore any folders within the lighthouse directory.
    'front_end/third_party/lighthouse/*/',
    // The CodeMirror bundle file is auto-generated and rolled-up as part of the',
    // install script, so we don't need to lint it.
    'front_end/third_party/codemirror.next/bundle.ts',
    // Lit lib files are auto-generated and rolled up as part of the install script.
    'front_end/third_party/lit/src/*.ts',
    // @puppeteer/replay is auto-generated.
    'front_end/third_party/puppeteer-replay/**/*.ts',
    // Third party code we did not author for extensions
    'extensions/cxx_debugging/third_party/**/*',

    '**/node_modules',
    'scripts/build/typescript/tests',
    'scripts/migration/**/*.js',
    'scripts/protocol_typescript/*.js',
    'scripts/deps/tests/fixtures',
    'test/**/fixtures/',
    'test/e2e/**/*.js',
    'test/shared/**/*.js',
  ]),
  {
    name: 'JavaScript files',
    plugins: {
      '@typescript-eslint': typescriptEslint.plugin,
      '@stylistic': stylisticPlugin,
      '@eslint-plugin': eslintPlugin,
      mocha: mochaPlugin,
      rulesdir: rulesdirPlugin,
      import: importPlugin,
      jsdoc: jsdocPlugin,
    },

    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
      },
    },

    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },

    rules: {
      // syntax preferences
      '@stylistic/quotes': [
        'error',
        'single',
        {
          avoidEscape: true,
          allowTemplateLiterals: 'always',
        },
      ],

      '@stylistic/semi': 'error',
      '@stylistic/no-extra-semi': 'error',
      '@stylistic/comma-style': ['error', 'last'],
      '@stylistic/wrap-iife': ['error', 'inside'],

      '@stylistic/spaced-comment': [
        'error',
        'always',
        {
          markers: ['*'],
        },
      ],

      eqeqeq: 'error',

      'accessor-pairs': [
        'error',
        {
          getWithoutSet: false,
          setWithoutGet: false,
        },
      ],

      curly: 'error',
      '@stylistic/new-parens': 'error',
      '@stylistic/function-call-spacing': 'error',
      '@stylistic/arrow-parens': ['error', 'as-needed'],
      '@stylistic/eol-last': 'error',
      'object-shorthand': ['error', 'properties'],
      'no-useless-rename': 'error',

      // anti-patterns
      'no-caller': 'error',
      'no-case-declarations': 'error',
      'no-cond-assign': 'error',

      'no-console': [
        'error',
        {
          allow: [
            'assert',
            'context',
            'error',
            'timeStamp',
            'time',
            'timeEnd',
            'warn',
          ],
        },
      ],

      'no-debugger': 'error',
      'no-dupe-keys': 'error',
      'no-duplicate-case': 'error',

      'no-else-return': [
        'error',
        {
          allowElseIf: false,
        },
      ],

      'no-empty': [
        'error',
        {
          allowEmptyCatch: true,
        },
      ],
      'no-lonely-if': 'error',

      'no-empty-character-class': 'error',
      'no-global-assign': 'error',
      'no-implied-eval': 'error',
      'no-labels': 'error',
      'no-multi-str': 'error',
      'no-object-constructor': 'error',
      'no-octal-escape': 'error',
      'no-self-compare': 'error',
      'no-shadow-restricted-names': 'error',
      'no-unreachable': 'error',
      'no-unsafe-negation': 'error',

      'no-unused-vars': [
        'error',
        {
          args: 'none',
          vars: 'local',
        },
      ],

      'no-var': 'error',
      'no-with': 'error',
      'prefer-const': 'error',
      radix: 'error',
      'valid-typeof': 'error',
      'no-return-assign': ['error', 'always'],
      'no-implicit-coercion': ['error', {allow: ['!!']}],

      'no-array-constructor': 'error',

      // es2015 features
      'require-yield': 'error',
      '@stylistic/template-curly-spacing': ['error', 'never'],

      // file whitespace
      '@stylistic/no-multiple-empty-lines': [
        'error',
        {
          max: 1,
        },
      ],
      '@stylistic/no-mixed-spaces-and-tabs': 'error',
      '@stylistic/no-trailing-spaces': 'error',
      '@stylistic/linebreak-style': ['error', 'unix'],

      /**
       * Disabled, aspirational rules
       */
      '@stylistic/indent': [
        'off',
        2,
        {
          SwitchCase: 1,
          CallExpression: {
            arguments: 2,
          },
          MemberExpression: 2,
        },
      ],

      // brace-style is disabled, as eslint cannot enforce 1tbs as default, but allman for functions
      '@stylistic/brace-style': [
        'off',
        'allman',
        {
          allowSingleLine: true,
        },
      ],

      // key-spacing is disabled, as some objects use value-aligned spacing, some not.
      '@stylistic/key-spacing': [
        'off',
        {
          beforeColon: false,
          afterColon: true,
          align: 'value',
        },
      ],

      '@stylistic/quote-props': ['error', 'as-needed'],

      // no-implicit-globals will prevent accidental globals
      'no-implicit-globals': 'off',
      'no-unused-private-class-members': 'error',
      'no-useless-constructor': 'error',

      // Sort imports first
      'import/first': 'error',
      // Closure does not properly typecheck default exports
      'import/no-default-export': 'error',
      /**
       * Catch duplicate import paths. For example this would catch the following example:
       * import {Foo} from './foo.js'
       * import * as FooModule from './foo.js'
       **/
      'import/no-duplicates': 'error',
      /**
       * Provides more consistency in the imports.
       */
      'import/order': [
        'error',
        {
          // We need to group the builtin and external as clang-format
          // can't differentiate the two
          groups: [['builtin', 'external'], 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
          // clang-format has it's own logic overriding this
          named: false,
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
      // Try to spot '// console.log()' left over from debugging
      'rulesdir/no-commented-out-console': 'error',
      // Prevent imports being commented out rather than deleted.
      'rulesdir/no-commented-out-import': 'error',
      'rulesdir/check-license-header': 'error',
      /**
       * Enforce some consistency and usefulness of JSDoc comments, to make sure
       * we actually benefit from them.
       */
      'jsdoc/check-alignment': 'error',
      'jsdoc/check-tag-names': [
        'error',
        {
          definedTags: [
            'attribute',  // @attribute is used by lit-analyzer (through web-component-analyzer)
            'meaning',    // @meaning is used by localization
          ],
        },
      ],
      'jsdoc/empty-tags': 'error',
      'jsdoc/multiline-blocks': 'error',
      'jsdoc/no-bad-blocks': 'error',
      'jsdoc/no-blank-blocks': [
        'error',
        {
          enableFixer: true,
        },
      ],
      'jsdoc/require-asterisk-prefix': 'error',
      'jsdoc/require-param-name': 'error',
      'jsdoc/require-hyphen-before-param-description': ['error', 'never'],
      'jsdoc/sort-tags': 'error',
    },
  },
  {
    name: 'TypeScript files',
    files: ['**/*.ts'],

    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',

      parser: typescriptEslint.parser,
      parserOptions: {
        allowAutomaticSingleRunInference: true,
        project: join(
            import.meta.dirname,
            'config',
            'typescript',
            'tsconfig.eslint.json',
            ),
      },
    },

    rules: {
      '@typescript-eslint/array-type': [
        'error',
        {
          default: 'array-simple',
        },
      ],
      '@typescript-eslint/no-explicit-any': [
        'error',
        {
          ignoreRestArgs: true,
        },
      ],

      '@typescript-eslint/explicit-member-accessibility': [
        'error',
        {
          accessibility: 'no-public',
        },
      ],

      // run just the TypeScript unused-vars rule, else we get duplicate errors
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
        },
      ],

      '@stylistic/member-delimiter-style': [
        'error',
        {
          multiline: {
            delimiter: 'semi',
            requireLast: true,
          },

          singleline: {
            delimiter: 'comma',
            requireLast: false,
          },

          overrides: {
            interface: {
              singleline: {
                delimiter: 'semi',
                requireLast: false,
              },

              multiline: {
                delimiter: 'semi',
                requireLast: true,
              },
            },

            typeLiteral: {
              singleline: {
                delimiter: 'comma',
                requireLast: false,
              },

              multiline: {
                delimiter: 'comma',
                requireLast: true,
              },
            },
          },
        },
      ],

      '@typescript-eslint/no-floating-promises': [
        'error',
        {
          ignoreVoid: true,
        },
      ],

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

      '@typescript-eslint/naming-convention': [
        'error',
        // Forbids interfaces starting with an I prefix.
        {
          selector: 'interface',
          format: ['PascalCase'],

          custom: {
            regex: '^I[A-Z]',
            match: false,
          },
        },
        {
          selector: [
            'function',
            'accessor',
            'method',
            'property',
            'parameterProperty',
          ],
          format: ['camelCase'],
        },
        {
          selector: 'variable',

          filter: {
            // Ignore localization variables.
            regex: '^(UIStrings|str_)$',
            match: false,
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
            match: false,
          },

          format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
        },
        {
          selector: 'classProperty',
          modifiers: ['static', 'readonly'],
          format: ['UPPER_CASE', 'camelCase'],
        },
        {
          selector: 'enumMember',
          format: ['UPPER_CASE'],
        },
        {
          selector: ['typeLike'],
          format: ['PascalCase'],
        },
        {
          selector: 'parameter',
          format: ['camelCase'],
          leadingUnderscore: 'allow',
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
          selector: 'typeProperty',
          format: null,
          modifiers: ['requiresQuotes'],
        },
      ],

      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],

      // Disable eslint base rule
      'no-throw-literal': 'off',
      '@typescript-eslint/only-throw-error': 'error',

      // Disabled this rule while investigating why it creates
      // certain TypeScript compilation errors after fixes
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',

      '@typescript-eslint/no-inferrable-types': 'error',

      '@typescript-eslint/consistent-generic-constructors': [
        'error',
        'constructor',
      ],

      // This is more performant
      // And should provide better stack trace when debugging
      // see https://v8.dev/blog/fast-async.
      '@typescript-eslint/return-await': ['error', 'always'],

      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          // Change after we add some placeholder for old errors
          minimumDescriptionLength: 0,
          'ts-check': false,
          'ts-expect-error': 'allow-with-description',
          'ts-ignore': true,
          'ts-nocheck': true,
        },
      ],

      '@typescript-eslint/prefer-optional-chain': 'error',

      '@typescript-eslint/no-unsafe-function-type': 'error',

      '@typescript-eslint/no-empty-object-type': [
        'error',
        {
          allowInterfaces: 'with-single-extends',
        },
      ],

      'no-array-constructor': 'off',
      '@typescript-eslint/no-array-constructor': 'error',

      '@typescript-eslint/consistent-indexed-object-style': 'error',

      'no-useless-constructor': 'off',
      '@typescript-eslint/no-useless-constructor': 'error',

      'rulesdir/no-underscored-properties': 'error',
      'rulesdir/inline-type-imports': 'error',

      'rulesdir/enforce-default-import-name': [
        'error',
        {
          // Enforce that any import of models/trace/trace.js names the import Trace.
          modulePath: join(
              import.meta.dirname,
              'front_end',
              'models',
              'trace',
              'trace.js',
              ),
          importName: 'Trace',
        },
      ],

      'rulesdir/validate-timing-types': 'error',

      // Disallow redundant (and potentially conflicting) type information
      // within JSDoc comments.
      'jsdoc/no-types': 'error',
      'jsdoc/require-returns-description': 'error',
    },
  },
  {
    name: 'Scripts files',
    files: ['scripts/**/*'],
    rules: {
      'no-console': 'off',
      'rulesdir/es-modules-import': 'off',
      'import/no-default-export': 'off',
    },
  },
  {
    name: 'Front-end files',
    files: ['front_end/**/*'],
    rules: {
      // L10n rules are only relevant in 'front_end'.
      'rulesdir/l10n-filename-matches': [
        'error',
        {
          rootFrontendDirectory: join(import.meta.dirname, 'front_end'),
        },
      ],
      'rulesdir/l10n-i18nString-call-only-with-uistrings': 'error',
      'rulesdir/l10n-no-i18nString-calls-module-instantiation': 'error',
      'rulesdir/l10n-no-locked-or-placeholder-only-phrase': 'error',
      'rulesdir/l10n-no-uistrings-export': 'error',
      'rulesdir/l10n-no-unused-message': 'error',
    },
  },
  {
    name: 'Front-end TypeScript files',
    files: ['front_end/**/*.ts'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowExpressions: true,
          allowConciseArrowFunctionExpressionsStartingWithVoid: true,
          allowIIFEs: true,
        },
      ],
      'rulesdir/no-imperative-dom-api': 'error',
      'rulesdir/no-lit-render-outside-of-view': 'error',
      'rulesdir/no-importing-images-from-src': 'error',
      'rulesdir/enforce-custom-event-names': 'error',
      'rulesdir/set-data-type-reference': 'error',
      'rulesdir/no-bound-component-methods': 'error',
      'rulesdir/no-adopted-style-sheets': 'error',
      'rulesdir/no-customized-builtin-elements': 'error',
      'rulesdir/no-deprecated-component-usages': 'error',
      'rulesdir/no-self-closing-custom-element-tagnames': 'error',
      'rulesdir/no-a-tags-in-lit': 'error',
      'rulesdir/check-css-import': 'error',
      'rulesdir/enforce-optional-properties-last': 'error',
      'rulesdir/check-enumerated-histograms': 'error',
      'rulesdir/check-was-shown-methods': 'error',
      'rulesdir/static-custom-event-names': 'error',
      'rulesdir/lit-no-attribute-quotes': 'error',
      'rulesdir/lit-template-result-or-nothing': 'error',
      'rulesdir/inject-checkbox-styles': 'error',
      'rulesdir/jslog-context-list': 'error',
      'rulesdir/es-modules-import': 'error',
      'rulesdir/html-tagged-template': 'error',
      'rulesdir/enforce-custom-element-definitions-location': [
        'error',
        {
          rootFrontendDirectory: join(import.meta.dirname, 'front_end'),
        },
      ],
      'rulesdir/enforce-ui-strings-as-const': 'error',
      'rulesdir/no-new-lit-element-components': 'error',
    },
  },
  {
    name: 'Front-end meta files',
    files: ['front_end/**/*-meta.ts'],
    rules: {
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'parameter',
          format: ['camelCase', 'PascalCase'],
          leadingUnderscore: 'allow',
        },
      ],
    },
  },
  {
    name: 'TypeScript test files',
    files: [
      '*.test.ts',
      // This makes the specificity greater than the front-end ts files
      'front_end/**/*.test.ts',
      'test/**/*.ts',
      '**/testing/*.ts',
      'scripts/eslint_rules/test/**/*',
      'extensions/cxx_debugging/e2e/**',
    ],

    rules: {
      // errors on {describe, it}.only
      'mocha/no-exclusive-tests': 'error',

      'mocha/no-async-suite': 'error',
      'mocha/no-global-tests': 'error',
      'mocha/no-nested-tests': 'error',

      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',

      '@typescript-eslint/only-throw-error': [
        'error',
        {
          allow: [
            {
              // Chai AssertionError does not extend Error
              from: 'package',
              package: 'chai',
              name: ['AssertionError'],
            },
          ],
        },
      ],

      'rulesdir/check-test-definitions': 'error',
      'rulesdir/no-assert-strict-equal-for-arrays-and-objects': 'error',
      'rulesdir/no-assert-deep-strict-equal': 'error',
      'rulesdir/no-assert-equal': 'error',
      'rulesdir/no-assert-equal-boolean-null-undefined': 'error',
      'rulesdir/no-imperative-dom-api': 'off',
      'rulesdir/no-lit-render-outside-of-view': 'off',
      'rulesdir/prefer-assert-instance-of': 'error',
      'rulesdir/prefer-assert-is-ok': 'error',
      'rulesdir/prefer-assert-length-of': 'error',
      'rulesdir/prefer-assert-strict-equal': 'error',
      'rulesdir/prefer-sinon-assert': 'error',
      'rulesdir/prefer-url-string': 'error',
      'rulesdir/trace-engine-test-timeouts': 'error',
      'rulesdir/no-document-body-mutation': 'error',
      'rulesdir/enforce-custom-element-definitions-location': 'off',
    },

    settings: {
      'mocha/additionalCustomNames': [
        {
          name: 'describeWithDevtoolsExtension',
          type: 'suite',
          interface: 'BDD',
        },
        {
          name: 'describeWithEnvironment',
          type: 'suite',
          interface: 'BDD',
        },
        {
          name: 'describeWithLocale',
          type: 'suite',
          interface: 'BDD',
        },
        {
          name: 'describeWithMockConnection',
          type: 'suite',
          interface: 'BDD',
        },
      ],
    },
  },
  {
    name: 'Use private class members rule',
    files: [
      'front_end/panels/**/components/*.ts',
      'front_end/ui/components/**/*.ts',
      'front_end/entrypoints/**/*.ts',
    ],

    rules: {
      'rulesdir/prefer-private-class-members': 'error',
    },
  },
  {
    name: 'Ignore private class members rule',
    files: [
      'front_end/panels/recorder/**/*.ts',
      'front_end/ui/components/suggestion_input/*.ts',
    ],
    rules: {
      // TODO(crbug/1402569): Reenable once https://github.com/microsoft/TypeScript/issues/48885 is closed.
      'rulesdir/prefer-private-class-members': 'off',
    },
  },
  {
    name: 'Supported CSS properties rules',
    files: ['front_end/generated/SupportedCSSProperties.js'],
    rules: {
      'rulesdir/jslog-context-list': 'error',
    },
  },
  {
    name: 'EsLint rules test',
    files: ['scripts/eslint_rules/tests/**/*'],
    rules: {
      '@eslint-plugin/no-only-tests': 'error',
    },
  },
  {
    name: 'Legacy test runner',
    files: ['front_end/legacy_test_runner/**/*'],
    rules: {
      'rulesdir/es-modules-import': 'off',
    },
  },
  {
    name: 'Front-end component docs',
    files: ['front_end/ui/components/docs/**/*.ts'],
    rules: {
      // This makes the component doc examples very verbose and doesn't add
      // anything, so we leave return types to the developer within the
      // component_docs folder.
      '@typescript-eslint/explicit-function-return-type': 'off',
      // We use Lit to help render examples sometimes and we don't use
      // {host: this} as often the `this` is the window.
      'rulesdir/lit-host-this': 'off',
      'rulesdir/no-imperative-dom-api': 'off',
      'rulesdir/no-lit-render-outside-of-view': 'off',
    },
  },
  {
    name: 'Keep models/trace isolated',
    files: ['front_end/models/trace/**/*.ts'],
    ignores: ['front_end/models/trace/**/*.test.ts'],
    rules: {
      'rulesdir/no-imports-in-directory': [
        'error',
        {
          bannedImportPaths: [
            {
              bannedPath: join(
                  import.meta.dirname,
                  'front_end',
                  'core',
                  'sdk',
                  'sdk.js',
                  ),
              allowTypeImports: true,
            },
            {
              bannedPath: join(
                  import.meta.dirname,
                  'front_end',
                  'ui',
                  'legacy',
                  'legacy.js',
                  ),
              allowTypeImports: false,
            },
          ],
        },
      ],
    },
  },
  {
    name: 'Recorder injected code',
    files: ['front_end/panels/recorder/injected/**/*.ts'],
    rules: {
      // The code is rolled up and tree-shaken independently from the regular entrypoints.
      'rulesdir/es-modules-import': 'off',
    },
  },
  {
    name: 'Performance panel file',
    files: ['front_end/ui/legacy/components/perf_ui/**/*.ts'],
    rules: {
      // Enable tracking of canvas save() and
      // restore() calls to try and catch bugs. Only
      // enabled in this folder because it is an
      // expensive rule to run and we do not need it
      // for any code that doesn't use Canvas.
      'rulesdir/canvas-context-tracking': 'error',
    },
  },
  {
    name: 'TypeScript type-definitions',
    files: ['**/*.d.ts'],
    rules: {
      // Not a useful rule for .d.ts files where we are
      // representing an existing module.
      'import/no-default-export': 'off',
    },
  },
  {
    name: 'Config files',
    files: ['eslint.config.mjs', '**/*/rollup.config.mjs'],
    rules: {
      // The config operate on the default export
      // So allow it for them
      'import/no-default-export': 'off',
    },
  },
]);
