// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {Semaphore, withConcurrencyLimit} from '../../utils/concurrency.ts';

describe('concurrency', () => {
  it('Semaphore respects the limit', async () => {
    const semaphore = new Semaphore(2);
    let active = 0;
    let maxActive = 0;

    const task = async () => {
      await semaphore.acquire();
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise(resolve => setTimeout(resolve, 10));
      active--;
      semaphore.release();
    };

    const tasks = Array.from({length: 5}, () => task());
    await Promise.all(tasks);

    assert.strictEqual(maxActive, 2);
    assert.strictEqual(active, 0);
  });

  it('withConcurrencyLimit respects the limit and returns results', async () => {
    let active = 0;
    let maxActive = 0;

    const task = async (id: number) => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise(resolve => setTimeout(resolve, 10));
      active--;
      return id * 2;
    };

    const tasks = Array.from({length: 5}, (_, i) => () => task(i));
    const results = await withConcurrencyLimit(tasks, 2);

    assert.strictEqual(maxActive, 2);
    assert.strictEqual(active, 0);
    assert.deepEqual(results, [0, 2, 4, 6, 8]);
  });
});
