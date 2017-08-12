// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');

const mkdirp = require('mkdirp');

const migrateUtils = require('./migrate_utils');
const utils = require('../utils');

const MIGRATE_TEST_PATH = path.resolve(__dirname, 'migrate_test.js');
const TESTS_PATH = path.resolve(__dirname, 'tests.txt');
const LAYOUT_TESTS_PATH = path.resolve(__dirname, '..', '..', '..', '..', 'LayoutTests');
const TEST_EXPECTATIONS_PATH = path.resolve(LAYOUT_TESTS_PATH, 'TestExpectations');
const FLAG_EXPECTATIONS_PATH = path.resolve(LAYOUT_TESTS_PATH, 'FlagExpectations');

function main() {
  const originalTests = fs.readFileSync(TESTS_PATH, 'utf-8').split('\n').map(line => line.split(' ')[0]);
  const oldToNewResourcesPath = new Map();
  const oldToNewTestPath = new Map(originalTests.map(t => [t, '']));

  for (const inputRelativePath of originalTests) {
    if (!inputRelativePath) {
      continue;
    }
    const inputPath = path.resolve(__dirname, '..', '..', '..', '..', 'LayoutTests', inputRelativePath);
    const inputResourcesPath = path.resolve(path.dirname(inputPath), 'resources');
    const outPath = migrateUtils.getOutPath(inputPath);
    const outResourcesPath = path.resolve(path.dirname(outPath), 'resources');

    try {
      childProcess.execSync(`DRY_RUN=1 node ${MIGRATE_TEST_PATH} ${inputPath}`);
    } catch (err) {
      console.log('Skipping test', inputPath);
      console.log(err.stdout.toString());
      continue;
    }

    if (utils.isDir(inputResourcesPath))
      oldToNewResourcesPath.set(inputResourcesPath, outResourcesPath);
    mkdirp.sync(path.dirname(outPath));

    // Move .html -> .js
    fs.writeFileSync(outPath, fs.readFileSync(inputPath, 'utf-8'));
    fs.unlinkSync(inputPath);

    const outRelativePath = outPath.substring(outPath.indexOf('http/'));
    oldToNewTestPath.set(inputRelativePath, outRelativePath);

    // Move expectation file
    const inputExpectationsPath = inputPath.replace('.html', '-expected.txt');
    const outExpectationsPath = outPath.replace('.js', '-expected.txt');
    fs.writeFileSync(outExpectationsPath, fs.readFileSync(inputExpectationsPath, 'utf-8'));
    fs.unlinkSync(inputExpectationsPath);
  }

  fs.writeFileSync(TESTS_PATH, Array.from(oldToNewTestPath.entries()).map(a => a.join(' ')).join('\n'));

  const newTestPaths = Array.from(oldToNewTestPath.values()).filter(x => x);

  const TestExpectationFailureTypes =
      ['Crash', 'Failure', 'Rebaseline', 'Skip', 'Timeout', 'WontFix', 'Missing', 'NeedsManualRebaseline'];

  const testsAlreadyExempted = new Set();

  // Update TestExpectations
  const testExpectations = fs.readFileSync(TEST_EXPECTATIONS_PATH, 'utf-8');
  let updatedTestExpecations = testExpectations.split('\n').map(line => {
    for (const [oldTestPath, newTestPath] of oldToNewTestPath) {
      if (!newTestPath)
        continue;
      if (line.indexOf(oldTestPath) !== -1) {
        if (TestExpectationFailureTypes.some(x => line.indexOf(x) !== -1)) {
          testsAlreadyExempted.add(newTestPath);
        }
        return line.replace(oldTestPath, newTestPath);
      }
    }
    return line;
  });

  updatedTestExpecations = updatedTestExpecations.map(line => {
    for (const [oldTestPath, newTestPath] of oldToNewTestPath) {
      if (!newTestPath)
        continue;
      if (line === '# See crbug.com/667560 for details') {
        return line + '\n' +
            Array.from(newTestPaths)
                .filter(t => !testsAlreadyExempted.has(t))
                .map(x => `crbug.com/667560 ${x} [ Skip ]`)
                .join('\n');
      }
      if (line === '### virtual/mojo-loading/http/tests/devtools') {
        return line + '\n' +
            Array.from(newTestPaths)
                .filter(t => !testsAlreadyExempted.has(t))
                .map(x => `crbug.com/667560 virtual/mojo-loading/${x} [ Skip ]`)
                .join('\n');
      }

      // Put mojo tests here so we don't re-enable the test after migrating
      if (line === '### Manually fix after migration') {
        return line + '\n' +
            Array.from(newTestPaths)
                .filter(t => testsAlreadyExempted.has(t))
                .map(x => `crbug.com/667560 virtual/mojo-loading/${x} [ Skip ]`)
                .join('\n');
      }
    }
    return line;
  });
  fs.writeFileSync(TEST_EXPECTATIONS_PATH, updatedTestExpecations.join('\n'));

  // Update additional test expectations
  for (const filename
           of ['ASANExpectations', 'LeakExpectations', 'MSANExpectations', 'NeverFixTests', 'SlowTests', 'SmokeTests',
               'StaleTestExpectations']) {
    const filePath = path.resolve(LAYOUT_TESTS_PATH, filename);
    updateExpectationsFile(filePath);
  }

  // Update FlagExpectations
  for (const filename of fs.readdirSync(FLAG_EXPECTATIONS_PATH)) {
    const filePath = path.resolve(FLAG_EXPECTATIONS_PATH, filename);
    updateExpectationsFile(filePath);
  }

  for (const [oldResourcesPath, newResourcesPath] of oldToNewResourcesPath)
    utils.copyRecursive(oldResourcesPath, path.dirname(newResourcesPath));

  function updateExpectationsFile(filePath) {
    const expectations = fs.readFileSync(filePath, 'utf-8');
    const updatedExpectations = expectations.split('\n').map(line => {
      for (const [oldTestPath, newTestPath] of oldToNewTestPath) {
        if (!newTestPath)
          continue;
        if (line.indexOf(oldTestPath) !== -1) {
          return line.replace(oldTestPath, newTestPath);
        }
      }
      return line;
    });
    fs.writeFileSync(filePath, updatedExpectations.join('\n'));
  }
}

main();
