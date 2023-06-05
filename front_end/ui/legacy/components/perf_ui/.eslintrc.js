// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const path = require('path');
const rulesDirPlugin = require('eslint-plugin-rulesdir');
rulesDirPlugin.RULES_DIR = path.join(__dirname, '..', '..', '..', '..', '..', 'scripts', 'eslint_rules', 'lib');

module.exports = {
  'rules' : {
    // Enable tracking of canvas save() and
    // restore() calls to try and catch bugs. Only
    // enabled in this folder because it is an
    // expensive rule to run and we do not need it
    // for any code that doesn't use Canvas.
    'rulesdir/canvas_context_tracking' : 2,
  }
};
