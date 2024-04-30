// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../core/sdk/sdk.js';
import type * as Types from '../types/types.js';

export async function forNewRecording(recordStartTime?: number): Promise<Types.File.MetaData> {
  try {
    const cpuThrottlingManager = SDK.CPUThrottlingManager.CPUThrottlingManager.instance();

    // If the CPU Throttling manager has yet to have its primary page target
    // set, it will block on the call to get the current hardware concurrency
    // until it does. At this point where the user has recorded a trace, that
    // target should have been set. So if it doesn't have it set, we instead
    // just bail and don't store the hardware concurrency (this is only
    // metadata, not mission critical information).
    // We also race this call against a 1s timeout, because sometimes this call
    // can hang (unsure exactly why) and we do not want to block parsing for
    // too long as a result.
    function getConcurrencyOrTimeout(): Promise<number|undefined> {
      return Promise.race([
        SDK.CPUThrottlingManager.CPUThrottlingManager.instance().getHardwareConcurrency(),
        new Promise<undefined>(resolve => {
          setTimeout(() => resolve(undefined), 1_000);
        }),
      ]);
    }

    const hardwareConcurrency =
        cpuThrottlingManager.hasPrimaryPageTargetSet() ? await getConcurrencyOrTimeout() : undefined;
    const cpuThrottling = SDK.CPUThrottlingManager.CPUThrottlingManager.instance().cpuThrottlingRate();
    const networkConditions = SDK.NetworkManager.MultitargetNetworkManager.instance().networkConditions();
    const networkTitle =
        typeof networkConditions.title === 'function' ? networkConditions.title() : networkConditions.title;

    return {
      source: 'DevTools',
      startTime: recordStartTime ? new Date(recordStartTime).toJSON() : undefined,  // ISO-8601 timestamp
      cpuThrottling,
      networkThrottling: networkTitle,
      hardwareConcurrency,
    };
  } catch {
    // If anything went wrong, it does not really matter. The impact is that we
    // will not save the metadata when we save the trace to disk, but that is
    // not really important, so just return empty object and move on
    return {};
  }
}
