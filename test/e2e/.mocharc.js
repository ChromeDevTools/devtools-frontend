// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const path = require('path');
const glob = require('glob');
const fs = require('fs');

// To make sure that any leftover JavaScript files (e.g. that were outputs from now-removed tests)
// aren't incorrectly included, we glob for the TypeScript files instead and use that
// to instruct Mocha to run the output JavaScript file.
const ROOT_DIRECTORY = path.join(__dirname, '..', '..', '..', '..', '..', 'test', 'e2e');
let testFiles = glob.sync(path.join(ROOT_DIRECTORY, '**/*_test.ts')).map(fileName => {
  const renamedFile = fileName.replace(/\.ts$/, '.js');
  const generatedFile = path.join(__dirname, path.relative(ROOT_DIRECTORY, renamedFile));

  if (!fs.existsSync(generatedFile)) {
    throw new Error(`Test file missing in "ts_library": ${generatedFile}`);
  }

  return generatedFile;
});

// Respect the test file if defined.
// This way you can test one single file instead of running all e2e tests every time.
if (process.env['TEST_FILE']) {
  let testFile = process.env['TEST_FILE'];
  // Accept .ts, .js and no extension.
  testFile = testFile.replace(/\.ts$/, '.js');
  if (!testFile.endsWith('.js')) {
    testFile += '.js';
  }
  const absoluteTestFile = path.join(__dirname, testFile);

  // We also need to filter the test against the .ts list above because there can be
  // leftover .js files from previous builds.
  if (!testFiles.includes(absoluteTestFile)) {
    // The leading \n makes the failure easier to find in the output.
    throw new Error(
        `\nNo test found matching --test-file=${process.env['TEST_FILE']}.` +
        ' Use a relative path from test/e2e/.');
  }
  testFiles = absoluteTestFile;
}

// When we are debugging, we don't want to timeout any test. This allows to inspect the state
// of the application at the moment of the timeout. Here, 0 denotes "indefinite timeout".
const timeout = process.env['DEBUG'] ? 0 : 5 * 1000;

// Our e2e tests are almost always slower than the default 75ms.
const slow = 1000;

module.exports = {
  require: [path.join(__dirname, '..', 'conductor', 'mocha_hooks.js'), 'source-map-support/register'],
  spec: testFiles,
  slow,
  timeout,
}
