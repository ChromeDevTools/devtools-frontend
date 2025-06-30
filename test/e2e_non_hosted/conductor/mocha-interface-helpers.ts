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
async function finalizeTestError(state: ExtendedState|undefined, error: Error): Promise<Error> {
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

type ExtendedState = Awaited<ReturnType<typeof StateProvider.instance.getState>>;

export class InstrumentedTestFunction {
  /**
   * We track the initial timeouts for each functions because mocha
   * does not reset test timeout for retries.
   */
  static timeoutByTestFunction = new WeakMap<Mocha.AsyncFunc, number>();

  abortController = new AbortController();
  state: ExtendedState|undefined;
  fn: Mocha.AsyncFunc;
  label: string;
  suite?: Mocha.Suite;
  actualTimeout = 0;
  originalContextTimeout = 0;

  private constructor(fn: Mocha.AsyncFunc, label: string, suite?: Mocha.Suite) {
    this.fn = fn;
    this.label = label;
    this.suite = suite;
  }

  async #executeTest(context: Mocha.Context) {
    AsyncScope.abortSignal = this.abortController.signal;
    this.state = this.suite ? await StateProvider.instance.getState(this.suite) : undefined;
    if (this.state) {
      // eslint-disable-next-line no-debugger
      debugger;  // If you're paused here while debugging, stepping into the next line will step into your test.
    }
    const testResult =
        await (this.state === undefined ?
                   this.fn.call(context) :
                   (this.fn as unknown as E2E.TestAsyncCallbackWithState).call(undefined, this.state.state));
    dumpCollectedErrors();
    return testResult;
  }

  async #clearState() {
    // State can be cleaned up after testPromise is finished,
    // including all error and timeout handling that still might rely
    // on the browserContext and pages.
    try {
      await this.state?.browsingContext.close();
    } catch (e) {
      console.error('Unexpected error during cleanup', e);
    }
  }

  #buildErrorFromTimedoutScopeStacks(context: Mocha.Context) {
    const stacks = [];
    const scopes = AsyncScope.scopes;
    for (const scope of scopes.values()) {
      const {descriptions, stack} = scope;
      if (stack) {
        const stepDescription = descriptions.length > 0 ? `${descriptions.join(' > ')}:\n` : '';
        stacks.push(`${stepDescription}${stack.join('\n')}\n`);
      }
    }
    const err =
        new Error(`A test function (${this.label}) for "${context.test?.title}" timed out (${this.actualTimeout} ms)`);
    if (stacks.length > 0) {
      const msg = `Pending async operations during timeout:\n${stacks.join('\n\n')}`;
      err.cause = new Error(msg);
    }
    return err;
  }

  async #timeoutHandler(context: Mocha.Context) {
    this.abortController.abort();
    const err = this.#buildErrorFromTimedoutScopeStacks(context);
    return await finalizeTestError(this.state, err);
  }

  #calculateTimeoutValue(context: Mocha.Context) {
    this.originalContextTimeout = context.timeout();
    this.actualTimeout = InstrumentedTestFunction.timeoutByTestFunction.get(this.fn) ?? this.originalContextTimeout;
    InstrumentedTestFunction.timeoutByTestFunction.set(this.fn, this.actualTimeout);
  }

  async #executeWithTimeout(context: Mocha.Context) {
    this.#calculateTimeoutValue(context);
    // Disable mocha test timeout.
    context.timeout(0);

    let timeout: NodeJS.Timeout|undefined = undefined;
    let timeoutPromise: Promise<never>|undefined = undefined;
    if (this.actualTimeout !== 0) {
      timeoutPromise = new Promise<never>((_, reject) => {
        timeout = setTimeout(async () => {
          reject(await this.#timeoutHandler(context));
        }, this.actualTimeout);
      });
    }
    const executionPromise = this.#executeTest(context).catch(async err => {
      clearTimeout(timeout);
      // Suppress errors after the test was aborted.
      if (this.abortController.signal.aborted) {
        return;
      }
      throw await finalizeTestError(this.state, err);
    });

    const racePromise = timeoutPromise ? Promise.race([executionPromise, timeoutPromise]) : executionPromise;

    return await racePromise.finally(async () => {
      clearTimeout(timeout);
      await this.#clearState();
      context.timeout(this.originalContextTimeout);
    });
  }

  static instrument(fn: Mocha.AsyncFunc, label: string, suite?: Mocha.Suite) {
    const test = new InstrumentedTestFunction(fn, label, suite);
    return async function(this: Mocha.Context) {
      return await test.#executeWithTimeout(this);
    };
  }
}
