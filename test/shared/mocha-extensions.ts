// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as FS from 'fs';
import * as Mocha from 'mocha';
import * as Path from 'path';

import {getBrowserAndPages} from '../conductor/puppeteer-state.js';
import {ScreenshotError} from '../shared/screenshot-error.js';

import {AsyncScope} from './async-scope.js';
import {getEnvVar} from './config.js';
import {platform, type Platform} from './helper.js';

export {after, beforeEach} from 'mocha';

let didInitializeHtmlOutputFile = false;

function htmlEscape(raw: string) {
  return raw.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

export async function takeScreenshots(testName: string): Promise<{target?: string, frontend?: string}> {
  try {
    const {target, frontend} = getBrowserAndPages();
    const opts = {
      encoding: 'base64' as 'base64',
    };
    await target.bringToFront();
    const targetScreenshot = await target.screenshot(opts);
    await frontend.bringToFront();
    const frontendScreenshot = await frontend.screenshot(opts);
    const prefix = 'data:image/png;base64,';
    const screenshotFile = getEnvVar('HTML_OUTPUT_FILE');
    if (screenshotFile) {
      try {
        FS.appendFileSync(
            screenshotFile,
            `<div><h3>${htmlEscape(testName)}</h3><p>Target page screenshot</p><p><img src="${
                prefix + targetScreenshot}"/></p><p>Frontend screenshot</p><p><img src="${
                prefix + frontendScreenshot}"/></p></div>\n`);
        console.error(`Screenshots saved to "${screenshotFile}"`);
      } catch (err) {
        console.error(`Error saving to file "${screenshotFile}": `, err);
      }
    } else {
      console.error('Target page screenshot (copy the next line and open in the browser):');
      console.error(prefix + targetScreenshot);
      console.error('Frontend screenshot (copy the next line and open in the browser):');
      console.error(prefix + frontendScreenshot);
    }
    return {target: targetScreenshot, frontend: frontendScreenshot};
  } catch (err) {
    console.error('Error taking a screenshot', err);
    return {};
  }
}

function wrapSuiteFunction(fn: (this: Mocha.Suite) => void) {
  return function(this: Mocha.Suite): void {
    const hookCreationHook = (hook: Mocha.Hook): void => {
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
          return Path.join(...directories.slice(index + 1), `${parsedPath.name}.ts`);
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function timeoutHook(this: Mocha.Runnable, done: Mocha.Done|undefined, err?: any) {
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
  if (err && !getEnvVar('DEBUG_TEST') && !(err instanceof ScreenshotError)) {
    const {target, frontend} = await takeScreenshots(this.fullTitle());
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

const iterations = getEnvVar('ITERATIONS', 1);

function iterationSuffix(iteration: number): string {
  if (iteration === 0) {
    return '';
  }
  return ` (#${iteration})`;
}

export function makeCustomWrappedIt(namePrefix: string = '') {
  const newMochaItFunc = function(name: string, callback: MochaCallback) {
    for (let i = 0; i < iterations; i++) {
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
    for (let i = 0; i < iterations; i++) {
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

function initializeHtmlOutputFile() {
  if (didInitializeHtmlOutputFile) {
    return;
  }
  didInitializeHtmlOutputFile = true;
  const filename = getEnvVar('HTML_OUTPUT_FILE');

  if (filename) {
    // We can add styles or scripts or UI here, but for
    // now we will start with a blank file.
    FS.writeFileSync(filename, '');
  }
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
    initializeHtmlOutputFile();
    hookTestTimeout(test);

    if (callback.length === 0) {
      async function onError(this: unknown, err?: unknown) {
        if (err && !getEnvVar('DEBUG_TEST') && !(err instanceof ScreenshotError)) {
          const {target, frontend} = await takeScreenshots(name);
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
