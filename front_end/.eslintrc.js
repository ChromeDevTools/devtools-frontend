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
    'rulesdir/l10n_filename_matches': [
      'error', {
        rootFrontendDirectory: __dirname,
      }
    ],
    'rulesdir/l10n_i18nString_call_only_with_uistrings': 'error',
    'rulesdir/l10n_no_i18nString_calls_module_instantiation': 'error',
    'rulesdir/l10n_no_locked_or_placeholder_only_phrase': 'error',
    'rulesdir/l10n_no_uistrings_export': 'error',
    'rulesdir/l10n_no_unused_message': 'error',
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
        'rulesdir/no_importing_images_from_src': 'error',
        'rulesdir/enforce_bound_render_for_schedule_render': 'error',
        'rulesdir/enforce_custom_event_names': 'error',
        'rulesdir/set_data_type_reference': 'error',
        'rulesdir/no_bound_component_methods': 'error',
        'rulesdir/lit_html_data_as_type': 'error',
        'rulesdir/lit_no_style_interpolation': 'error',
        'rulesdir/ban_self_closing_custom_element_tagnames': 'error',
        'rulesdir/ban_style_tags_in_lit_html': 'error',
        'rulesdir/ban_a_tags_in_lit_html': 'error',
        'rulesdir/check_css_import': 'error',
        'rulesdir/enforce-optional-properties-last': 'error',
        'rulesdir/check_enumerated_histograms': 'error',
        'rulesdir/check_was_shown_methods': 'error',
        'rulesdir/static_custom_event_names': 'error',
        'rulesdir/lit_html_host_this': 'error',
        'rulesdir/lit_html_no_attribute_quotes': 'error',
        'rulesdir/lit_template_result_or_nothing': 'error',
        'rulesdir/inject_checkbox_styles': 'error',
        'rulesdir/jslog_context_list': 'error',
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
        'rulesdir/use_private_class_members': 'error',
      }
    },
    // TODO(crbug/1402569): Remove once LitElement is fully adopted.
    {
      files: ['panels/recorder/**/*.ts', 'panels/protocol_monitor/**/*.ts', 'ui/components/suggestion_input/*.ts'],
      rules: {
        // TODO(crbug/1402569): Reenable once https://github.com/microsoft/TypeScript/issues/48885 is closed.
        'rulesdir/use_private_class_members': 'off',
      }
    },
    {
      files: ['generated/SupportedCSSProperties.js'],
      rules: {
        'rulesdir/jslog_context_list': 'error',
      }
    }
  ]
};
// clang-format on
