// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Mocha from 'mocha';
import type {CommonFunctions, CreateOptions, SuiteFunctions, TestFunctions} from 'mocha/lib/interfaces/common';
// @ts-expect-error
import * as commonInterface from 'mocha/lib/interfaces/common.js';

import {
  DefaultPuppeteerStateProvider,
  InstrumentedTestFunction,
  type TestCallback,
  type TestStateProvider,
} from './mocha-interface-helpers.js';

type SuiteFunction = ((this: Mocha.Suite) => void)|undefined;

export interface MochaInterfaceOptions<TState = unknown, TSuiteSettings = unknown> {
  description: string;
  stateProvider?: TestStateProvider<TState, TSuiteSettings>;
}

export interface CustomItFunction<TState> {
  (title: string, fn?: TestCallback<TState>|Mocha.AsyncFunc): Mocha.Test;
  skip: (title: string, _fn?: TestCallback<TState>|Mocha.AsyncFunc) => Mocha.Test;
  only: (title: string, fn?: TestCallback<TState>|Mocha.AsyncFunc) => Mocha.Test;
}

export interface CustomDescribeFunction {
  (title: string, fn?: (this: Mocha.Suite) => void): Mocha.Suite;
  only: (title: string, fn?: (this: Mocha.Suite) => void) => Mocha.Suite;
  skip: (title: string, fn?: (this: Mocha.Suite) => void) => Mocha.Suite;
}

export interface CustomMochaGlobals<TState, TSuiteSettings> {
  describe: CustomDescribeFunction;
  setup?: (settings: TSuiteSettings) => void;
  it: CustomItFunction<TState>;
  before?: Mocha.HookFunction;
  after?: Mocha.HookFunction;
  beforeEach?: Mocha.HookFunction;
  afterEach?: Mocha.HookFunction;
  run?: () => void;
}

export function createMochaInterface<TState = unknown, TSuiteSettings = unknown>(
    options: MochaInterfaceOptions<TState, TSuiteSettings>): {
  (rootSuite: Mocha.Suite): void,
  description: string,
} {
  const devtoolsTestInterface = function(rootSuite: Mocha.Suite): void {
    let defaultImplementation: CommonFunctions;
    let mochaGlobals: CustomMochaGlobals<TState, TSuiteSettings>;
    let mochaRoot: Mocha;

    rootSuite.on(
        Mocha.Suite.constants.EVENT_FILE_PRE_REQUIRE,
        (context: Mocha.MochaGlobals, file: string, mocha: Mocha) => {
          mochaGlobals = context as unknown as CustomMochaGlobals<TState, TSuiteSettings>;
          mochaRoot = mocha;
          // Different module outputs between tsc and esbuild.
          const defaultFactory = ('default' in commonInterface ? commonInterface.default : commonInterface);
          defaultImplementation = defaultFactory([rootSuite], context, mocha) as CommonFunctions;

          if (mocha.options.delay) {
            context.run = defaultImplementation.runWithSuite(rootSuite);
          }
          mochaGlobals.describe = customDescribe(defaultImplementation.suite, file);
        },
    );

    function customDescribe(suiteImplementation: SuiteFunctions, file: string): CustomDescribeFunction {
      function withAugmentedTitle(suiteFn: (opts: CreateOptions) => Mocha.Suite) {
        return function(title: string, describeBodyFn: SuiteFunction): Mocha.Suite {
          const suite = suiteFn({
            title,
            file,
            fn: function(this: Mocha.Suite) {
              const thisSuite = this;
              const parentDefinitions = {
                describe: mochaGlobals.describe,
                setup: mochaGlobals.setup,
                it: mochaGlobals.it,
              };
              mochaGlobals.describe = customDescribe(defaultImplementation.suite, file);
              if (options.stateProvider?.registerSuiteSettings) {
                mochaGlobals.setup = function(suiteSettings: TSuiteSettings) {
                  options.stateProvider!.registerSuiteSettings!(thisSuite, suiteSettings);
                };
              }
              mochaGlobals.it = customIt(defaultImplementation.test, thisSuite, thisSuite.file || '', mochaRoot,
                                         options.stateProvider);
              if (describeBodyFn) {
                describeBodyFn.call(thisSuite);
              }
              // Restore definitions so when we come back from a nested describe
              // we have the same definitions available as for the current block,
              // therefore correctly handling the next describe block that is at
              // the same level with this one.
              mochaGlobals.describe = parentDefinitions.describe;
              mochaGlobals.setup = parentDefinitions.setup;
              mochaGlobals.it = parentDefinitions.it;
            },
          });

          if (!suite.isPending() && options.stateProvider?.prepareSuite) {
            suite.beforeEach(async function(this: Mocha.Context) {
              this.timeout(0);
              await options.stateProvider!.prepareSuite!(suite);
            });
          }
          return suite;
        };
      }

      const describe =
          withAugmentedTitle(suiteImplementation.create.bind(suiteImplementation)) as CustomDescribeFunction;
      describe.only = withAugmentedTitle(suiteImplementation.only.bind(suiteImplementation));
      describe.skip = withAugmentedTitle(suiteImplementation.skip.bind(suiteImplementation));
      return describe;
    }
  };

  devtoolsTestInterface.description = options.description;
  return devtoolsTestInterface;
}

function customIt<TState>(
    testImplementation: TestFunctions,
    suite: Mocha.Suite,
    file: string,
    mocha: Mocha,
    stateProvider?: TestStateProvider<TState, never>,
    ): CustomItFunction<TState> {
  function createTest(title: string, itBodyFn?: TestCallback<TState>|Mocha.AsyncFunc): Mocha.Test {
    const test = new Mocha.Test(
        title,
        suite.isPending() || !itBodyFn ?
            undefined :
            InstrumentedTestFunction.instrument<TState>(itBodyFn, 'test', suite, stateProvider),
    );
    test.file = file;

    // Creates a proxy that changes the duration to return
    // our own timing.
    const proxyTest = new Proxy(test, {
      get(target, property, receiver) {
        if (property === 'duration' && target.realDuration) {
          return Reflect.get(target, 'realDuration', receiver) ?? Reflect.get(target, property, receiver);
        }
        return Reflect.get(target, property, receiver);
      },
    });

    suite.addTest(proxyTest);
    return proxyTest;
  }

  // Regular mocha it returns the test instance.
  const localIt: CustomItFunction<TState> = Object.assign(
      function(title: string, fn?: TestCallback<TState>|Mocha.AsyncFunc):
          Mocha.Test {
            return createTest(title, fn);
          },
      {
        skip: function(title: string, _fn?: TestCallback<TState>|Mocha.AsyncFunc): Mocha.Test {
          return createTest(title);
        },
        only: function(title: string, fn?: TestCallback<TState>|Mocha.AsyncFunc): Mocha.Test {
          return testImplementation.only(mocha, createTest(title, fn));
        },

      },
  );

  return localIt;
}

export const devtoolsTestInterface: {
  (rootSuite: Mocha.Suite): void,
  description: string,
} = createMochaInterface({
  description: 'DevTools test interface',
  stateProvider: DefaultPuppeteerStateProvider.instance,
});
