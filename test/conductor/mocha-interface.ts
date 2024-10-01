// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Mocha from 'mocha';
// @ts-expect-error
import * as commonInterface from 'mocha/lib/interfaces/common.js';  // eslint-disable-line rulesdir/es_modules_import
import * as Path from 'path';

import {makeInstrumentedTestFunction, platform, type Platform} from './mocha-interface-helpers.js';
import {TestConfig} from './test_config.js';

type SuiteFunction = ((this: Mocha.Suite) => void)|undefined;
type ExclusiveSuiteFunction = (this: Mocha.Suite) => void;

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
          return common.before(makeInstrumentedTestFunction(fn, 'before'));
        };
        // @ts-expect-error Custom interface.
        context['after'] = function after(fn: Mocha.AsyncFunc) {
          return common.after(makeInstrumentedTestFunction(fn, 'after'));
        };
        // @ts-expect-error Custom interface.
        context['beforeEach'] = function beforeEach(fn: Mocha.AsyncFunc) {
          return common.beforeEach(makeInstrumentedTestFunction(fn, 'beforeEach'));
        };
        // @ts-expect-error Custom interface.
        context['afterEach'] = function afterEach(fn: Mocha.AsyncFunc) {
          return common.afterEach(makeInstrumentedTestFunction(fn, 'afterEach'));
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
            file,
            fn,
          });
        }
        describe.only = function(title: string, fn: ExclusiveSuiteFunction) {
          return common.suite.only({
            title: describeTitle(title),
            file,
            fn,
          });
        };
        describe.skip = function(title: string, fn: SuiteFunction) {
          return common.suite.skip({
            title: describeTitle(title),
            file,
            fn,
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
          const test =
              new Mocha.Test(title, suite.isPending() || !fn ? undefined : makeInstrumentedTestFunction(fn, 'test'));
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
