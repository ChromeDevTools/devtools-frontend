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
const FLAG_EXPECTATIONS_PATH = path.resolve(LAYOUT_TESTS_PATH, 'FlagExpectations');

function main() {
  const originalTests = scanForTests([
    '../../../../LayoutTests/http/tests/inspector-enabled/',
  ]);

  console.log(originalTests);
  const oldToNewResourcesPath = new Map();
  const oldToNewTestPath = new Map(originalTests.map(t => [t, '']));

  for (const inputRelativePath of originalTests) {
    if (!inputRelativePath) {
      continue;
    }
    const inputPath = path.resolve(__dirname, '..', '..', '..', '..', 'LayoutTests', inputRelativePath);
    const inputResourcesPath = path.resolve(path.dirname(inputPath), 'resources');
    const outPath = migrateUtils.getOutPath(inputPath, true);
    const outResourcesPath = path.resolve(path.dirname(outPath), 'resources');

    if (utils.isDir(inputResourcesPath))
      oldToNewResourcesPath.set(inputResourcesPath, outResourcesPath);
    mkdirp.sync(path.dirname(outPath));

    const original = fs.readFileSync(inputPath, 'utf-8');
    const updatedReferences = original.replace(/127.0.0.1:8000\/inspector/g, '127.0.0.1:8000/devtools')
                                  .replace(/script src="\.\//g, 'script src="')
                                  .replace(/script src="..\/(?=.+-test)/g, 'script src="../../')
                                  .replace(
                                      /script src="(?=\w.+-test)/g,
                                      `script src="${path.relative(path.dirname(outPath), path.dirname(inputPath))}/`)
                                  .replace(/..\/..\/inspector\/..\//g, '../../../inspector/');
    fs.writeFileSync(outPath, updatedReferences);
    fs.unlinkSync(inputPath);

    const outRelativePath = outPath.substring(outPath.indexOf('http/'));
    oldToNewTestPath.set(inputRelativePath, outRelativePath);

    // Move expectation file
    const inputExpectationsPath =
        inputPath.replace(/\.x?html/, '-expected.txt').replace('-expected-expected', '-expected');
    const outExpectationsPath = outPath.replace(/\.x?html/, '-expected.txt').replace('-expected-expected', '-expected');
    if (utils.isFile(inputExpectationsPath)) {
      fs.writeFileSync(outExpectationsPath, fs.readFileSync(inputExpectationsPath, 'utf-8'));
      fs.unlinkSync(inputExpectationsPath);
    }
  }

  const newTestPaths = Array.from(oldToNewTestPath.values()).filter(x => x);

  const TestExpectationFailureTypes =
      ['Crash', 'Failure', 'Rebaseline', 'Skip', 'Timeout', 'WontFix', 'Missing', 'NeedsManualRebaseline'];

  // Update additional test expectations
  for (const filename
           of ['TestExpectations', 'ASANExpectations', 'LeakExpectations', 'MSANExpectations', 'NeverFixTests',
               'SlowTests', 'SmokeTests', 'StaleTestExpectations']) {
    const filePath = path.resolve(LAYOUT_TESTS_PATH, filename);
    updateExpectationsFile(filePath);
  }

  // Update FlagExpectations
  for (const filename of fs.readdirSync(FLAG_EXPECTATIONS_PATH)) {
    const filePath = path.resolve(FLAG_EXPECTATIONS_PATH, filename);
    updateExpectationsFile(filePath);
  }

  for (const [oldResourcesPath, newResourcesPath] of oldToNewResourcesPath) {
    utils.copyRecursive(oldResourcesPath, path.dirname(newResourcesPath));
    utils.removeRecursive(oldResourcesPath);
  }

  function updateExpectationsFile(filePath) {
    const expectations = fs.readFileSync(filePath, 'utf-8');
    const updatedExpectations = expectations.split('\n').map(line => {
      for (const [oldTestPath, newTestPath] of oldToNewTestPath) {
        if (!newTestPath)
          continue;
        if (line.indexOf(oldTestPath) !== -1) {
          const newLine = line.replace(oldTestPath, newTestPath);
          return newLine;
        }
      }
      return line;
    });
    fs.writeFileSync(filePath, updatedExpectations.join('\n'));
  }
}

main();

function scanForTests(dirPaths) {
  const absolutePaths = dirPaths.map(dirPath => path.resolve(__dirname, dirPath));
  let globbedPaths = [];
  for (const absolutePath of absolutePaths)
    glob(absolutePath);
  return globbedPaths.map(p => p.slice(p.indexOf('LayoutTests') + 'LayoutTests'.length + 1));

  function glob(globPath) {
    for (const filename of fs.readdirSync(globPath)) {
      const p = path.resolve(globPath, filename);
      if (utils.isDir(p) && filename !== 'resources') {
        glob(p);
      }
      if (utils.isFile(p) && (p.endsWith('.html') || p.endsWith('.xhtml'))) {
        globbedPaths.push(p);
      }
    }
  }
}