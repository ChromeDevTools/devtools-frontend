// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

const fs = require('fs');
const path = require('path');

const childProcess = require('child_process');

const utils = require('../utils');

const MIGRATE_SCRIPT_PATH = path.resolve(__dirname, 'migrate_test.js');
const TESTS_PATH = path.resolve(__dirname, 'tests.txt');
const TEST_EXPECTATIONS_PATH = path.resolve(__dirname, '..', '..', '..', '..', 'LayoutTests', 'TestExpectations');
const FLAG_EXPECTATIONS_PATH = path.resolve(__dirname, '..', '..', '..', '..', 'LayoutTests', 'FlagExpectations');

function main() {
  const tests = fs.readFileSync(TESTS_PATH, 'utf-8').split('\n').map(line => line.split(' '));
  const oldToNewTests = new Map(tests);
  const testCount = oldToNewTests.size;
  const migratedTests = new Set();

  for (const [_, testPath] of tests) {
    if (!testPath)
      continue;
    const fullTestPath = path.resolve(__dirname, '..', '..', '..', '..', 'LayoutTests', testPath);
    try {
      childProcess.execSync(`node ${MIGRATE_SCRIPT_PATH} ${fullTestPath}`)
    } catch (err) {
      console.log(err.stdout.toString());
      continue;
    }

    for (const [oldTest, newTest] of oldToNewTests) {
      if (testPath === newTest)
        oldToNewTests.delete(oldTest);
    }
    migratedTests.add(testPath);
  }

  console.log(`Successfully migrated: ${migratedTests.size} of ${testCount}`);

  const updatedTests = Array.from(oldToNewTests.entries()).map(line => line.join(' ')).join('\n');
  console.log(updatedTests);

  // Update TestExpectations
  const testExpectations = fs.readFileSync(TEST_EXPECTATIONS_PATH, 'utf-8');
  const updatedTestExpecationLines = [];
  let seenStartSentinel = false;
  let seenEndSentinel = false;
  for (const line of testExpectations.split('\n')) {
    if (line === '# ====== DevTools test migration failures from here ======') {
      seenStartSentinel = true;
      updatedTestExpecationLines.push(line);
      continue;
    }
    if (line === '# ====== DevTools test migration failures until here ======') {
      seenEndSentinel = true;
      updatedTestExpecationLines.push(line);
      continue;
    }
    if (seenEndSentinel) {
      updatedTestExpecationLines.push(line);
      continue;
    }
    if (!seenStartSentinel) {
      updatedTestExpecationLines.push(line);
      continue;
    }
    let skipLine = false;
    for (const test of migratedTests) {
      if (line.indexOf(test) !== -1) {
        skipLine = true;
        break;
      }
    }
    if (!skipLine)
      updatedTestExpecationLines.push(line);
  }

  fs.writeFileSync(TEST_EXPECTATIONS_PATH, updatedTestExpecationLines.join('\n'));

  // Update tests.txt
  fs.writeFileSync(TESTS_PATH, updatedTests);
}

main();
