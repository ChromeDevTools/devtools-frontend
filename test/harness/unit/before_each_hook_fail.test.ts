// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {beforeEach, describe, it} from 'mocha';

describe('Block', () => {
  beforeEach(() => {
    throw new Error('beforeEach hook failed');
  });

  it('run', () => {
    assert.strictEqual(1 + 1, 2);
  });
});
