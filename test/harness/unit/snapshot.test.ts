// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describe, it} from 'mocha';

import {SnapshotTester} from '../../../front_end/testing/SnapshotTester.js';

describe('Snapshot test harness', function() {
  const snapshotTester = new SnapshotTester(this, import.meta);

  it('supports snapshot assertion in test harness', function() {
    snapshotTester.assert(this, 'snapshot harness test content');
  });
});
