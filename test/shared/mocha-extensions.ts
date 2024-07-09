// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Mocha from 'mocha';
import * as Path from 'path';

import {getBrowserAndPages} from '../conductor/puppeteer-state.js';
import {TestConfig} from '../conductor/test_config.js';
import {ScreenshotError} from '../shared/screenshot-error.js';

import {AsyncScope} from './async-scope.js';
import {platform, type Platform, TIMEOUT_ERROR_MESSAGE} from './helper.js';

export {after, beforeEach} from 'mocha';

export async function takeScreenshots(): Promise<{target?: string, frontend?: string}> {
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

function wrapSuiteFunction(fn: (this: Mocha.Suite) => void) {
  return function(this: Mocha.Suite): void {
    const hookCreationHook = (hook: Mocha.Hook) => {
      const originalFn = hook.fn;
      if (!originalFn) {
        return;
      }
      hook.fn = function(this, args) {
        hookTestTimeout(hook);
        return originalFn.call(this, args);
      };
    };
    this.on('beforeEach', hookCreationHook);
    this.on('beforeAll', hookCreationHook);
    this.on('afterEach', hookCreationHook);
    this.on('afterAll', hookCreationHook);
    fn.call(this);
  };
}

export function wrapDescribe<ReturnT>(
    mochaFn: (title: string, fn: (this: Mocha.Suite) => void) => ReturnT, title: string,
    fn: (this: Mocha.Suite) => void): ReturnT {
  const originalFn = Error.prepareStackTrace;
  try {
    Error.prepareStackTrace = (err, stackTraces) => {
      if (stackTraces.length < 3) {
        return '<unknown>';
      }
      let fallback: string|undefined;
      for (let i = 2; i < stackTraces.length; ++i) {
        const filename = stackTraces[i].getFileName();
        if (!filename) {
          return fallback ?? '<unknown>';
        }
        const parsedPath = Path.parse(filename);
        const directories = parsedPath.dir.split(Path.sep);
        const index = directories.lastIndexOf('e2e');
        if (index >= 0) {
          return [...directories.slice(index + 1), `${parsedPath.name}.ts`].join('/');
        }
        if (!fallback) {
          fallback = parsedPath.name;
        }
      }
      return fallback;
    };
    const err = new Error();

    return mochaFn(`${err.stack}: ${title}`, wrapSuiteFunction(fn));
  } finally {
    Error.prepareStackTrace = originalFn;
  }
}

export function describe(title: string, fn: (this: Mocha.Suite) => void) {
  return wrapDescribe(Mocha.describe, title, fn);
}

describe.only = function(title: string, fn: (this: Mocha.Suite) => void) {
  return wrapDescribe(Mocha.describe.only, title, fn);
};

describe.skip = function(title: string, fn: (this: Mocha.Suite) => void) {
  return wrapDescribe(Mocha.describe.skip, title, fn);
};

describe.skipOnPlatforms = function(platforms: Array<Platform>, name: string, fn: (this: Mocha.Suite) => void) {
  const shouldSkip = platforms.includes(platform);
  if (shouldSkip) {
    wrapDescribe(Mocha.describe.skip, name, fn);
  } else {
    describe(name, fn);
  }
};

async function timeoutHook(this: Mocha.Runnable, done: Mocha.Done|undefined, err?: unknown) {
  function* joinStacks() {
    const scopes = AsyncScope.scopes;
    if (scopes.size === 0) {
      return;
    }
    for (const scope of scopes.values()) {
      const {descriptions, stack} = scope;
      scope.setCanceled();
      if (stack) {
        const stepDescription = descriptions ? `${descriptions.join(' > ')}:\n` : '';
        yield `${stepDescription}${stack.join('\n')}\n`;
      }
    }
  }

  const stacks = Array.from(joinStacks());
  if (stacks.length > 0) {
    const msg = `Pending async operations during timeout:\n${stacks.join('\n\n')}`;
    console.error(msg);

    if (err && err instanceof Error) {
      err.cause = new Error(msg);
    }
  }
  if (err && !TestConfig.debug && !(err instanceof ScreenshotError)) {
    const {target, frontend} = await takeScreenshots();
    err = ScreenshotError.fromBase64Images(err, target, frontend);
  }
  if (done) {
    // This workaround is needed to allow timeoutHook to be async.
    this.timedOut = false;
    done(err);
    this.timedOut = true;
  }
}

export const it = makeCustomWrappedIt();

type MochaCallback = Mocha.Func|Mocha.AsyncFunc;

function iterationSuffix(iteration: number): string {
  if (iteration === 0) {
    return '';
  }
  return ` (#${iteration})`;
}

export function makeCustomWrappedIt(namePrefix: string = '') {
  const newMochaItFunc = function(name: string, callback: MochaCallback) {
    for (let i = 0; i < TestConfig.repetitions; i++) {
      const testName = namePrefix ? `${namePrefix} ${name}` : name;
      wrapMochaCall(Mocha.it, testName + iterationSuffix(i), callback);
    }
  };

  newMochaItFunc.skip = function(name: string, callback: Mocha.Func|Mocha.AsyncFunc) {
    wrapMochaCall(Mocha.it.skip, name, callback);
  };

  newMochaItFunc.skipOnPlatforms = function(
      platforms: Array<Platform>, name: string, callback: Mocha.Func|Mocha.AsyncFunc) {
    const shouldSkip = platforms.includes(platform);
    if (shouldSkip) {
      wrapMochaCall(Mocha.it.skip, name, callback);
    } else {
      it(name, callback);
    }
  };

  newMochaItFunc.only = function(name: string, callback: Mocha.Func|Mocha.AsyncFunc) {
    for (let i = 0; i < TestConfig.repetitions; i++) {
      wrapMochaCall(Mocha.it.only, name + iterationSuffix(i), callback);
    }
  };

  newMochaItFunc.repeat = function(repeat: number, name: string, callback: Mocha.Func|Mocha.AsyncFunc) {
    for (let i = 0; i < repeat; i++) {
      wrapMochaCall(Mocha.it.only, name, callback);
    }
  };

  return newMochaItFunc;
}

function hookTestTimeout(test?: Mocha.Runnable) {
  if (test) {
    const originalDone = test.callback;
    test.callback = timeoutHook.bind(test, originalDone);
    // If a timeout is already scheduled, reset it to install our new hook
    test.resetTimeout();
  }
}

function wrapMochaCall(
    call: Mocha.TestFunction|Mocha.PendingTestFunction|Mocha.ExclusiveTestFunction, name: string,
    callback: Mocha.Func|Mocha.AsyncFunc) {
  const test = call(name, function(done: Mocha.Done) {
    // If this is a test retry, the current test will be a clone of the original test, and
    // we need to find it and hook that instead of the original test.
    const currentTest = test?.ctx?.test ?? test;
    hookTestTimeout(currentTest);

    if (callback.length === 0) {
      async function onError(this: unknown, err?: unknown) {
        const isTimeoutError = err instanceof Error && err.message?.includes(TIMEOUT_ERROR_MESSAGE);
        if (err && !TestConfig.debug && !(err instanceof ScreenshotError) && !isTimeoutError) {
          const {target, frontend} = await takeScreenshots();
          err = ScreenshotError.fromBase64Images(err, target, frontend);
        }
        done.call(this, err);
      }
      (callback as Mocha.AsyncFunc).bind(this)().then(onError, onError);
    } else {
      (callback as Mocha.Func).bind(this)(done);
    }
  });
}

export const itScreenshot = makeCustomWrappedIt('[screenshot]:');
