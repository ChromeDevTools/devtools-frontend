// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const path = require('path');
const glob = require('glob');

// To make sure that any leftover JavaScript files (e.g. that were outputs from now-removed tests)
// aren't incorrectly included, we glob for the TypeScript files instead and use that
// to instruct Mocha to run the output JavaScript file.
let testFiles = glob.sync(path.join(__dirname, '**/*_test.ts')).map(fileName => fileName.replace(/\.ts$/, '.js'));

// Respect the test file if defined.
// This way you can test one single file instead of running all e2e tests every time.
testFiles = process.env['TEST_FILE'] || testFiles;

// When we are debugging, we don't want to timeout any test. This allows to inspect the state
// of the application at the moment of the timeout. Here, 0 denotes "indefinite timeout".
const timeout = process.env['DEBUG'] ? 0 : 5 * 1000;

module.exports = {
  require: path.join(__dirname, '..', 'conductor', 'mocha_hooks.js'),
  spec: testFiles,
  timeout,
}
