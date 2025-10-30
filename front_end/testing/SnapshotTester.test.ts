// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {SnapshotTester} from './SnapshotTester.js';

// Started failing and blocking CfT rolls since 143.0.7447.0
describe.skip('[crbug.com/449129415]: SnapshotTester', () => {
  let snapshotTester: SnapshotTester;
  before(async () => {
    snapshotTester = new SnapshotTester(import.meta);
    await snapshotTester.load();
  });

  after(async () => {
    await snapshotTester.finish();
  });

  it('example snapshot', function() {
    snapshotTester.assert(this, 'hello world');
  });

  it('only one snapshot assert allowed', function() {
    snapshotTester.assert(this, 'hello world 1');

    try {
      snapshotTester.assert(this, 'hello world 2');
      assert.fail('Expected `snapshotTester.assert` to throw');
    } catch (err) {
      assert.strictEqual(err.message, 'sorry, currently only support 1 snapshot assertion per test');
    }
  });
});
