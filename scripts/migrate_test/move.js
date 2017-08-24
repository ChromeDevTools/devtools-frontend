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

const LAYOUT_TESTS_PATH = path.resolve(__dirname, '..', '..', '..', '..', 'LayoutTests');
const TEST_EXPECTATIONS_PATH = path.resolve(LAYOUT_TESTS_PATH, 'TestExpectations');
const FLAG_EXPECTATIONS_PATH = path.resolve(LAYOUT_TESTS_PATH, 'FlagExpectations');

function main() {
  const originalTests = scanForTests('../../../../LayoutTests/inspector/console');
  console.log(originalTests);
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

    if (utils.isDir(inputResourcesPath))
      oldToNewResourcesPath.set(inputResourcesPath, outResourcesPath);
    mkdirp.sync(path.dirname(outPath));

    // Move .html -> .js
    const original = fs.readFileSync(inputPath, 'utf-8');
    const updatedReferences = original.split('http/tests/inspector').join('inspector');
    fs.writeFileSync(outPath, updatedReferences);
    fs.unlinkSync(inputPath);

    const outRelativePath = outPath.substring(outPath.indexOf('http/'));
    oldToNewTestPath.set(inputRelativePath, outRelativePath);

    // Move expectation file
    const inputExpectationsPath = inputPath.replace('.html', '-expected.txt');
    const outExpectationsPath = outPath.replace('.html', '-expected.txt');
    fs.writeFileSync(outExpectationsPath, fs.readFileSync(inputExpectationsPath, 'utf-8'));
    fs.unlinkSync(inputExpectationsPath);
  }

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

      // Put mojo tests here so we don't re-enable the test after migrating
      if (line === '### Manually fix after migration') {
        const newLines = Array.from(newTestPaths)
                             .filter(t => testsAlreadyExempted.has(t))
                             .map(x => `crbug.com/667560 virtual/mojo-loading/${x} [ Skip ]`)
                             .join('\n');
        if (newLines.length)
          return line + '\n' + newLines;
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

function scanForTests(dirPath) {
  const absolutePath = path.resolve(__dirname, dirPath);
  let globbedPaths = [];
  glob(absolutePath);
  return globbedPaths.map(p => p.slice(p.indexOf('LayoutTests') + 'LayoutTests'.length + 1));

  function glob(globPath) {
    for (const filename of fs.readdirSync(globPath)) {
      const p = path.resolve(globPath, filename);
      if (utils.isDir(p) && filename !== 'resources') {
        glob(p);
      }
      if (utils.isFile(p) && p.endsWith('.html')) {
        globbedPaths.push(p);
      }
    }
  }
}