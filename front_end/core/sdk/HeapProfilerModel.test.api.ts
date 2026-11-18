// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {describe, it} from '../../../test/api/mocha-interface.js';

import * as SDK from './sdk.js';

type SamplingHeapProfileNode =
    NonNullable<Awaited<ReturnType<SDK.HeapProfilerModel.HeapProfilerModel['stopSampling']>>>['head'];

function totalSize(node: SamplingHeapProfileNode): number {
  return node.children.reduce((acc, child) => acc + totalSize(child), node.selfSize);
}

describe('HeapProfilerModel API Test', () => {
  it('samples heap allocations and rejects stopping when not running', async ({inspectedPage, universe}) => {
    const primaryTarget = universe.targetManager.primaryPageTarget();
    assert.isNotNull(primaryTarget);
    const profiler = primaryTarget.model(SDK.HeapProfilerModel.HeapProfilerModel);
    assert.isNotNull(profiler);

    const startError = await profiler.startSampling();
    assert.isFalse(startError);

    try {
      await inspectedPage.evaluate(() => {
        (globalThis as {dump?: number[]}).dump = new Array(5e4).fill(42.42);
      });

      const profile = await profiler.stopSampling();
      assert.isNotNull(profile);

      const sampledSize = totalSize(profile.head);
      assert.isAbove(sampledSize, 320_000);
      assert.isBelow(sampledSize, 480_000);
    } finally {
      await inspectedPage.evaluate(() => {
        delete (globalThis as {dump?: number[]}).dump;
      });
    }

    let caughtError: unknown;
    try {
      await profiler.stopSampling();
    } catch (error) {
      caughtError = error;
    }
    assert.instanceOf(caughtError, Error);
    assert.strictEqual(caughtError.message, 'Sampling profiler is not running.');
  });
});
