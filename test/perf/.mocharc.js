// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const path = require('path');
const glob = require('glob');
const fs = require('fs');
const {getTestRunnerConfigSetting} = require('../../scripts/test/test_config_helpers.js');

const testRunnerCWDConfig = getTestRunnerConfigSetting('cwd');
const testRunnerTestSourceDirConfig = getTestRunnerConfigSetting('test-suite-source-dir');

/**
 * Set the ROOT_DIRECTORY based on the assumed folder structure, but if we have
 * config from the new test runner, use that instead.
 *
 * Once we are fully migrated to the new test runner, this initial
 * ROOT_DIRECTORY setting can go as we'll always have configuration provided.
 *
 * TODO(jacktfranklin): tidy up as part of crbug.com/1186163
 */
let ROOT_DIRECTORY = path.join(__dirname, '..', '..', '..', '..', '..', 'test', 'interactions');
if (testRunnerCWDConfig && testRunnerTestSourceDirConfig) {
  ROOT_DIRECTORY = path.join(testRunnerCWDConfig, testRunnerTestSourceDirConfig);
}

const allTestFiles = glob.sync(path.join(ROOT_DIRECTORY, '**/*_test.ts'));
/**
 * TODO(jacktfranklin): once we are migrated to the new test runner, we can remove the fallback to process.env['TESET_PATTERNS']
 * alexrudenko: Note that if TEST_PATTERNS is removed, the docs for running stressor (deflake) bots should be updated
 * and the bots should be able to consume custom config files provided via `git cl try`.
 */
const customPattern = getTestRunnerConfigSetting('test-file-pattern', process.env['TEST_PATTERNS']);

const testFiles = !customPattern ? allTestFiles :
                                   customPattern.split(',')
                                       .map(pattern => glob.sync(pattern, {absolute: true, cwd: ROOT_DIRECTORY}))
                                       .flat()
                                       .filter(filename => allTestFiles.includes(filename));


if (customPattern && testFiles.length === 0) {
  throw new Error(
      `\nNo test found matching --test-file=${process.env['TEST_PATTERNS']}.` +
      ' Use a relative path from test/perf/.');
}

const spec = testFiles.map(fileName => {
  const renamedFile = fileName.replace(/\.ts$/, '.js');
  const generatedFile = path.join(__dirname, path.relative(ROOT_DIRECTORY, renamedFile));

  if (!fs.existsSync(generatedFile)) {
    throw new Error(`Test file missing in "ts_library": ${generatedFile}`);
  }

  return generatedFile;
});

// When we are debugging, we don't want to timeout any test. This allows to inspect the state
// of the application at the moment of the timeout. Here, 0 denotes "indefinite timeout".
const timeout = process.env['DEBUG_TEST'] ? 0 : 5 * 1000;
module.exports = {
  require: path.join(__dirname, '..', 'conductor', 'mocha_hooks.js'),
  spec,
  timeout,
}
