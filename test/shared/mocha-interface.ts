// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Mocha from 'mocha';
// @ts-expect-error
import * as commonInterface from 'mocha/lib/interfaces/common.js';
import * as Path from 'path';

import {getBrowserAndPages} from '../conductor/puppeteer-state.js';
import {TestConfig} from '../conductor/test_config.js';
import {ScreenshotError} from '../shared/screenshot-error.js';

import {AsyncScope} from './async-scope.js';
import {platform, type Platform} from './helper.js';

type SuiteFunction = ((this: Mocha.Suite) => void)|undefined;
type ExclusiveSuiteFunction = (this: Mocha.Suite) => void;

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
  if (!TestConfig.debug) {
    const {target, frontend} = await takeScreenshots();
    return ScreenshotError.fromBase64Images(error, target, frontend);
  }
  return error;
}

function makeInstrumentedTestFunction(fn: Mocha.AsyncFunc) {
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
    const promise = (async () => fn.call(this))();
    const timeout = this.timeout();
    // Disable test timeout.
    this.timeout(0);
    const actualTimeout = timeout;
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
      const err = new Error('Test timed out');
      if (stacks.length > 0) {
        const msg = `Pending async operations during timeout:\n${stacks.join('\n\n')}`;
        err.cause = new Error(msg);
      }
      rejecter(await createScreenshotError(err));
    }, actualTimeout) : 0;
    promise
        .then(
            resolver,
            async err => {
              // Suppress errors after the test was aborted.
              if (abortController.signal.aborted) {
                return;
              }
              rejecter(await createScreenshotError(err));
            })
        .finally(() => {
          clearTimeout(t);
        });
    return testPromise;
  };
}

function devtoolsTestInterface(suite: Mocha.Suite) {
  const suites: [Mocha.Suite] = [suite];
  suite.on(
      Mocha.Suite.constants.EVENT_FILE_PRE_REQUIRE,
      function(context, file, mocha) {
        const common =
            // Different module outputs between tsc and esbuild.
            ('default' in commonInterface ? commonInterface.default : commonInterface)(suites, context, mocha);
        // @ts-expect-error Custom interface.
        context['before'] = function before(fn: Mocha.AsyncFunc) {
          return common.before(makeInstrumentedTestFunction(fn));
        };
        // @ts-expect-error Custom interface.
        context['after'] = function after(fn: Mocha.AsyncFunc) {
          return common.after(makeInstrumentedTestFunction(fn));
        };
        // @ts-expect-error Custom interface.
        context['beforeEach'] = function beforeEach(fn: Mocha.AsyncFunc) {
          return common.beforeEach(makeInstrumentedTestFunction(fn));
        };
        // @ts-expect-error Custom interface.
        context['afterEach'] = function afterEach(fn: Mocha.AsyncFunc) {
          return common.afterEach(makeInstrumentedTestFunction(fn));
        };
        if (mocha.options.delay) {
          context['run'] = common.runWithSuite(suite);
        }
        function describeTitle(title: string) {
          const parsedPath = Path.parse(file);
          const directories = parsedPath.dir.split(Path.sep);
          const index = directories.lastIndexOf('e2e');
          let prefix = parsedPath.name;
          if (index >= 0) {
            prefix = [...directories.slice(index + 1), `${parsedPath.name}.ts`].join('/');
          }
          if (title.includes(prefix)) {
            return title;
          }
          return `${prefix}: ${title}`;
        }
        function describe(title: string, fn: SuiteFunction) {
          return common.suite.create({
            title: describeTitle(title),
            file: file,
            fn: fn,
          });
        }
        describe.only = function(title: string, fn: ExclusiveSuiteFunction) {
          return common.suite.only({
            title: describeTitle(title),
            file: file,
            fn: fn,
          });
        };
        describe.skip = function(title: string, fn: SuiteFunction) {
          return common.suite.skip({
            title: describeTitle(title),
            file: file,
            fn: fn,
          });
        };
        // @ts-expect-error Custom interface.
        context['describe'] = describe;
        function iterationSuffix(iteration: number): string {
          if (iteration === 0) {
            return '';
          }
          return ` (#${iteration})`;
        }
        function createTest(title: string, fn?: Mocha.AsyncFunc) {
          const suite = suites[0];
          const test = new Mocha.Test(title, suite.isPending() || !fn ? undefined : makeInstrumentedTestFunction(fn));
          test.file = file;
          suite.addTest(test);
          return test;
        }
        // Regular mocha it returns the test instance.
        // It is not possible with TestConfig.repetitions.
        const it = function(title: string, fn?: Mocha.AsyncFunc) {
          for (let i = 0; i < TestConfig.repetitions; i++) {
            const iterationTitle = title + iterationSuffix(i);
            createTest(iterationTitle, fn);
          }
        };
        // @ts-expect-error Custom interface.
        context.it = it;
        it.skip = function(title: string, _fn: Mocha.AsyncFunc) {
          // no fn to skip.
          return createTest(title);
        };
        it.only = function(title: string, fn: Mocha.AsyncFunc) {
          for (let i = 0; i < TestConfig.repetitions; i++) {
            const iterationTitle = title + iterationSuffix(i);
            common.test.only(mocha, createTest(iterationTitle, fn));
          }
        };
        it.skipOnPlatforms = function(platforms: Array<Platform>, title: string, fn: Mocha.AsyncFunc) {
          const shouldSkip = platforms.includes(platform);
          if (shouldSkip) {
            return context.it.skip(title);
          }
          return context.it(title, fn);
        };
        function screenshotTestTitle(title: string) {
          return '[screenshot]: ' + title;
        }
        // @ts-expect-error Custom interface.
        context.itScreenshot = function(title: string, fn: Mocha.AsyncFunc) {
          return context.it(screenshotTestTitle(title), fn);
        };
        // @ts-expect-error Custom interface.
        context.itScreenshot.skipOnPlatforms = function(
            platforms: Array<Platform>, title: string, fn: Mocha.AsyncFunc) {
          return context.it.skipOnPlatforms(platforms, screenshotTestTitle(title), fn);
        };
        // @ts-expect-error Custom interface.
        context.itScreenshot.skip = function(title: string) {
          return context.it.skip(screenshotTestTitle(title));
        };
      },
  );
}

devtoolsTestInterface.description = 'DevTools test interface';

module.exports = devtoolsTestInterface;
