// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import {describeWithRealConnection} from '../../helpers/RealConnection.js';

describeWithRealConnection('CPUThrottlingManager', () => {
  it('can get the current hardwareConcurrency.', async () => {
    const manager = SDK.CPUThrottlingManager.CPUThrottlingManager.instance();
    const concurrency = await manager.getHardwareConcurrency();
    assert.deepEqual(concurrency, navigator.hardwareConcurrency);
  });

  it('can set the current hardwareConcurrency.', async () => {
    const manager = SDK.CPUThrottlingManager.CPUThrottlingManager.instance();
    const nativeConcurrency = navigator.hardwareConcurrency;
    manager.setHardwareConcurrency(5);
    {
      const concurrency = await manager.getHardwareConcurrency();
      assert.deepEqual(concurrency, 5);
      assert.notDeepEqual(concurrency, nativeConcurrency);
    }
    {
      manager.setHardwareConcurrency(0);
      const concurrency = await manager.getHardwareConcurrency();
      assert.deepEqual(concurrency, 5);
    }
    {
      manager.setHardwareConcurrency(-1);
      const concurrency = await manager.getHardwareConcurrency();
      assert.deepEqual(concurrency, 5);
    }
    {
      manager.setHardwareConcurrency(2 * nativeConcurrency);
      const concurrency = await manager.getHardwareConcurrency();
      assert.deepEqual(concurrency, 2 * nativeConcurrency);
    }
  });
});
