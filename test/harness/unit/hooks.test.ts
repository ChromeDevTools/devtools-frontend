// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {before, describe, it} from 'mocha';

describe('Block 1', () => {
  before(() => {
    throw new Error('hook failed');
  });

  it('run 1', () => {
    assert.strictEqual(1 + 1, 2, 'Math works');
  });

  it('run 2', () => {
    assert.strictEqual(1 + 1, 2, 'Math works');
  });
});

describe('Block 2', () => {
  it('run 3', () => {
    assert.strictEqual(1 + 1, 2, 'Math works');
  });

  it('run 4', () => {
    assert.strictEqual(1 + 1, 2, 'Math works');
  });
});
