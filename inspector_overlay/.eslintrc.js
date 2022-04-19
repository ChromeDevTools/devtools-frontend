// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const path = require('path');
const rulesDirPlugin = require('eslint-plugin-rulesdir');
rulesDirPlugin.RULES_DIR = path.join(__dirname, '..', 'scripts', 'eslint_rules', 'lib');

module.exports = {
  'overrides': [{
    'files': ['*.ts'],
    'rules': {
      '@typescript-eslint/naming-convention': [
        'error', {
          'selector': ['function', 'variable', 'accessor', 'method', 'property', 'parameterProperty'],
          'format': ['camelCase'],
        },
        {
          // Allow camelCase and UPPER_CASE for constants.
          'selector': 'variable',
          'modifiers': ['const'],
          'format': ['camelCase', 'UPPER_CASE'],
        },
        {
          'selector': 'classProperty',
          'modifiers': ['static', 'readonly'],
          'format': ['UPPER_CASE'],
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
          'selector': [
            'typeProperty',
            'enumMember'
          ],
          'format': null,
          'modifiers': ['requiresQuotes']
        }
      ]
    }
  }]
};
