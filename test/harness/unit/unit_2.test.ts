// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

describe('unit_2', () => {
  it('should run a second basic unit test successfully', () => {
    assert.strictEqual(1 + 1, 2, 'Math works');
  });
});
