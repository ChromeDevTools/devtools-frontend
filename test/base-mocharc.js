// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const path = require('path');
const glob = require('glob');
const fs = require('fs');
const {getTestRunnerConfigSetting} = require('../scripts/test/test_config_helpers.js');

// To make sure that any leftover JavaScript files (e.g. that were outputs from now-removed tests)
// aren't incorrectly included, we glob for the TypeScript files instead and use that
// to instruct Mocha to run the output JavaScript file.
const testRunnerCWDConfig = getTestRunnerConfigSetting('cwd');
const testRunnerTestSourceDirConfig = getTestRunnerConfigSetting('test-suite-source-dir');

function createMochaConfig({suiteName, extraMochaConfig = {}}) {
  /**
 * Set the ROOT_DIRECTORY based on the assumed folder structure, but if we have
 * config from the new test runner, use that instead.
 *
 * Once we are fully migrated to the new test runner, this initial
 * ROOT_DIRECTORY setting can go as we'll always have configuration provided.
 *
 * TODO(jacktfranklin): tidy up as part of crbug.com/1186163
 */
  let ROOT_DIRECTORY = path.join(__dirname, '..', '..', '..', '..', 'test', suiteName);
  if (testRunnerCWDConfig && testRunnerTestSourceDirConfig) {
    ROOT_DIRECTORY = path.join(testRunnerCWDConfig, testRunnerTestSourceDirConfig);
  }
  const allTestFiles = glob.sync(path.join(ROOT_DIRECTORY, '**/*_test.ts'));
  /**
 * TODO(jacktfranklin): once we are migrated to the new test runner, we can remove the fallback to process.env['TESET_PATTERNS']
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

  /**
 * TODO(jacktfranklin): once we are migrated to the new test runner, we can
 * remove the fallbacks to process.env['X']
 */
  const testSuitePath = getTestRunnerConfigSetting('test-suite-path', '');
  const target = getTestRunnerConfigSetting('target', process.env.TARGET);

  const spec = testFiles.map(fileName => {
    let generatedFile;

    if (testSuitePath) {
      // This means we are being run with the new test runner
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
      generatedFile = path.join('out', target, testSuitePath, renamedFile);

    } else {
      // legacy run_test_suite.py runner
      // We don't have the right set of flags to calculate this path as smartly as we'd like, so let's go relative to this file's __dirname.
      // TODO(jacktfranklin): once we are migrated to the new test runner, this branch can go.
      const renamedFile = fileName.replace(/\.ts$/, '.js');
      generatedFile = path.join(__dirname, suiteName, path.relative(ROOT_DIRECTORY, renamedFile));
    }

    if (!fs.existsSync(generatedFile)) {
      throw new Error(`Test file missing in "ts_library": ${generatedFile}`);
    }

    return generatedFile;
  });


  // When we are debugging, we don't want to timeout any test. This allows to inspect the state
  // of the application at the moment of the timeout. Here, 0 denotes "indefinite timeout".
  const timeout = process.env['DEBUG'] ? 0 : 5 * 1000;

  const jobs = Number(process.env['JOBS']) || 1;
  const parallel = !process.env['DEBUG'] && jobs > 1;

  return {
    require: [path.join(__dirname, 'conductor', 'mocha_hooks.js'), 'source-map-support/register'],
    spec,
    timeout,
    parallel,
    jobs,
    reporter: path.join(__dirname, 'shared', 'mocha-resultsdb-reporter'),
    suiteName,
    ...extraMochaConfig,
  };
}

module.exports = {createMochaConfig};
