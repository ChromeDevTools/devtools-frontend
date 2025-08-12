// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Mocha from 'mocha';

import {AsyncScope} from '../../conductor/async-scope.js';
import {dumpCollectedErrors} from '../../conductor/events.js';
import {ScreenshotError} from '../../conductor/screenshot-error.js';
import {TestConfig} from '../../conductor/test_config.js';

import {StateProvider} from './state-provider.js';

async function takeScreenshots(state: E2E.State): Promise<{inspectedPage?: string, devToolsPage?: string}> {
  try {
    const {devToolsPage, inspectedPage} = state;
    const inspectedPageScreenshot = await inspectedPage.screenshot();
    const devToolsPageScreenshot = await devToolsPage.screenshot();
    return {inspectedPage: inspectedPageScreenshot, devToolsPage: devToolsPageScreenshot};
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
  if (!state.browser.connected) {
    console.error('Browser was disconnected, skipping screenshots');
    return error;
  }

  console.error('Taking screenshots for the error:', error);
  if (!TestConfig.debug) {
    try {
      const screenshotTimeout = 5_000;
      let timer: ReturnType<typeof setTimeout>;
      const {inspectedPage, devToolsPage} = await Promise.race([
        takeScreenshots(state).then(result => {
          clearTimeout(timer);
          return result;
        }),
        new Promise(resolve => {
          timer = setTimeout(resolve, screenshotTimeout);
        }).then(() => {
          console.error(`Could not take screenshots within ${screenshotTimeout}ms.`);
          return {inspectedPage: undefined, devToolsPage: undefined};
        }),
      ]);
      return ScreenshotError.fromBase64Images(error, inspectedPage, devToolsPage);
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
   * We track the initial timeouts for each context if we reset it back
   * Mocha check timing of the full executed function and fails
   * the test.
   * https://github.com/mochajs/mocha/blob/main/lib/runnable.js#L307
   */
  static timeoutByContext = new WeakMap<Mocha.Context, number>();
  /**
   * We track the initial timeouts for each functions because mocha
   * does not reset test timeout for retries.
   */
  static timeoutByTestFunction = new WeakMap<Mocha.AsyncFunc, number>();

  #abortController = new AbortController();
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
    this.#abortController = new AbortController();
    AsyncScope.abortSignal = this.#abortController.signal;

    if (this.state) {
      // eslint-disable-next-line no-debugger
      debugger;  // If you're paused here while debugging, stepping into the next line will step into your test.
    }
    const start = performance.now();
    const testResult =
        await (this.state === undefined ?
                   this.fn.call(context) :
                   (this.fn as unknown as E2E.TestAsyncCallbackWithState).call(undefined, this.state.state));

    if (context.test) {
      (context.test as Mocha.Test).realDuration = Math.ceil(performance.now() - start);
    }

    return testResult;
  }

  async #clearState() {
    // State can be cleaned up after testPromise is finished,
    // including all error and timeout handling that still might rely
    // on the browserContext and pages.
    try {
      if (this.state?.state.browser.connected) {
        await this.state?.browsingContext.close();
      }
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

  #setupTimeout(context: Mocha.Context) {
    this.originalContextTimeout = InstrumentedTestFunction.timeoutByContext.get(context) ?? context.timeout();
    this.actualTimeout = InstrumentedTestFunction.timeoutByTestFunction.get(this.fn) ?? this.originalContextTimeout;
    InstrumentedTestFunction.timeoutByContext.set(context, this.originalContextTimeout);
    InstrumentedTestFunction.timeoutByTestFunction.set(this.fn, this.actualTimeout);
    // Disable mocha test timeout.
    // This way we rely only on our timeouts
    context.timeout(0);
  }

  async #executeWithTimeout(context: Mocha.Context) {
    // This needs to be the first thing we do
    // Else we may hit Mocha's timeouts
    this.#setupTimeout(context);
    // Get the state before starting the test timeouts
    this.state = this.suite ? await StateProvider.instance.getState(this.suite) : undefined;

    let cleanupTimeoutPromise: (() => void)|undefined = undefined;
    let timeoutPromise: Promise<never>|undefined = undefined;

    const executionPromise = this.#executeTest(context);

    if (this.actualTimeout !== 0) {
      timeoutPromise = new Promise<never>((_, reject) => {
        const timeout = setTimeout(async () => {
          reject(this.#buildErrorFromTimedoutScopeStacks(context));
        }, this.actualTimeout);
        cleanupTimeoutPromise = () => {
          clearTimeout(timeout);
          // Don't keep the Promise as pending
          reject();
        };
      });
    }
    const racePromise = timeoutPromise ? Promise.race([executionPromise, timeoutPromise]) : executionPromise;

    return await racePromise
        .then(
            () => {
              this.#abortController.abort();
              AsyncScope.abortSignal = undefined;
            },
            async err => {
              this.#abortController.abort();
              AsyncScope.abortSignal = undefined;
              throw await finalizeTestError(this.state, err);
            })
        .finally(async () => {
          cleanupTimeoutPromise?.();
          await this.#clearState();
          // Under some situations we report error when
          // we disconnect CDP sessions,
          // because of this we want to keep this last
          // else it will report the error for the next test
          dumpCollectedErrors();
        });
  }

  static instrument(fn: Mocha.AsyncFunc, label: string, suite?: Mocha.Suite) {
    const test = new InstrumentedTestFunction(fn, label, suite);
    return async function(this: Mocha.Context) {
      return await test.#executeWithTimeout(this);
    };
  }
}
