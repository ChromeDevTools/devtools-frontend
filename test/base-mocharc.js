// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const path = require('path');
const glob = require('glob');
const fs = require('fs');
const {getTestRunnerConfigSetting, requireTestRunnerConfigSetting} = require('../scripts/test/test_config_helpers.js');

// To make sure that any leftover JavaScript files (e.g. that were outputs from now-removed tests)
// aren't incorrectly included, we glob for the TypeScript files instead and use that
// to instruct Mocha to run the output JavaScript file.
const testRunnerCWDConfig = requireTestRunnerConfigSetting('cwd');
const testRunnerTestSourceDirConfig = requireTestRunnerConfigSetting('test-suite-source-dir');

function createMochaConfig({suiteName, extraMochaConfig = {}}) {
  const ROOT_DIRECTORY = path.join(testRunnerCWDConfig, testRunnerTestSourceDirConfig);

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
        `\nNo test found matching custom pattern ${customPattern}.` +
        ` Use a relative path from test/${suiteName}/.`);
  }

  const testSuitePath = requireTestRunnerConfigSetting('test-suite-path');
  const target = getTestRunnerConfigSetting('target');

  const spec = testFiles.map(fileName => {
    /**
     * We take the source file, change its extension to .js, and then we need to
     * find its location in out/TARGET. To do that we can remove the
     * ROOT_DIRECTORY part from the file path, and then prepend it with
     * test-suite-path (which is relative to out/TARGET), to get our full path
     * to the compiled output.
     * We have to split ROOT_DIRECTORY on path.sep and join with POSIX
     * separator because even on Windows machines the results of glob.sync
     * come back with POSIX seperators. Therefore, to be able to replace the
     * ROOT_DIRECTORY in that path, we need it to have POSIX seperators else
     * it won't match.
     */
    const rootDirectoryWithPosixSeps = ROOT_DIRECTORY.split(path.sep).join('/');
    const renamedFile = fileName.replace(/\.ts$/, '.js').replace(rootDirectoryWithPosixSeps, '');
    const generatedFile = path.join('out', target, testSuitePath, renamedFile);

    if (!fs.existsSync(generatedFile)) {
      throw new Error(`\n\nERROR RUNNING TESTS:\nTest file missing in "ts_library": ${generatedFile}.
Did you forget to add ${path.relative(process.cwd(), fileName)} to a BUILD.gn?\n`);
    }

    return generatedFile;
  });

  // We pull the timeout out of the extra mocha config, because whilst we want
  // to override the default if it is provided, we don't want to override it if
  // in DEBUG mode, where we set the timeout to 0.
  const {timeout: extraMochaConfigTimeout, ...restOfExtraMochaConfig} = extraMochaConfig;
  // When we are debugging, we don't want to timeout any test. This allows to inspect the state
  // of the application at the moment of the timeout. Here, 0 denotes "indefinite timeout".
  const timeout = process.env['DEBUG_TEST'] ? 0 : (extraMochaConfigTimeout || 5 * 1000);

  const jobs = Number(process.env['JOBS']) || 1;
  const parallel = !process.env['DEBUG_TEST'] && jobs > 1;

  return {
    require: [path.join(__dirname, 'conductor', 'mocha_hooks.js'), 'source-map-support/register'],
    spec,
    timeout,
    parallel,
    jobs,
    reporter: path.join(__dirname, 'shared', 'mocha-resultsdb-reporter'),
    suiteName,
    ...restOfExtraMochaConfig,
  };
}

module.exports = {createMochaConfig};
