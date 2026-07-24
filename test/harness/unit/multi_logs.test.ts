// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

describe('multi_logs', () => {
  it('should log in first test', () => {
    // eslint-disable-next-line no-console
    console.log('HARNESS_UNIT_TEST_LOG_1');
    assert.strictEqual(1 + 1, 2, 'Math works');
  });

  it('should log in second test', () => {
    // eslint-disable-next-line no-console
    console.log('HARNESS_UNIT_TEST_LOG_2');
    assert.strictEqual(2 + 2, 4, 'Math works');
  });
});
