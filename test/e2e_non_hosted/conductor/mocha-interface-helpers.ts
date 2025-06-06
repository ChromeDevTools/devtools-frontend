// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Mocha from 'mocha';

import {AsyncScope} from '../../conductor/async-scope.js';
import {dumpCollectedErrors} from '../../conductor/events.js';
import {ScreenshotError} from '../../conductor/screenshot-error.js';
import {TestConfig} from '../../conductor/test_config.js';

import {StateProvider} from './state-provider.js';

async function takeScreenshots(state: E2E.State): Promise<{target?: string, frontend?: string}> {
  try {
    const {devToolsPage, inspectedPage} = state;
    const targetScreenshot = await inspectedPage.screenshot();
    const frontendScreenshot = await devToolsPage.screenshot();
    return {target: targetScreenshot, frontend: frontendScreenshot};
  } catch (err) {
    console.error('Error taking a screenshot', err);
    return {};
  }
}

/**
 * Produces the final test error and cleans up the test state. This
 * function should not be allowed to throw.
 */
async function finalizeTestError(
    state: Awaited<ReturnType<typeof StateProvider.instance.getState>>|undefined, error: Error): Promise<Error> {
  if (!state) {
    console.error('Missing browsing state. Skipping screenshot taking for the error:', error);
    return error;
  }
  if (error instanceof ScreenshotError) {
    return error;
  }
  return await screenshotError(state.state, error);
}

export async function screenshotError(state: E2E.State, error: Error) {
  console.error('Taking screenshots for the error:', error);
  if (!TestConfig.debug) {
    try {
      const screenshotTimeout = 5_000;
      let timer: ReturnType<typeof setTimeout>;
      const {target, frontend} = await Promise.race([
        takeScreenshots(state).then(result => {
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

export function makeInstrumentedTestFunction(fn: Mocha.AsyncFunc, label: string, suite?: Mocha.Suite) {
  return async function testFunction(this: Mocha.Context) {
    const abortController = new AbortController();
    const {promise: testPromise, resolve, reject} = Promise.withResolvers<unknown>();
    // AbortSignal for the current test function.
    AsyncScope.abortSignal = abortController.signal;
    let state: Awaited<ReturnType<typeof StateProvider.instance.getState>>|undefined;
    // Promisify the function in case it is sync.
    const promise = (async () => {
      state = suite ? await StateProvider.instance.getState(suite) : undefined;
      if (state) {
        // eslint-disable-next-line no-debugger
        debugger;  // If you're paused here while debugging, stepping into the next line will step into your test.
      }
      const testResult =
          await (state === undefined ? fn.call(this) :
                                       (fn as unknown as E2E.TestAsyncCallbackWithState).call(undefined, state.state));
      dumpCollectedErrors();
      return testResult;
    })();
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
          const stepDescription = descriptions.length > 0 ? `${descriptions.join(' > ')}:\n` : '';
          stacks.push(`${stepDescription}${stack.join('\n')}\n`);
        }
      }
      const err = new Error(`A test function (${label}) for "${this.test?.title}" timed out (${actualTimeout} ms)`);
      if (stacks.length > 0) {
        const msg = `Pending async operations during timeout:\n${stacks.join('\n\n')}`;
        err.cause = new Error(msg);
      }
      reject(await finalizeTestError(state, err));
    }, actualTimeout) : 0;
    promise
        .then(
            resolve,
            async err => {
              // Suppress errors after the test was aborted.
              if (abortController.signal.aborted) {
                return;
              }
              clearTimeout(t);
              reject(await finalizeTestError(state, err));
            })
        .finally(async () => {
          clearTimeout(t);
        });
    return await testPromise.finally(async () => {
      // State can be cleaned up after testPromise is finished,
      // including all error and timeout handling that still might rely
      // on the browserContext and pages.
      try {
        await state?.browsingContext.close();
      } catch (e) {
        console.error('Unexpected error during cleanup', e);
      }
    });
  };
}
