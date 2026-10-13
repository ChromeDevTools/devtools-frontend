// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {before, describe, it} from 'mocha';

before(() => {
  throw new Error('global before hook failed');
});

describe('Block', () => {
  it('run', () => {
    assert.strictEqual(1 + 1, 2);
  });
});
