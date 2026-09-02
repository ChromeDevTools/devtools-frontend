// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Mocha from 'mocha';

import {AsyncScope} from './async-scope.js';
import {dumpCollectedErrors} from './events.js';
import {ScreenshotError} from './screenshot-error.js';
import {TestConfig} from './test_config.js';

declare global {
  namespace Mocha {
    export interface Test {
      realDuration?: number;
    }
  }
}

export interface TestStateProvider<TState = unknown, TSuiteSettings = unknown> {
  /** Register custom settings for a suite (e.g. via setup({ ... })) */
  registerSuiteSettings?: (suite: Mocha.Suite, settings: TSuiteSettings) => void;

  /** Prepare suite resources before tests run (e.g. launch/resolve browser for suite) */
  prepareSuite?: (suite: Mocha.Suite) => Promise<void>;

  /** Create/acquire the test state for an individual test execution */
  createState: (suite: Mocha.Suite) => Promise<TState>;

  /** Clean up the state after test execution finishes */
  cleanupState?: (state: TState) => Promise<void>;

  /** Handle or enhance error when a test fails (e.g. taking screenshots) */
  onTestError?: (state: TState|undefined, error: Error) => Promise<Error>;
}

export type TestCallback<TState = void> = (this: Mocha.Context|void, state: TState) => PromiseLike<unknown>;

export class InstrumentedTestFunction<TState = unknown> {
  /**
   * We track the initial timeouts for each context if we reset it back
   * Mocha check timing of the full executed function and fails
   * the test.
   * https://github.com/mochajs/mocha/blob/main/lib/runnable.js#L307
   */
  static timeoutByContext: WeakMap<Mocha.Context, number> = new WeakMap<Mocha.Context, number>();
  /**
   * We track the initial timeouts for each functions because mocha
   * does not reset test timeout for retries.
   */
  static timeoutByTestFunction: WeakMap<object, number> = new WeakMap<object, number>();

  #abortController = new AbortController();
  state: TState|undefined;
  fn: TestCallback<TState>|Mocha.AsyncFunc;
  label: string;
  suite?: Mocha.Suite;
  stateProvider?: TestStateProvider<TState, never>;
  actualTimeout = 0;
  originalContextTimeout = 0;

  private constructor(fn: TestCallback<TState>|Mocha.AsyncFunc, label: string, suite?: Mocha.Suite,
                      stateProvider?: TestStateProvider<TState, never>) {
    this.fn = fn;
    this.label = label;
    this.suite = suite;
    this.stateProvider = stateProvider;
  }

  async #executeTest(context: Mocha.Context) {
    this.#abortController = new AbortController();
    AsyncScope.abortSignal = this.#abortController.signal;

    if (this.state) {
      // eslint-disable-next-line no-debugger
      debugger;  // If you're paused here while debugging, stepping into the next line will step into your test.
    }
    const start = performance.now();
    const testResult = await (this.state === undefined ? (this.fn as Mocha.AsyncFunc).call(context) :
                                                         (this.fn as TestCallback<TState>).call(undefined, this.state));

    if (context.test) {
      (context.test as Mocha.Test).realDuration = Math.ceil(performance.now() - start);
    }

    return testResult;
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
    this.state = (this.suite && this.stateProvider) ? await this.stateProvider.createState(this.suite) : undefined;

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
              if (this.stateProvider?.onTestError) {
                err = await this.stateProvider.onTestError(this.state, err);
              }
              throw err;
            })
        .finally(async () => {
          cleanupTimeoutPromise?.();
          if (this.stateProvider?.cleanupState && this.state !== undefined) {
            try {
              await this.stateProvider.cleanupState(this.state);
            } catch (e) {
              console.error('Unexpected error during cleanup', e);
            }
          }
          dumpCollectedErrors();
        });
  }

  static instrument<TState = unknown>(fn: TestCallback<TState>|Mocha.AsyncFunc, label: string, suite?: Mocha.Suite,
                                      stateProvider?: TestStateProvider<TState, never>): Mocha.AsyncFunc {
    const test = new InstrumentedTestFunction<TState>(fn, label, suite, stateProvider);
    return async function(this: Mocha.Context) {
      return await test.#executeWithTimeout(this);
    };
  }
}

/**
 * Default state provider for conductor test suites that manage their browser pages
 * via puppeteer-state (such as extensions/cxx_debugging). Captures screenshots
 * on test failures or timeouts if active pages are registered.
 */
export class DefaultPuppeteerStateProvider implements TestStateProvider<unknown, unknown> {
  static instance: DefaultPuppeteerStateProvider = new DefaultPuppeteerStateProvider();

  async createState(): Promise<unknown> {
    return undefined;
  }

  async onTestError(_state: unknown, error: Error): Promise<Error> {
    if (error instanceof ScreenshotError || TestConfig.debug) {
      return error;
    }
    // TODO: Capture frontend and target screenshots.
    return error;
  }
}

export function makeInstrumentedTestFunction(fn: Mocha.AsyncFunc, label: string): Mocha.AsyncFunc {
  return InstrumentedTestFunction.instrument(fn, label, undefined, DefaultPuppeteerStateProvider.instance);
}
