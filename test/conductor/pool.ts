// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// use require here due to
// https://github.com/evanw/esbuild/issues/587#issuecomment-901397213
import puppeteer = require('puppeteer-core');

import {DevToolsFrontendTab} from './frontend_tab.js';
import {TargetTab} from './target_tab.js';

interface FrontendTargetTabs {
  frontend: DevToolsFrontendTab;
  target: TargetTab;
}

export interface FrontedTargetPoolOptions {
  browser: puppeteer.Browser;
  testServerPort: number;
  /**
   * Defaults to FrontendTargetPool.POOL_SIZE.
   * Setting `poolSize` to 0 will create target/frontend pairs on-demand.
   */
  poolSize?: number;
}

/**
 * A pool of DevTools frontend tab plus target tab pairs. Every time a pair
 * is taken from the pool, the pool will automatically prepare another pair.
 *
 * Tab pairs are not intended to be reused and its the consumer's responsibility
 * to clean them up properly.
 */
export class FrontendTargetPool {
  private static readonly POOL_SIZE = 5;

  #pool = new Pool<FrontendTargetTabs>();
  #browser: puppeteer.Browser;
  #testServerPort: number;

  private constructor(browser: puppeteer.Browser, testServerPort: number) {
    this.#browser = browser;
    this.#testServerPort = testServerPort;
  }

  /** Returns a pool with `options.poolSize` tab pairs ready to go. */
  static create(options: FrontedTargetPoolOptions): FrontendTargetPool {
    const {browser, testServerPort, poolSize = FrontendTargetPool.POOL_SIZE} = options;

    const tabPool = new FrontendTargetPool(browser, testServerPort);
    for (let i = 0; i < poolSize; ++i) {
      void tabPool.addTabPairToPool();
    }
    return tabPool;
  }

  private async addTabPairToPool(): Promise<void> {
    const target = await TargetTab.create(this.#browser);
    const frontend = await DevToolsFrontendTab.create(
        {browser: this.#browser, testServerPort: this.#testServerPort, targetId: target.targetId()});
    this.#pool.put({target, frontend});
  }

  async takeTabPair(): Promise<FrontendTargetTabs> {
    const pair = this.#pool.take();

    // We took a pair, so lets queue up the creation of a fresh pair.
    // It's important that we do not block here, the fresh pair is prepared
    // in the background.
    // Also note that this approach allows a pool size of 0. For every
    // `takeTabPair`, we call `addTabPairToPool`. The resulting pair is then
    // used to resolve the `pair` promise of the `takeTabPair` call.
    void this.addTabPairToPool();

    return pair;
  }
}

/**
 * A simple Promise-based pool. Esentially a queue.
 *
 * When the pool is empty, consumers get a promise that resolves as soon as
 * the pool is refilled.
 */
export class Pool<T> {
  #pool: T[] = [];
  #queue: Array<(value: T) => void> = [];

  put(value: T) {
    if (this.#queue.length > 0) {
      const waitee = this.#queue.shift() as (value: T) => void;
      waitee(value);
      return;
    }

    this.#pool.push(value);
  }

  take(): Promise<T> {
    if (this.#pool.length > 0) {
      const value = this.#pool.shift() as T;
      return Promise.resolve(value);
    }

    return new Promise(resolve => {
      this.#queue.push(resolve);
    });
  }
}
