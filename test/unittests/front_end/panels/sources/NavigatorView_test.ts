// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import * as Sources from '../../../../../front_end/panels/sources/sources.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';

describeWithMockConnection('Navigator tree throttler', () => {
  class MockTimeoutControl implements Sources.NavigatorView.TimeoutControlForTest {
    callback: (() => void)|undefined = undefined;

    setTimeout(callback: () => void, _timeout: number): number {
      this.callback = callback;
      return 1;
    }

    clearTimeout(id: number|undefined) {
      console.assert(!id || id === 1);
      this.callback = undefined;
    }

    tick(): void {
      assertNotNullOrUndefined(this.callback);
      this.callback();
      this.callback = undefined;
    }

    timeoutActive(): boolean {
      return Boolean(this.callback);
    }
  }

  it('flushes on true condition', async () => {
    let finishedTaskCount: number = 0;
    const timeoutControl = new MockTimeoutControl();
    const throttler = Sources.NavigatorView.makeThrottler(200, () => true, timeoutControl);

    throttler(() => {
      finishedTaskCount++;
    });

    assert.strictEqual(finishedTaskCount, 1);
  });

  it('uses timeout on false condition', async () => {
    let finishedTaskCount: number = 0;
    const timeoutControl = new MockTimeoutControl();
    const throttler = Sources.NavigatorView.makeThrottler(200, () => false, timeoutControl);

    throttler(() => {
      finishedTaskCount++;
    });

    assert.strictEqual(finishedTaskCount, 0);
    assert.isTrue(timeoutControl.timeoutActive());
    timeoutControl.tick();
    assert.isFalse(timeoutControl.timeoutActive());
    assert.strictEqual(finishedTaskCount, 1);
  });

  it('flushes after condition becomes true', async () => {
    let finishedTaskCount: number = 0;
    const timeoutControl = new MockTimeoutControl();
    const throttler = Sources.NavigatorView.makeThrottler(200, (tasks: Sources.NavigatorView.ThrottleTask[]) => {
      return tasks.length >= 2;
    }, timeoutControl);

    // Submit a task. The task is only queued (because the flushing condition only triggers after two tasks).
    throttler(() => {
      finishedTaskCount++;
    });

    assert.strictEqual(finishedTaskCount, 0);
    assert.isTrue(timeoutControl.timeoutActive());

    // Once we submit a second task, the throttler flushes.
    throttler(() => {
      finishedTaskCount++;
    });

    // Check that the throttler flushes and deactivates the timeout.
    assert.strictEqual(finishedTaskCount, 2);
    assert.isFalse(timeoutControl.timeoutActive());
  });
});
