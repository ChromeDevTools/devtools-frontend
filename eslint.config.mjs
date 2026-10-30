// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import stylisticPlugin from '@stylistic/eslint-plugin';
import {defineConfig, globalIgnores} from 'eslint/config';
import eslintPlugin from 'eslint-plugin-eslint-plugin';
import importPlugin from 'eslint-plugin-import';
import jsdocPlugin from 'eslint-plugin-jsdoc';
import litPlugin from 'eslint-plugin-lit';
import mochaPlugin from 'eslint-plugin-mocha';
import globals from 'globals';
import {join} from 'node:path';
import typescriptEslint from 'typescript-eslint';

import devToolsPlugin from './scripts/eslint_rules/plugin.mjs';

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
    'front_end/models/javascript_metadata/NativeFunctions.ts',
    // All of these scripts are auto-generated so don't lint them.
    'front_end/generated/Deprecation.ts',
    'front_end/generated/InspectorBackendCommands.ts',
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
    'scripts/gn_deps_verifier/tests/fixtures',
    'test/**/fixtures/',
    'test/ai_evals/eval_data/',
    'test/e2e/**/*.js',
    'test/shared/**/*.js',
    'extensions/cxx_debugging/tests/inputs/',
  ]),
  {
    name: 'JavaScript files',
    plugins: {
      '@typescript-eslint': typescriptEslint.plugin,
      '@stylistic': stylisticPlugin,
      '@eslint-plugin': eslintPlugin,
      mocha: mochaPlugin,
      '@devtools': devToolsPlugin,
      import: importPlugin,
      jsdoc: jsdocPlugin,
      lit: litPlugin,
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
      reportUnusedInlineConfigs: 'error',
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
      '@stylistic/comma-dangle': ['error', 'always-multiline'],
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
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ExportDefaultDeclaration',
          message: 'Default exports are not allowed. Use named exports instead.',
        },
      ],
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
      'import/enforce-node-protocol-usage': ['error', 'always'],
      // Try to spot '// console.log()' left over from debugging
      '@devtools/no-commented-out-console': 'error',
      // Prevent imports being commented out rather than deleted.
      '@devtools/no-commented-out-import': 'error',
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
          ignoreUsingDeclarations: true,
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

      '@typescript-eslint/consistent-generic-constructors': 'off',

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

      // Broke in 8.58.0, waiting for a fix
      // https://github.com/typescript-eslint/typescript-eslint/issues/12204
      '@typescript-eslint/prefer-optional-chain': 'off',

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

      '@devtools/no-underscored-properties': 'error',
      '@devtools/inline-type-imports': 'error',

      '@devtools/enforce-default-import-name': [
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

      '@devtools/validate-timing-types': 'error',

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
      '@devtools/es-modules-import': 'off',
      'no-restricted-syntax': 'off',
    },
  },
  {
    name: 'Front-end files',
    files: ['front_end/**/*'],
    rules: {
      // L10n rules are only relevant in 'front_end'.
      '@devtools/l10n-filename-matches': [
        'error',
        {
          rootFrontendDirectory: join(import.meta.dirname, 'front_end'),
        },
      ],
      '@devtools/l10n-i18nString-call-only-with-uistrings': 'error',
      '@devtools/l10n-no-i18nString-calls-module-instantiation': 'error',
      '@devtools/l10n-no-uistrings-export': 'error',
      '@devtools/l10n-no-unused-message': 'error',
      '@devtools/l10n-uistrings-sentence-punctuation': 'error',
      '@devtools/l10n-uistrings-text-style': 'error',
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
      '@devtools/no-imperative-dom-api': 'error',
      '@devtools/no-lit-render-outside-of-view': 'error',
      '@devtools/no-empty-view-output': 'error',
      '@devtools/no-widget-constructor-classes': 'error',
      '@devtools/no-importing-images-from-src': 'error',
      '@devtools/enforce-custom-event-names': 'error',
      '@devtools/set-data-type-reference': 'error',
      '@devtools/no-bound-component-methods': 'error',
      '@devtools/no-adopted-style-sheets': 'error',
      '@devtools/no-customized-builtin-elements': 'error',
      '@devtools/no-deprecated-component-usages': 'error',
      '@devtools/no-self-closing-custom-element-tagnames': 'error',
      '@devtools/no-a-tags-in-lit': 'error',
      '@devtools/check-css-import': 'error',
      '@devtools/enforce-optional-properties-last': 'error',
      '@devtools/check-enumerated-histograms': 'error',
      '@devtools/require-super-calls-in-overridden-methods': [
        'error',
        {
          methodNames: ['wasShown', 'willHide'],
        },
      ],
      '@devtools/static-custom-event-names': 'error',
      '@devtools/lit-no-attribute-quotes': 'error',
      '@devtools/lit-no-non-latin1': 'error',
      '@devtools/no-boolean-input-checked-attr': 'error',
      '@devtools/lit-template-result-or-nothing': 'error',
      '@devtools/inject-checkbox-styles': 'error',
      '@devtools/jslog-context-list': 'error',
      '@devtools/es-modules-import': 'error',
      '@devtools/html-tagged-template': 'error',
      '@devtools/enforce-ui-kit-named-import': 'error',
      '@devtools/enforce-custom-element-definitions-location': [
        'error',
        {
          rootFrontendDirectory: join(import.meta.dirname, 'front_end'),
        },
      ],
      '@devtools/enforce-ui-strings-as-const': 'error',
      '@devtools/no-new-lit-element-components': 'error',
      '@devtools/enforce-custom-element-prefix': 'error',

      // Lit recommended
      'lit/attribute-value-entities': 'error',
      'lit/binding-positions': 'error',
      'lit/no-duplicate-template-bindings': 'error',
      'lit/no-invalid-html': 'error',
      // TODO: enable this once we figure ot the custom directive
      // 'lit/no-legacy-template-syntax': 'error',
      'lit/no-property-change-update': 'error',

      // Lit DevTools preferred
      'lit/prefer-nothing': 'error',
      'lit/value-after-constraints': 'error',
      'lit/quoted-expressions': ['error', 'never'],
    },
  },
  {
    name: 'Front-end core and models files',
    files: ['front_end/core/**/*.ts', 'front_end/models/**/*.ts'],
    rules: {
      '@devtools/no-instance-of-migrated-singletons': 'error',
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
    name: 'Front-end docs files',
    files: ['front_end/**/*.docs.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    name: 'TypeScript test files',
    files: [
      '*.test.ts',
      '*.test.api.ts',
      '*.docs.ts',
      // This makes the specificity greater than the front-end ts files
      'front_end/**/*.test.ts',
      'front_end/**/*.test.api.ts',
      'front_end/**/*.docs.ts',
      'test/**/*.ts',
      '**/testing/*.ts',
      'scripts/eslint_rules/tests/**/*',
      'scripts/gn_deps_verifier/tests/**/*',
      'extensions/cxx_debugging/e2e/**/*.ts',
      'extensions/cxx_debugging/tests/**/*.ts',
    ],

    rules: {
      // errors on {describe, it}.only
      'mocha/no-exclusive-tests': 'error',

      'mocha/no-async-describe': 'error',
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

      '@devtools/check-test-definitions': 'error',
      '@devtools/prefer-chai-assert': 'error',
      '@devtools/no-assert-strict-equal-for-arrays-and-objects': 'error',
      '@devtools/no-assert-deep-strict-equal': 'error',
      '@devtools/no-assert-equal': 'error',
      '@devtools/no-assert-equal-boolean-null-undefined': 'error',
      '@devtools/no-capture-screenshot': 'error',
      '@devtools/no-imperative-dom-api': 'off',
      '@devtools/no-lit-render-outside-of-view': 'off',
      '@devtools/prefer-assert-instance-of': 'error',
      '@devtools/prefer-assert-is-ok': 'error',
      '@devtools/prefer-assert-length-of': 'error',
      '@devtools/prefer-assert-strict-equal': 'error',
      '@devtools/prefer-sinon-assert': 'error',
      '@devtools/prefer-url-string': 'error',
      '@devtools/trace-engine-test-timeouts': 'error',
      '@devtools/no-document-body-mutation': 'error',
      '@devtools/no-manual-sinon-restore': 'error',
      // Don't update the KnownContext with test data.
      '@devtools/jslog-context-list': 'off',
      '@devtools/enforce-custom-element-definitions-location': 'off',
      '@devtools/enforce-custom-element-prefix': 'off',
    },

    settings: {
      'mocha/additionalCustomNames': [
        {
          name: 'describeWithEnvironment',
          type: 'suite',
          interfaces: ['BDD', 'TDD'],
        },
        {
          name: 'describeWithLocale',
          type: 'suite',
          interfaces: ['BDD', 'TDD'],
        },
        {
          name: 'describeWithMockConnection',
          type: 'suite',
          interfaces: ['BDD', 'TDD'],
        },
      ],
    },
  },
  {
    name: 'API test files',
    files: ['**/*.test.api.ts'],
    rules: {
      '@devtools/no-api-test-unit-helpers': 'error',
      '@devtools/no-document-body-mutation': 'off',
    },
  },
  {
    name: 'Use private class members rule',
    files: [
      'front_end/**/*.ts',
    ],
    ignores: [
      'front_end/**/*.test.ts',
      'front_end/**/*.test.api.ts',
      'front_end/**/*.docs.ts',
    ],

    rules: {
      '@devtools/prefer-private-class-members': 'error',
    },
  },
  {
    name: 'Ignore private class members rule',
    // The list below is an explicit burndown list of legacy files that have not
    // yet been migrated to ECMAScript private class members (#method() / #field).
    // This list is NOT supposed to be extended with new files or folders. Any new
    // code must use private class members instead of TypeScript 'private' keywords.
    // As files are migrated, remove them from this list.
    files: [
      'front_end/core/common/Revealer.ts',
      'front_end/core/common/Settings.ts',
      'front_end/core/common/SimpleHistoryManager.ts',
      'front_end/core/platform/MapUtilities.ts',
      'front_end/core/protocol_client/InspectorBackend.ts',
      'front_end/core/sdk/AnimationModel.ts',
      'front_end/core/sdk/CSSMatchedStyles.ts',
      'front_end/core/sdk/CSSModel.ts',
      'front_end/core/sdk/CSSPropertyParserMatchers.ts',
      'front_end/core/sdk/ChildTargetManager.ts',
      'front_end/core/sdk/Connections.ts',
      'front_end/core/sdk/CookieParser.ts',
      'front_end/core/sdk/DOMDebuggerModel.ts',
      'front_end/core/sdk/DOMModel.ts',
      'front_end/core/sdk/DOMStorageModel.ts',
      'front_end/core/sdk/DebuggerModel.ts',
      'front_end/core/sdk/EmulationModel.ts',
      'front_end/core/sdk/EnhancedTracesParser.ts',
      'front_end/core/sdk/FrameManager.ts',
      'front_end/core/sdk/NetworkManager.ts',
      'front_end/core/sdk/NetworkRequest.ts',
      'front_end/core/sdk/OverlayModel.ts',
      'front_end/core/sdk/OverlayPersistentHighlighter.ts',
      'front_end/core/sdk/PageLoad.ts',
      'front_end/core/sdk/PageResourceLoader.ts',
      'front_end/core/sdk/PreloadingModel.ts',
      'front_end/core/sdk/RehydratingConnection.ts',
      'front_end/core/sdk/ResourceTreeModel.ts',
      'front_end/core/sdk/ServiceWorkerCacheModel.ts',
      'front_end/core/sdk/ServiceWorkerManager.ts',
      'front_end/core/sdk/SourceMap.ts',
      'front_end/core/sdk/StorageBucketsModel.ts',
      'front_end/core/text_utils/TextUtils.ts',
      'front_end/models/bindings/CSSWorkspaceBinding.ts',
      'front_end/models/bindings/CompilerScriptMapping.ts',
      'front_end/models/bindings/DebuggerWorkspaceBinding.ts',
      'front_end/models/bindings/ResourceMapping.ts',
      'front_end/models/bindings/ResourceScriptMapping.ts',
      'front_end/models/bindings/SASSSourceMapping.ts',
      'front_end/models/bindings/StylesSourceMapping.ts',
      'front_end/models/breakpoints/BreakpointManager.ts',
      'front_end/models/computed_style/ComputedStyleModel.ts',
      'front_end/models/cpu_profile/CPUProfileDataModel.ts',
      'front_end/models/elements/ElementUpdateRecord.ts',
      'front_end/models/emulation/DeviceModeModel.ts',
      'front_end/models/emulation/EmulatedDevices.ts',
      'front_end/models/extensions/ExtensionEndpoint.ts',
      'front_end/models/extensions/LanguageExtensionEndpoint.ts',
      'front_end/models/extensions/RecorderExtensionEndpoint.ts',
      'front_end/models/formatter/FormatterWorkerPool.ts',
      'front_end/models/formatter/ScriptFormatter.ts',
      'front_end/models/har/Log.ts',
      'front_end/models/issues_manager/IssuesManager.ts',
      'front_end/models/issues_manager/SourceFrameIssuesManager.ts',
      'front_end/models/javascript_metadata/JavaScriptMetadata.ts',
      'front_end/models/logs/NetworkLog.ts',
      'front_end/models/logs/RequestResolver.ts',
      'front_end/models/persistence/Automapping.ts',
      'front_end/models/persistence/FileSystemWorkspaceBinding.ts',
      'front_end/models/persistence/IsolatedFileSystem.ts',
      'front_end/models/persistence/IsolatedFileSystemManager.ts',
      'front_end/models/persistence/NetworkPersistenceManager.ts',
      'front_end/models/persistence/PersistenceImpl.ts',
      'front_end/models/source_map_scopes/NamesResolver.ts',
      'front_end/models/trace/extras/TraceFilter.ts',
      'front_end/models/trace/extras/TraceTree.ts',
      'front_end/models/trace/handlers/FramesHandler.ts',
      'front_end/models/trace_source_maps_resolver/SourceMapsResolver.ts',
      'front_end/models/workspace/FileManager.ts',
      'front_end/models/workspace/IgnoreListManager.ts',
      'front_end/models/workspace_diff/WorkspaceDiff.ts',
      'front_end/panels/accessibility/ARIAMetadata.ts',
      'front_end/panels/accessibility/AccessibilityNodeView.ts',
      'front_end/panels/accessibility/AccessibilitySidebarView.ts',
      'front_end/panels/ai_assistance/AiAssistancePanel.ts',
      'front_end/panels/ai_assistance/components/AccessibilityAgentMarkdownRenderer.ts',
      'front_end/panels/ai_assistance/components/PerformanceAgentMarkdownRenderer.ts',
      'front_end/panels/animation/AnimationTimeline.ts',
      'front_end/panels/animation/AnimationUI.ts',
      'front_end/panels/application/AppManifestView.ts',
      'front_end/panels/application/ApplicationPanelSidebar.ts',
      'front_end/panels/application/ApplicationPanelTreeElement.ts',
      'front_end/panels/application/BackForwardCacheTreeElement.ts',
      'front_end/panels/application/BackgroundServiceModel.ts',
      'front_end/panels/application/BackgroundServiceView.ts',
      'front_end/panels/application/BounceTrackingMitigationsTreeElement.ts',
      'front_end/panels/application/CookieItemsView.ts',
      'front_end/panels/application/CrashReportContextView.ts',
      'front_end/panels/application/DOMStorageItemsView.ts',
      'front_end/panels/application/IndexedDBModel.ts',
      'front_end/panels/application/IndexedDBViews.ts',
      'front_end/panels/application/OpenedWindowDetailsView.ts',
      'front_end/panels/application/ReportingApiTreeElement.ts',
      'front_end/panels/application/ResourcesPanel.ts',
      'front_end/panels/application/ServiceWorkerCacheTreeElement.ts',
      'front_end/panels/application/ServiceWorkerCacheViews.ts',
      'front_end/panels/application/ServiceWorkerUpdateCycleView.ts',
      'front_end/panels/application/ServiceWorkersView.ts',
      'front_end/panels/application/StorageBucketsTreeElement.ts',
      'front_end/panels/application/StorageView.ts',
      'front_end/panels/application/TrustTokensTreeElement.ts',
      'front_end/panels/application/preloading/PreloadingView.ts',
      'front_end/panels/browser_debugger/CategorizedBreakpointsSidebarPane.ts',
      'front_end/panels/browser_debugger/DOMBreakpointsSidebarPane.ts',
      'front_end/panels/browser_debugger/XHRBreakpointsSidebarPane.ts',
      'front_end/panels/common/ExtensionPanel.ts',
      'front_end/panels/common/ExtensionServer.ts',
      'front_end/panels/common/ExtensionView.ts',
      'front_end/panels/console/ConsoleContextSelector.ts',
      'front_end/panels/console/ConsolePanel.ts',
      'front_end/panels/console/ConsolePrompt.ts',
      'front_end/panels/console/ConsoleView.ts',
      'front_end/panels/console/ConsoleViewMessage.ts',
      'front_end/panels/console/ConsoleViewport.ts',
      'front_end/panels/console_counters/WarningErrorCounter.ts',
      'front_end/panels/coverage/CoverageDecorationManager.ts',
      'front_end/panels/coverage/CoverageModel.ts',
      'front_end/panels/elements/AccessibilityTreeView.ts',
      'front_end/panels/elements/ClassesPaneWidget.ts',
      'front_end/panels/elements/ColorSwatchPopoverIcon.ts',
      'front_end/panels/elements/ComputedStyleWidget.ts',
      'front_end/panels/elements/DOMTreeElementWidget.ts',
      'front_end/panels/elements/ElementStatePaneWidget.ts',
      'front_end/panels/elements/ElementsPanel.ts',
      'front_end/panels/elements/EventListenersWidget.ts',
      'front_end/panels/elements/ImagePreviewPopover.ts',
      'front_end/panels/elements/InspectElementModeController.ts',
      'front_end/panels/elements/LayersWidget.ts',
      'front_end/panels/elements/MarkerDecorator.ts',
      'front_end/panels/elements/MetricsSidebarPane.ts',
      'front_end/panels/elements/PropertiesWidget.ts',
      'front_end/panels/elements/StyleEditorWidget.ts',
      'front_end/panels/elements/StylePropertiesSection.ts',
      'front_end/panels/elements/StylePropertyHighlighter.ts',
      'front_end/panels/elements/StylePropertyTreeElement.ts',
      'front_end/panels/elements/StylesSidebarPane.ts',
      'front_end/panels/emulation/AdvancedApp.ts',
      'front_end/panels/emulation/DeviceModeToolbar.ts',
      'front_end/panels/emulation/DeviceModeView.ts',
      'front_end/panels/emulation/MediaQueryInspector.ts',
      'front_end/panels/event_listeners/EventListenersView.ts',
      'front_end/panels/layer_viewer/LayerDetailsView.ts',
      'front_end/panels/layer_viewer/LayerTreeOutline.ts',
      'front_end/panels/layer_viewer/LayerViewHost.ts',
      'front_end/panels/layer_viewer/Layers3DView.ts',
      'front_end/panels/layer_viewer/PaintProfilerView.ts',
      'front_end/panels/layer_viewer/TransformController.ts',
      'front_end/panels/layers/LayerPaintProfilerView.ts',
      'front_end/panels/layers/LayerTreeModel.ts',
      'front_end/panels/layers/LayersPanel.ts',
      'front_end/panels/lighthouse/LighthouseController.ts',
      'front_end/panels/lighthouse/LighthousePanel.ts',
      'front_end/panels/lighthouse/LighthouseProtocolService.ts',
      'front_end/panels/lighthouse/LighthouseReportSelector.ts',
      'front_end/panels/lighthouse/LighthouseStartView.ts',
      'front_end/panels/lighthouse/LighthouseStatusView.ts',
      'front_end/panels/lighthouse/LighthouseTimespanView.ts',
      'front_end/panels/lighthouse/RadioSetting.ts',
      'front_end/panels/media/EventDisplayTable.ts',
      'front_end/panels/media/EventTimelineView.ts',
      'front_end/panels/media/MainView.ts',
      'front_end/panels/media/MediaModel.ts',
      'front_end/panels/media/PlayerDetailView.ts',
      'front_end/panels/media/PlayerListView.ts',
      'front_end/panels/media/PlayerMessagesView.ts',
      'front_end/panels/media/TickingFlameChart.ts',
      'front_end/panels/media/TickingFlameChartHelpers.ts',
      'front_end/panels/mobile_throttling/ThrottlingManager.ts',
      'front_end/panels/mobile_throttling/ThrottlingSettingsTab.ts',
      'front_end/panels/network/BinaryResourceView.ts',
      'front_end/panels/network/EventSourceMessagesView.ts',
      'front_end/panels/network/NetworkDataGridNode.ts',
      'front_end/panels/network/NetworkFrameGrouper.ts',
      'front_end/panels/network/NetworkItemView.ts',
      'front_end/panels/network/NetworkLogView.ts',
      'front_end/panels/network/NetworkLogViewColumns.ts',
      'front_end/panels/network/NetworkManageCustomHeadersView.ts',
      'front_end/panels/network/NetworkOverview.ts',
      'front_end/panels/network/NetworkPanel.ts',
      'front_end/panels/network/NetworkSearchScope.ts',
      'front_end/panels/network/NetworkWaterfallColumn.ts',
      'front_end/panels/network/RequestConditionsDrawer.ts',
      'front_end/panels/network/RequestCookiesView.ts',
      'front_end/panels/network/RequestPreviewView.ts',
      'front_end/panels/network/ResourceChunkView.ts',
      'front_end/panels/network/SignedExchangeInfoView.ts',
      'front_end/panels/performance_monitor/PerformanceMonitor.ts',
      'front_end/panels/profiler/ProfileDataGrid.ts',
      'front_end/panels/protocol_monitor/ProtocolMonitor.ts',
      'front_end/panels/screencast/InputModel.ts',
      'front_end/panels/screencast/ScreencastView.ts',
      'front_end/panels/security/SecurityModel.ts',
      'front_end/panels/security/SecurityPanel.ts',
      'front_end/panels/sensors/LocationsSettingsTab.ts',
      'front_end/panels/sensors/SensorsView.ts',
      'front_end/panels/settings/FrameworkIgnoreListSettingsTab.ts',
      'front_end/panels/settings/KeybindsSettingsTab.ts',
      'front_end/panels/settings/SettingsScreen.ts',
      'front_end/panels/settings/emulation/DevicesSettingsTab.ts',
      'front_end/panels/settings/emulation/utils/StructuredHeaders.ts',
      'front_end/panels/snippets/ScriptSnippetFileSystem.ts',
      'front_end/panels/snippets/SnippetsQuickOpen.ts',
      'front_end/panels/sources/AddSourceMapURLDialog.ts',
      'front_end/panels/sources/CallStackSidebarPane.ts',
      'front_end/panels/sources/CoveragePlugin.ts',
      'front_end/panels/sources/DebuggerPausedMessage.ts',
      'front_end/panels/sources/DebuggerPlugin.ts',
      'front_end/panels/sources/EditingLocationHistoryManager.ts',
      'front_end/panels/sources/FilePathScoreFunction.ts',
      'front_end/panels/sources/FilteredUISourceCodeListProvider.ts',
      'front_end/panels/sources/NavigatorView.ts',
      'front_end/panels/sources/OutlineQuickOpen.ts',
      'front_end/panels/sources/SourcesPanel.ts',
      'front_end/panels/sources/SourcesSearchScope.ts',
      'front_end/panels/sources/SourcesView.ts',
      'front_end/panels/sources/UISourceCodeFrame.ts',
      'front_end/panels/sources/WatchExpressionsSidebarPane.ts',
      'front_end/panels/timeline/CountersGraph.ts',
      'front_end/panels/timeline/EventsTimelineTreeView.ts',
      'front_end/panels/timeline/TimelineController.ts',
      'front_end/panels/timeline/TimelineDetailsView.ts',
      'front_end/panels/timeline/TimelineEventOverview.ts',
      'front_end/panels/timeline/TimelineFlameChartDataProvider.ts',
      'front_end/panels/timeline/TimelineFlameChartView.ts',
      'front_end/panels/timeline/TimelineHistoryManager.ts',
      'front_end/panels/timeline/TimelineLayersView.ts',
      'front_end/panels/timeline/TimelineLoader.ts',
      'front_end/panels/timeline/TimelinePaintProfilerView.ts',
      'front_end/panels/timeline/TimelinePanel.ts',
      'front_end/panels/timeline/TimelineSelectorStatsView.ts',
      'front_end/panels/timeline/TimelineTreeView.ts',
      'front_end/panels/timeline/TimelineUIUtils.ts',
      'front_end/panels/timeline/TracingLayerTree.ts',
      'front_end/panels/web_audio/WebAudioModel.ts',
      'front_end/panels/web_audio/WebAudioView.ts',
      'front_end/testing/MockIssuesManager.ts',
      'front_end/testing/MockIssuesModel.ts',
      'front_end/testing/MockNetworkLog.ts',
      'front_end/testing/StubIssue.ts',
      'front_end/third_party/i18n/i18n-impl.ts',
      'front_end/third_party/i18n/localized-string-set.ts',
      'front_end/third_party/puppeteer/package/src/bidi/core/BrowsingContext.ts',
      'front_end/third_party/puppeteer/package/src/bidi/core/Navigation.ts',
      'front_end/third_party/puppeteer/package/src/bidi/core/Request.ts',
      'front_end/third_party/puppeteer/package/src/bidi/core/Session.ts',
      'front_end/third_party/puppeteer/package/src/bidi/core/UserContext.ts',
      'front_end/third_party/puppeteer/package/src/bidi/core/UserPrompt.ts',
      'front_end/third_party/puppeteer/package/src/cdp/Accessibility.ts',
      'front_end/third_party/puppeteer/package/src/cdp/FrameManager.ts',
      'front_end/third_party/puppeteer/package/src/cdp/Input.ts',
      'front_end/third_party/puppeteer/package/src/cdp/NetworkEventManager.ts',
      'front_end/third_party/wasmparser/package/src/WasmDis.ts',
      'front_end/third_party/wasmparser/package/src/WasmParser.ts',
      'front_end/ui/components/text_editor/config.ts',
      'front_end/ui/legacy/ActionRegistration.ts',
      'front_end/ui/legacy/ActionRegistry.ts',
      'front_end/ui/legacy/ContextMenu.ts',
      'front_end/ui/legacy/Dialog.ts',
      'front_end/ui/legacy/DockController.ts',
      'front_end/ui/legacy/DropTarget.ts',
      'front_end/ui/legacy/FilterBar.ts',
      'front_end/ui/legacy/FilterSuggestionBuilder.ts',
      'front_end/ui/legacy/GlassPane.ts',
      'front_end/ui/legacy/Infobar.ts',
      'front_end/ui/legacy/InplaceEditor.ts',
      'front_end/ui/legacy/InspectorView.ts',
      'front_end/ui/legacy/ListControl.ts',
      'front_end/ui/legacy/ListModel.ts',
      'front_end/ui/legacy/ListWidget.ts',
      'front_end/ui/legacy/Panel.ts',
      'front_end/ui/legacy/PopoverHelper.ts',
      'front_end/ui/legacy/ReportView.ts',
      'front_end/ui/legacy/RootView.ts',
      'front_end/ui/legacy/SearchableView.ts',
      'front_end/ui/legacy/ShortcutRegistry.ts',
      'front_end/ui/legacy/SoftContextMenu.ts',
      'front_end/ui/legacy/SoftDropDown.ts',
      'front_end/ui/legacy/SplitWidget.ts',
      'front_end/ui/legacy/StackedPane.ts',
      'front_end/ui/legacy/SuggestBox.ts',
      'front_end/ui/legacy/TabbedPane.ts',
      'front_end/ui/legacy/TargetCrashedScreen.ts',
      'front_end/ui/legacy/TextPrompt.ts',
      'front_end/ui/legacy/Toolbar.ts',
      'front_end/ui/legacy/Treeoutline.ts',
      'front_end/ui/legacy/UIUtils.ts',
      'front_end/ui/legacy/ViewManager.ts',
      'front_end/ui/legacy/Widget.ts',
      'front_end/ui/legacy/ZoomManager.ts',
      'front_end/ui/legacy/components/color_picker/ContrastDetails.ts',
      'front_end/ui/legacy/components/color_picker/ContrastInfo.ts',
      'front_end/ui/legacy/components/color_picker/ContrastOverlay.ts',
      'front_end/ui/legacy/components/color_picker/Spectrum.ts',
      'front_end/ui/legacy/components/cookie_table/CookiesTable.ts',
      'front_end/ui/legacy/components/data_grid/DataGrid.ts',
      'front_end/ui/legacy/components/data_grid/ShowMoreDataGridNode.ts',
      'front_end/ui/legacy/components/data_grid/ViewportDataGrid.ts',
      'front_end/ui/legacy/components/inline_editor/AnimationTimingUI.ts',
      'front_end/ui/legacy/components/inline_editor/BezierEditor.ts',
      'front_end/ui/legacy/components/inline_editor/CSSAngle.ts',
      'front_end/ui/legacy/components/inline_editor/CSSAngleEditor.ts',
      'front_end/ui/legacy/components/inline_editor/CSSAngleSwatch.ts',
      'front_end/ui/legacy/components/inline_editor/CSSShadowEditor.ts',
      'front_end/ui/legacy/components/inline_editor/ColorMixSwatch.ts',
      'front_end/ui/legacy/components/inline_editor/ColorSwatch.ts',
      'front_end/ui/legacy/components/inline_editor/SwatchPopoverHelper.ts',
      'front_end/ui/legacy/components/object_ui/CustomPreviewComponent.ts',
      'front_end/ui/legacy/components/object_ui/ObjectPopoverHelper.ts',
      'front_end/ui/legacy/components/object_ui/ObjectPropertiesSection.ts',
      'front_end/ui/legacy/components/object_ui/RemoteObjectPreviewFormatter.ts',
      'front_end/ui/legacy/components/perf_ui/ChartViewport.ts',
      'front_end/ui/legacy/components/perf_ui/FilmStripView.ts',
      'front_end/ui/legacy/components/perf_ui/FlameChart.ts',
      'front_end/ui/legacy/components/perf_ui/LineLevelProfile.ts',
      'front_end/ui/legacy/components/perf_ui/OverviewGrid.ts',
      'front_end/ui/legacy/components/perf_ui/PieChart.ts',
      'front_end/ui/legacy/components/perf_ui/TimelineGrid.ts',
      'front_end/ui/legacy/components/perf_ui/TimelineOverviewCalculator.ts',
      'front_end/ui/legacy/components/perf_ui/TimelineOverviewPane.ts',
      'front_end/ui/legacy/components/quick_open/CommandMenu.ts',
      'front_end/ui/legacy/components/quick_open/FilteredListWidget.ts',
      'front_end/ui/legacy/components/quick_open/HelpQuickOpen.ts',
      'front_end/ui/legacy/components/quick_open/QuickOpen.ts',
      'front_end/ui/legacy/components/source_frame/BinaryResourceViewFactory.ts',
      'front_end/ui/legacy/components/source_frame/FontView.ts',
      'front_end/ui/legacy/components/source_frame/JSONView.ts',
      'front_end/ui/legacy/components/source_frame/SourceFrame.ts',
      'front_end/ui/legacy/components/source_frame/XMLView.ts',
      'front_end/ui/legacy/components/utils/Linkifier.ts',
      'front_end/ui/legacy/components/utils/TargetDetachedDialog.ts',
      'front_end/ui/legacy/theme_support/ThemeSupport.ts',
    ],
    rules: {
      '@devtools/prefer-private-class-members': 'off',
    },
  },
  {
    name: 'Supported CSS properties rules',
    files: ['front_end/generated/SupportedCSSProperties.ts'],
    rules: {
      '@devtools/jslog-context-list': 'error',
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
      '@devtools/es-modules-import': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/naming-convention': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@devtools/no-imperative-dom-api': 'off',
      'jsdoc/require-returns-description': 'off',
    },
  },
  {
    name: 'Front-end component docs',
    files: ['front_end/ui/components/docs/**/*.ts', '**/*.docs.ts'],
    rules: {
      // This makes the component doc examples very verbose and doesn't add
      // anything, so we leave return types to the developer within the
      // component_docs folder.
      '@typescript-eslint/explicit-function-return-type': 'off',
      // We use Lit to help render examples sometimes and we don't use
      // {host: this} as often the `this` is the window.
      '@devtools/lit-host-this': 'off',
      '@devtools/no-imperative-dom-api': 'off',
      '@devtools/no-lit-render-outside-of-view': 'off',
    },
  },
  {
    name: 'Keep models/trace isolated',
    files: ['front_end/models/trace/**/*.ts'],
    ignores: [
      'front_end/models/trace/**/*.test.ts',
      'front_end/models/trace/**/*.docs.ts',
    ],
    rules: {
      '@devtools/no-imports-in-directory': [
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
      '@devtools/es-modules-import': 'off',
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
      '@devtools/canvas-context-tracking': 'error',
    },
  },
  {
    name: 'AI Assistance agents',
    files: ['front_end/models/ai_assistance/agents/**/*.ts'],
    rules: {
      '@devtools/no-dynamic-preamble': 'error',
    },
  },
  {
    name: 'TypeScript type-definitions',
    files: ['**/*.d.ts'],
    rules: {
      // Not a useful rule for .d.ts files where we are
      // representing an existing module.
      'no-restricted-syntax': 'off',
    },
  },
  {
    name: 'Config files',
    files: [
      'eslint.config.mjs',
      '**/*/rollup.config.mjs',
      '**/*.rollup.js',
      '**/*/karma.conf.ts',
      '**/*/karma.conf.in.js',
    ],
    rules: {
      // The config operate on the default export
      // So allow it for them
      'no-restricted-syntax': 'off',
    },
  },
  {
    name: 'Mocha test harness setup files',
    files: [
      'front_end/testing/test_setup.ts',
      'test/scripts/mocha_hooks.ts',
      'test/unit/mocha-hooks.ts',
    ],
    rules: {
      // Global Mocha test harness restores Sinon stubs and timers after each test.
      '@devtools/no-manual-sinon-restore': 'off',
    },
  },
]);
