// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// clang-format off
const path = require('path');
const rulesDirPlugin = require('eslint-plugin-rulesdir');
rulesDirPlugin.RULES_DIR = path.join(__dirname, '..', 'scripts', 'eslint_rules', 'lib');

module.exports = {
  'rules': {
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
    'rulesdir/custom_element_definitions_location': ['error', {
      rootFrontendDirectory: __dirname,
    }],
  },
  'overrides': [
    {
      'files': ['*.ts'],
      'rules': {
        '@typescript-eslint/explicit-function-return-type': [
            'error', {
              'allowExpressions': true,
              'allowConciseArrowFunctionExpressionsStartingWithVoid': true,
              'allowIIFEs':true,
            },
        ],
        'rulesdir/no_importing_images_from_src': 'error',
        'rulesdir/enforce_bound_render_for_schedule_render': 'error',
        'rulesdir/enforce_custom_event_names': 'error',
        'rulesdir/set_data_type_reference': 'error',
        'rulesdir/no_bound_component_methods': 'error',
        'rulesdir/lit_html_data_as_type': 'error',
        'rulesdir/lit_no_style_interpolation': 'error',
        'rulesdir/ban_literal_devtools_component_tag_names': 'error',
        'rulesdir/ban_self_closing_custom_element_tagnames': 'error',
        'rulesdir/ban_style_tags_in_lit_html': 'error',
        'rulesdir/ban_a_tags_in_lit_html': 'error',
        'rulesdir/check_component_naming': 'error',
        'rulesdir/check_css_import': 'error',
        'rulesdir/check_enumerated_histograms': 'error',
        'rulesdir/check_was_shown_methods': 'error',
        'rulesdir/static_custom_event_names': 'error',
        'rulesdir/lit_html_host_this': 'error',
        'rulesdir/lit_html_no_attribute_quotes': 'error',
        'rulesdir/lit_template_result_or_nothing': 'error',
        'rulesdir/inject_checkbox_styles': 'error',
        '@typescript-eslint/naming-convention': [
          'error', {
            'selector': ['property', 'parameterProperty'],
            'format': ['camelCase'],
          },
          {
            'selector': 'property',
            'modifiers': ['public'],
            'format': ['camelCase'],
            'leadingUnderscore': 'allow',
          },
          {
            'selector': 'classProperty',
            'modifiers': ['static', 'readonly'],
            'format': ['UPPER_CASE', 'camelCase'],
          },
          {
            'selector': 'method',
            'format': ['camelCase'],
          },
          {
            'selector': 'function',
            'format': ['camelCase'],
          },
          {
            'selector': 'variable',
            'filter': {
              // Ignore localization variables.
              'regex': '^(UIStrings|str_)$',
              'match': false
            },
            'format': ['camelCase'],
          },
          {
            // We are using camelCase, PascalCase and UPPER_CASE for top-level constants, allow the for now.
            'selector': 'variable',
            'modifiers': ['const'],
            'filter': {
              // Ignore localization variables.
              'regex': '^(UIStrings|str_)$',
              'match': false
            },
            'format': ['camelCase', 'UPPER_CASE', 'PascalCase'],
          },
          {
            // Public methods are currently in transition and may still have leading underscores.
            'selector': 'method',
            'modifiers': ['public'],
            'format': ['camelCase'],
            'leadingUnderscore': 'allow',
          },
          {
            // Object literals may be constructed as arguments to external libraries which follow different styles.
            'selector': ['objectLiteralMethod', 'objectLiteralProperty'],
            'modifiers': ['public'],
            'format': null,
          },
          {
            'selector': 'accessor',
            'format': ['camelCase'],
          },
          {
            'selector': 'enumMember',
            'format': ['PascalCase', 'UPPER_CASE'],
          },
          {
            'selector': ['typeLike'],
            'format': ['PascalCase'],
          },
          {
            'selector': 'parameter',
            'format': ['camelCase'],
            'leadingUnderscore': 'allow',
          },
          {
            // Ignore type properties that require quotes
            'selector': ['typeProperty', 'enumMember'],
            'format': null,
            'modifiers': ['requiresQuotes']
          }
        ]
      }
    },
    {
      'files': ['*-meta.ts'],
      'rules': {
        '@typescript-eslint/naming-convention': [
          'error', {
            'selector': 'parameter',
            'format': ['camelCase', 'PascalCase'],
            'leadingUnderscore': 'allow',
          }
        ]
      }
    },
    {
      'files': ['*.test.ts', '**/testing/*.ts'],
      'rules': {
        'rulesdir/check_component_naming': 'off',
        'rulesdir/custom_element_definitions_location': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
      },
    },
    {
      'files': ['panels/**/components/*.ts', 'ui/components/**/*.ts', 'entrypoints/**/*.ts'],
      'rules': {
        'rulesdir/use_private_class_members': 'error',
      }
    },
    // TODO(crbug/1402569): Remove once LitElement is fully adopted.
    {
      'files': ['panels/recorder/**/*.ts', 'panels/protocol_monitor/**/*.ts', 'ui/components/suggestion_input/*.ts'],
      'rules': {
        'rulesdir/check_component_naming': 'off',
        'rulesdir/ban_literal_devtools_component_tag_names': 'off',
        // TODO(crbug/1402569): Reenable once https://github.com/microsoft/TypeScript/issues/48885 is closed.
        'rulesdir/use_private_class_members': 'off',
      }
    }
  ]
};
// clang-format on
