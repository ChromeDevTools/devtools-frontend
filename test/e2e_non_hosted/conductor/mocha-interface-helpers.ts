// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Mocha from 'mocha';

import {AsyncScope} from '../../conductor/async-scope.js';
import type {Platform} from '../../conductor/platform.js';
import {ScreenshotError} from '../../conductor/screenshot-error.js';
import {TestConfig} from '../../conductor/test_config.js';
import type {BrowserSettings, BrowserWrapper} from '../shared/browser-helper.js';
import type {DevToolsFronendPage, DevtoolsSettings} from '../shared/frontend-helper.js';
import type {InspectedPage} from '../shared/target-helper.js';
declare global {
  namespace Mocha {
    export interface TestFunction {
      (title: string, fn: TestCallbackWithState): void;

      skipOnPlatforms: (platforms: Platform[], title: string, fn: Mocha.AsyncFunc) => void;
    }
    export interface Suite {
      settings: SuiteSettings;
      state: State;
      browser: BrowserWrapper;
    }
  }
}

export type HarnessSettings = BrowserSettings&DevtoolsSettings;
export type SuiteSettings = Partial<HarnessSettings>;

export interface State {
  devToolsPage: DevToolsFronendPage;
  inspectedPage: InspectedPage;
  browser: BrowserWrapper;
}

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
export type TestCallbackWithState = (state: State) => PromiseLike<any>;

async function takeScreenshots(state: State): Promise<{target?: string, frontend?: string}> {
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

async function createScreenshotError(test: Mocha.Runnable|undefined, error: Error): Promise<Error> {
  if (!test?.parent?.state) {
    console.error('Missing browsing state. Unable to take screenshots for the error:', error);
    return error;
  }
  const sate = test.parent.state;
  console.error('Taking screenshots for the error:', error);
  if (!TestConfig.debug) {
    try {
      const screenshotTimeout = 5_000;
      let timer: NodeJS.Timeout;
      const {target, frontend} = await Promise.race([
        takeScreenshots(sate).then(result => {
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

export function makeInstrumentedTestFunction(fn: Mocha.AsyncFunc, label: string) {
  return async function testFunction(this: Mocha.Context) {
    const abortController = new AbortController();
    let resolver;
    let rejecter: (reason?: unknown) => void;
    const testPromise = new Promise((resolve, reject) => {
      resolver = resolve;
      rejecter = reject;
    });
    // AbortSignal for the current test function.
    AsyncScope.abortSignal = abortController.signal;
    // Promisify the function in case it is sync.
    const promise = (async () => await fn.call(this))();
    const actualTimeout = this.timeout();
    // Disable test timeout.
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
      const err = new Error(`A test function (${label}) for "${this.test?.title}" timed out`);
      if (stacks.length > 0) {
        const msg = `Pending async operations during timeout:\n${stacks.join('\n\n')}`;
        err.cause = new Error(msg);
      }
      rejecter(await createScreenshotError(this.test, err));
    }, actualTimeout) : 0;
    promise
        .then(
            resolver,
            async err => {
              // Suppress errors after the test was aborted.
              if (abortController.signal.aborted) {
                return;
              }
              rejecter(await createScreenshotError(this.test, err));
            })
        .finally(() => {
          clearTimeout(t);
          this.timeout(actualTimeout);
        });
    return await testPromise;
  };
}
