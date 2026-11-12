// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

// Set if the harness force-runs a pending timer from a failed or timed-out
// test instead of letting it fire at its scheduled time.
let longTimerFired = false;

describe('Suite 1', () => {
  it('times out with pending promise and timer', async function() {
    this.timeout(50);
    setTimeout(() => {
      longTimerFired = true;
    }, 30_000);
    await new Promise(() => {});
  });

  it('fails pending activity check without aborting remaining tests', () => {
    void new Promise(() => {}).then(() => {});
  });
});

describe('Suite 2', () => {
  it('runs after timeout and pending activity failures', () => {
    assert.isFalse(longTimerFired, 'The 30s timer from the timed-out test was force-run early');
  });
});
