// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Mocha from 'mocha';

import {AsyncScope} from './async-scope.js';
import type {Platform} from './platform.js';
import {getBrowserAndPages} from './puppeteer-state.js';
import {ScreenshotError} from './screenshot-error.js';
import {TestConfig} from './test_config.js';

declare global {
  namespace Mocha {
    export interface TestFunction {
      skipOnPlatforms: (platforms: Platform[], title: string, fn: Mocha.AsyncFunc) => void;
    }
  }
}

async function takeScreenshots(): Promise<{target?: string, frontend?: string}> {
  try {
    const {target, frontend} = getBrowserAndPages();
    const opts = {
      encoding: 'base64' as 'base64',
    };
    await target.bringToFront();
    const targetScreenshot = await target.screenshot(opts);
    await frontend.bringToFront();
    const frontendScreenshot = await frontend.screenshot(opts);
    return {target: targetScreenshot, frontend: frontendScreenshot};
  } catch (err) {
    console.error('Error taking a screenshot', err);
    return {};
  }
}

async function createScreenshotError(error: Error): Promise<Error> {
  console.error('Taking screenshots for the error:', error);
  if (!TestConfig.debug) {
    try {
      const screenshotTimeout = 5_000;
      let timer: NodeJS.Timeout;
      const {target, frontend} = await Promise.race([
        takeScreenshots().then(result => {
          clearTimeout(timer);
          return result;
        }),
        new Promise(resolve => {
          timer = setTimeout(resolve, screenshotTimeout);
        }).then(() => {
          console.error(`Could not take screenshots within ${screenshotTimeout}ms.`);
          return {target: undefined, frontend: undefined};
        }),
      ]);
      return ScreenshotError.fromBase64Images(error, target, frontend);
    } catch (e) {
      console.error('Unexpected error saving screenshots', e);
      return e;
    }
  }
  return error;
}

/**
 * We track the initial timeouts for each functions because mocha
 * does not reset test timeout for retries.
 */
const timeoutByTestFunction = new WeakMap<Mocha.AsyncFunc, number>();

export function makeInstrumentedTestFunction(fn: Mocha.AsyncFunc, label: string) {
  return async function testFunction(this: Mocha.Context) {
    const abortController = new AbortController();
    const {resolve, reject, promise: testPromise} = Promise.withResolvers();
    // AbortSignal for the current test function.
    AsyncScope.abortSignal = abortController.signal;
    // Promisify the function in case it is sync.
    const promise = (async () => await fn.call(this))();
    const actualTimeout = timeoutByTestFunction.get(fn) ?? this.timeout();
    timeoutByTestFunction.set(fn, actualTimeout);
    // Disable mocha test timeout.
    this.timeout(0);
    const t = actualTimeout !== 0 ? setTimeout(async () => {
      abortController.abort();
      const stacks = [];
      const scopes = AsyncScope.scopes;
      for (const scope of scopes.values()) {
        const {descriptions, stack} = scope;
        if (stack) {
          const stepDescription = descriptions ? `${descriptions.join(' > ')}:\n` : '';
          stacks.push(`${stepDescription}${stack.join('\n')}\n`);
        }
      }
      const err = new Error(`A test function (${label}) for "${this.test?.title}" timed out (${actualTimeout} ms)`);
      if (stacks.length > 0) {
        const msg = `Pending async operations during timeout:\n${stacks.join('\n\n')}`;
        err.cause = new Error(msg);
      }
      reject(await createScreenshotError(err));
    }, actualTimeout) : 0;
    promise
        .then(
            resolve,
            async err => {
              // Suppress errors after the test was aborted.
              if (abortController.signal.aborted) {
                return;
              }
              if (err instanceof ScreenshotError) {
                reject(err);
                return;
              }
              reject(await createScreenshotError(err));
            })
        .finally(() => {
          clearTimeout(t);
        });
    return await testPromise;
  };
}
