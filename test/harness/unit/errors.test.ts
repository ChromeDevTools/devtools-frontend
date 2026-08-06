// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

describe('block_1', function() {
  it('run_1', () => {
    assert.strictEqual(1 + 1, 2, 'Math works');
  });

  it('run_2', () => {
    assert.strictEqual(1 + 1, 2, 'Math works');
  });
});

describe('block_2', () => {
  it('run_3', () => {
    assert.strictEqual(1 + 1, 3, 'Failing test');
  });

  it('run_4', () => {
    assert.strictEqual(1 + 1, 2, 'Math works');
  });
});
