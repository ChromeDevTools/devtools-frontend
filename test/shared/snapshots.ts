// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'fs';
import {basename, dirname, extname, join, normalize} from 'path';

import {getTestRunnerConfigSetting} from '../conductor/test_runner_config.js';

const CWD = getTestRunnerConfigSetting<string>('cwd', '');
const TEST_SUITE_SOURCE_DIR = getTestRunnerConfigSetting<string>('test-suite-source-dir', '');
const TEST_SUITE_PATH = getTestRunnerConfigSetting<string>('test-suite-path', '');
if (!CWD || !TEST_SUITE_SOURCE_DIR) {
  throw new Error('--cwd and --test-suite-source-dir must be provided when running the snapshot tests.');
}
if (!TEST_SUITE_PATH) {
  throw new Error('--test-suite-path must be specified');
}

const SNAPSHOTS_DIR = join(CWD, TEST_SUITE_SOURCE_DIR, 'snapshots');

const UPDATE_SNAPSHOTS = Boolean(process.env['UPDATE_SNAPSHOTS']);

let currentTestPath: string|undefined;
let currentTestTitle: string|undefined;
let snapshotIndex = 0;

beforeEach(function() {
  if (this.currentTest) {
    // The test file path is always the coloned beginning part of a test's first title.
    const [describeTitle, ...otherParts] = this.currentTest.titlePath();
    const [testPath, ...title] = describeTitle.split(':');

    // The test path is included for every describe statement, so let's clean them.
    currentTestTitle = [title.join(':'), ...otherParts.map(part => part.replaceAll(`${testPath}: `, ''))]
                           .map(part => part.trim())
                           .join(' ');

    // The ITERATIONS environment variable suffixes tests after the first test,
    // so we need to remove the suffix for snapshots to match.
    const iterationSuffix = /( \(#[0-9]+\))$/;
    const match = iterationSuffix.exec(currentTestTitle);
    if (match) {
      currentTestTitle = currentTestTitle.slice(0, -match[1].length);
    }

    currentTestPath = testPath && normalize(testPath.trim());

    snapshotIndex = 0;
  }
});

after(() => {
  if (UPDATE_SNAPSHOTS) {
    saveSnapshotsIfTaken();
  }
});

let currentSnapshotPath: string|undefined;
let currentSnapshot: Record<string, unknown> = {};

const saveSnapshotsIfTaken = () => {
  if (currentSnapshotPath !== undefined && currentSnapshot !== undefined) {
    mkdirSync(dirname(currentSnapshotPath), {recursive: true});
    writeFileSync(currentSnapshotPath, JSON.stringify(currentSnapshot, undefined, 2));
  }
  currentSnapshotPath = undefined;
  currentSnapshot = {};
};

const restoreSnapshots = () => {
  if (!currentSnapshotPath || !existsSync(currentSnapshotPath)) {
    throw new Error(`Could not find snapshot for ${
        currentSnapshotPath}. You can update the snapshots by running the tests with UPDATE_SNAPSHOTS=1.`);
  }
  currentSnapshot = JSON.parse(readFileSync(currentSnapshotPath, 'utf-8'));
};

const getSnapshotPath = (testPath: string) => {
  return join(SNAPSHOTS_DIR, dirname(testPath), `${basename(testPath, extname(testPath))}.json`);
};

const getOrUpdateSnapshot = (value: unknown, options: SnapshotOptions): unknown => {
  if (!currentTestPath || !currentTestTitle) {
    throw new Error('Not using snapshot helper in test');
  }
  const name = options.name ?? ++snapshotIndex;

  const testName = `${currentTestTitle} - ${name}`;
  const path = getSnapshotPath(currentTestPath);
  if (UPDATE_SNAPSHOTS) {
    if (currentSnapshotPath !== path) {
      saveSnapshotsIfTaken();
      currentSnapshotPath = path;
    }
    currentSnapshot[testName] = value;
  } else {
    if (currentSnapshotPath !== path) {
      currentSnapshotPath = path;
      restoreSnapshots();
    }
  }

  return currentSnapshot[testName];
};

export interface SnapshotOptions {
  /**
   * Optional. A name to use for this snapshot. Useful for making snapshots
   * order independent.
   */
  name?: string;
}

/**
 * Asserts that the given value matches a saved stringified version of the
 * value.
 *
 * To update the saved version, tests must be run with UPDATE_SNAPSHOTS=1.
 *
 * Saved snapshots will appear in the `<test-suite-root>/snapshots` directory,
 * prefixed with the path of the test.
 *
 * If multiple snapshots are taken in a single test, snapshots will be numbered
 * and thus become order dependent. In this case, using
 * {@link SnapshotOptions.name} to create named snapshots is recommended.
 *
 * @param value - The value to assert.
 * @param options - Options to configure snapshot behavior.
 */
export const assertMatchesJSONSnapshot = (value: unknown, options: SnapshotOptions = {}) => {
  assert.deepEqual(value, getOrUpdateSnapshot(value, options));
};
