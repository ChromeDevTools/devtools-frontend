// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// clang-format off
const path = require('path');
const rulesDirPlugin = require('eslint-plugin-rulesdir');
rulesDirPlugin.RULES_DIR = path.join(__dirname, '..', '..', '..', '..', 'scripts', 'eslint_rules', 'lib');

module.exports = {
  'rules': {
    'rulesdir/ban_imports_in_directory': [
      'error', {
        bannedImportPaths: [path.join(__dirname, '..', '..', '..', 'core', 'sdk', 'sdk.js')]
      }
    ]
  }
};
