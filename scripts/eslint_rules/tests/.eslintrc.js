// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const path = require('path');
const rulesDirPlugin = require('eslint-plugin-rulesdir');

rulesDirPlugin.RULES_DIR = path.join(__dirname, '..', 'lib');

module.exports = {
  'rules': {
    'rulesdir/no_only_eslint_tests': 2,
    // errors on it('test') with no body
    'mocha/no-pending-tests': 2,
    // errors on {describe, it}.only
    'mocha/no-exclusive-tests': 2,
  }
};
