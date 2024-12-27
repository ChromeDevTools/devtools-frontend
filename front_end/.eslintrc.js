// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// clang-format off
const path = require('path');
const rulesDirPlugin = require('eslint-plugin-rulesdir');
rulesDirPlugin.RULES_DIR = path.join(__dirname, '..', 'scripts', 'eslint_rules', 'lib');

module.exports = {
  rules: {
    // L10n rules are only relevant in 'front_end'.
    'rulesdir/l10n-filename-matches': [
      'error', {
        rootFrontendDirectory: __dirname,
      }
    ],
    'rulesdir/l10n-i18nString-call-only-with-uistrings': 'error',
    'rulesdir/l10n-no-i18nString-calls-module-instantiation': 'error',
    'rulesdir/l10n-no-locked-or-placeholder-only-phrase': 'error',
    'rulesdir/l10n-no-uistrings-export': 'error',
    'rulesdir/l10n-no-unused-message': 'error',
  },
  overrides: [
    {
      files: ['*.ts'],
      rules: {
        '@typescript-eslint/explicit-function-return-type': [
            'error', {
              allowExpressions: true,
              allowConciseArrowFunctionExpressionsStartingWithVoid: true,
              allowIIFEs:true,
            },
        ],
        'rulesdir/no-importing-images-from-src': 'error',
        'rulesdir/enforce-bound-render-for-schedule-render': 'error',
        'rulesdir/enforce-custom-event-names': 'error',
        'rulesdir/set-data-type-reference': 'error',
        'rulesdir/no-bound-component-methods': 'error',
        'rulesdir/lit-no-style-interpolation': 'error',
        'rulesdir/no-self-closing-custom-element-tagnames': 'error',
        'rulesdir/no-style-tags-in-lit-html': 'error',
        'rulesdir/no-a-tags-in-lit-html': 'error',
        'rulesdir/check-css-import': 'error',
        'rulesdir/enforce-optional-properties-last': 'error',
        'rulesdir/check-enumerated-histograms': 'error',
        'rulesdir/check-was-shown-methods': 'error',
        'rulesdir/static-custom-event-names': 'error',
        'rulesdir/lit-html-host-this': 'error',
        'rulesdir/lit-html-no-attribute-quotes': 'error',
        'rulesdir/lit-template-result-or-nothing': 'error',
        'rulesdir/inject-checkbox-styles': 'error',
        'rulesdir/jslog-context-list': 'error',
      }
    },
    {
      files: ['*-meta.ts'],
      rules: {
        '@typescript-eslint/naming-convention': [
          'error', {
            selector: 'parameter',
            format: ['camelCase', 'PascalCase'],
            leadingUnderscore: 'allow',
          }
        ]
      }
    },
    {
      files: ['*.test.ts', '**/testing/*.ts'],
      rules: {
        '@typescript-eslint/explicit-function-return-type': 'off',
      },
    },
    {
      files: ['panels/**/components/*.ts', 'ui/components/**/*.ts', 'entrypoints/**/*.ts'],
      rules: {
        'rulesdir/prefer-private-class-members': 'error',
      }
    },
    // TODO(crbug/1402569): Remove once LitElement is fully adopted.
    {
      files: ['panels/recorder/**/*.ts', 'panels/protocol_monitor/**/*.ts', 'ui/components/suggestion_input/*.ts'],
      rules: {
        // TODO(crbug/1402569): Reenable once https://github.com/microsoft/TypeScript/issues/48885 is closed.
        'rulesdir/prefer-private-class-members': 'off',
      }
    },
    {
      files: ['generated/SupportedCSSProperties.js'],
      rules: {
        'rulesdir/jslog-context-list': 'error',
      }
    }
  ]
};
// clang-format on
