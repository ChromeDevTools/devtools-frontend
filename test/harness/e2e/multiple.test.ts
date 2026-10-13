// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {describe, it} from '../../e2e/conductor/mocha-interface.js';

describe('multiple', () => {
  it('run1', () => {
    assert.strictEqual(1 + 1, 2, 'Math works');
  });

  it('run2', () => {
    assert.strictEqual(1 + 1, 2, 'Math works');
  });
});
