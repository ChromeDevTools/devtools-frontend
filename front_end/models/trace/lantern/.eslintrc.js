// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const path = require('path');
const rulesDirPlugin = require('eslint-plugin-rulesdir');
rulesDirPlugin.RULES_DIR = path.join(__dirname, '..', 'scripts', 'eslint_rules', 'lib');

module.exports = {
  'overrides' : [{
    'files' : ['*.ts'],
    'rules' : {
      '@typescript-eslint/no-unused-vars' : ['error', {'argsIgnorePattern' : '^_'}],
      // TODO(crbug.com/348449529): off due to Lantern needing more refactoring.
      'rulesdir/no_underscored_properties' : 'off',
    }
  }]
};
