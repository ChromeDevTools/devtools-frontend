// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'fs';
import {dirname} from 'path';

import {GEN_DIR, rebase, SOURCE_ROOT} from '../conductor/paths.js';
import {TestConfig} from '../conductor/test_config.js';

const UPDATE_SNAPSHOTS = TestConfig.onDiff.update;

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

    currentTestPath = this.currentTest.file;

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
  if (currentSnapshotPath !== undefined && currentSnapshot !== undefined &&
      (!Array.isArray(TestConfig.onDiff.update) || TestConfig.onDiff.update.includes(currentSnapshotPath))) {
    mkdirSync(dirname(currentSnapshotPath), {recursive: true});
    writeFileSync(currentSnapshotPath, JSON.stringify(currentSnapshot, undefined, 2));
  }
  currentSnapshotPath = undefined;
  currentSnapshot = {};
};

const restoreSnapshots = () => {
  if (!currentSnapshotPath || !existsSync(currentSnapshotPath)) {
    throw new Error(`Could not find snapshot for ${
        currentSnapshotPath}. You can update the snapshots by running the tests with --diff=update.`);
  }
  currentSnapshot = JSON.parse(readFileSync(currentSnapshotPath, 'utf-8'));
};

const getSnapshotPath = (testPath: string) => {
  return rebase(GEN_DIR, SOURCE_ROOT, testPath, '.json');
};

const getOrUpdateSnapshot = (value: unknown, options: SnapshotOptions) => {
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
