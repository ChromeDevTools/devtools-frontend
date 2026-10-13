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
  type TimedTest,
} from './mocha-interface-helpers.js';

type SuiteBody = ((this: Mocha.Suite) => void)|undefined;

export interface MochaInterfaceOptions<TState = unknown, TSuiteSettings = unknown> {
  description: string;
  stateProvider?: TestStateProvider<TState, TSuiteSettings>;
}

export interface CustomItFunction<TState> {
  (title: string, fn?: TestCallback<TState>|Mocha.AsyncFunc): Mocha.Test;
  skip: (
      title: string,
      _fn?: TestCallback<TState>|Mocha.AsyncFunc,
      ) => Mocha.Test;
  only: (
      title: string,
      fn?: TestCallback<TState>|Mocha.AsyncFunc,
      ) => Mocha.Test;
}

export interface CustomDescribeFunction {
  (title: string, fn?: (this: Mocha.Suite) => void): Mocha.Suite;
  only: (title: string, fn?: (this: Mocha.Suite) => void) => Mocha.Suite;
  skip: (title: string, fn?: (this: Mocha.Suite) => void) => Mocha.Suite;
}

/**
 * The functions that are in effect while a test file or a suite body is being
 * evaluated. `it` and `setup` are only available inside of a `describe` body.
 */
export interface CustomMochaGlobals<TState, TSuiteSettings> {
  describe: CustomDescribeFunction;
  setup?: (settings: TSuiteSettings) => void;
  it?: CustomItFunction<TState>;
}

/**
 * The body of a test. Instead of the Mocha context it receives the state that
 * the state provider of the interface created for the test. The test finishes
 * once the returned value (usually a promise) settles.
 */
export type TestBody<TState> = (this: void, state: TState) => unknown;

/**
 * The `it` function of a DevTools test interface.
 */
export interface TestFunction<TState> {
  (title: string, fn?: TestBody<TState>): Mocha.Test;
  only: (title: string, fn?: TestBody<TState>) => Mocha.Test;
  skip: (title: string, fn?: TestBody<TState>) => Mocha.Test;
}

/**
 * The `describe` function of a DevTools test interface.
 */
export interface SuiteFunction {
  (title: string, fn?: (this: Mocha.Suite) => void): Mocha.Suite;
  only: (title: string, fn?: (this: Mocha.Suite) => void) => Mocha.Suite;
  skip: (title: string, fn?: (this: Mocha.Suite) => void) => Mocha.Suite;
}

/**
 * The `setup` function of a DevTools test interface. It registers settings for
 * the suite whose body is currently being evaluated.
 */
export type SetupFunction<TSuiteSettings> = (settings: TSuiteSettings) => void;

/**
 * A Mocha interface that is passed to Mocha as the `ui` option, together with
 * the functions to define tests for it.
 *
 * Test files import `describe`, `it` and `setup` from the module that created
 * the interface. Those functions forward to the definitions that are in effect
 * for the file or suite that Mocha is currently loading.
 */
export interface MochaInterface<TState, TSuiteSettings> {
  (rootSuite: Mocha.Suite): void;
  description: string;
  describe: SuiteFunction;
  it: TestFunction<TState>;
  setup: SetupFunction<TSuiteSettings>;
}

export function createMochaInterface<
  TState = unknown,
  TSuiteSettings = unknown,
>(
  options: MochaInterfaceOptions<TState, TSuiteSettings>,
): MochaInterface<TState, TSuiteSettings> {
  let mochaGlobals: CustomMochaGlobals<TState, TSuiteSettings>|undefined;

  function currentGlobals(name: string): CustomMochaGlobals<TState, TSuiteSettings> {
    if (!mochaGlobals) {
      throw new Error(`${name}() was called before Mocha loaded a test file with the ${
          options.description}. Pass the interface as the "ui" option to Mocha.`);
    }
    return mochaGlobals;
  }

  function currentIt(name: string): CustomItFunction<TState> {
    const itFn = currentGlobals(name).it;
    if (!itFn) {
      throw new Error(`${name}() can only be called inside of a describe() body.`);
    }
    return itFn;
  }

  const devtoolsTestInterface = function(rootSuite: Mocha.Suite): void {
    let defaultImplementation: CommonFunctions;
    let mochaRoot: Mocha;

    rootSuite.on(
        Mocha.Suite.constants.EVENT_FILE_PRE_REQUIRE,
        (context: Mocha.MochaGlobals, file: string, mocha: Mocha) => {
          mochaRoot = mocha;
          const defaultFactory = (
          'createCommon' in commonInterface
            ? commonInterface.createCommon
            : 'default' in commonInterface
              ? commonInterface.default
              : commonInterface
        ) as (
          suites: Mocha.Suite[],
          context: Mocha.MochaGlobals,
          mocha: Mocha,
        ) => CommonFunctions;
          defaultImplementation = defaultFactory([rootSuite], context, mocha);

          if (mocha.options.delay) {
            context.run = defaultImplementation.runWithSuite(rootSuite);
          }
          // The definitions are still installed on the Mocha `context` (the
          // global object) for the tests that don't import them yet.
          mochaGlobals = context as unknown as CustomMochaGlobals<TState, TSuiteSettings>;
          mochaGlobals.describe = customDescribe(
              defaultImplementation.suite,
              file,
          );
        },
    );

    function customDescribe(
        suiteImplementation: SuiteFunctions,
        file: string,
        ): CustomDescribeFunction {
      function withAugmentedTitle(
          suiteFn: (opts: CreateOptions) => Mocha.Suite,
      ) {
        return function(
                   title: string,
                   describeBodyFn: SuiteBody,
                   ): Mocha.Suite {
          const suite = suiteFn({
            title,
            file,
            fn: function(this: Mocha.Suite) {
              const thisSuite = this;
              const globals = currentGlobals('describe');
              const parentDefinitions = {
                describe: globals.describe,
                setup: globals.setup,
                it: globals.it,
              };
              globals.describe = customDescribe(
                  defaultImplementation.suite,
                  file,
              );
              if (options.stateProvider?.registerSuiteSettings) {
                globals.setup = function(suiteSettings: TSuiteSettings) {
                  options.stateProvider!.registerSuiteSettings!(
                      thisSuite,
                      suiteSettings,
                  );
                };
              }
              globals.it = customIt(
                  defaultImplementation.test,
                  thisSuite,
                  thisSuite.file || '',
                  mochaRoot,
                  options.stateProvider,
              );
              if (describeBodyFn) {
                describeBodyFn.call(thisSuite);
              }
              // Restore definitions so when we come back from a nested describe
              // we have the same definitions available as for the current block,
              // therefore correctly handling the next describe block that is at
              // the same level with this one.
              globals.describe = parentDefinitions.describe;
              globals.setup = parentDefinitions.setup;
              globals.it = parentDefinitions.it;
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

      const describeFn = withAugmentedTitle(
                             suiteImplementation.create.bind(suiteImplementation),
                             ) as CustomDescribeFunction;
      describeFn.only = withAugmentedTitle(
          suiteImplementation.only.bind(suiteImplementation),
      );
      describeFn.skip = withAugmentedTitle(
          suiteImplementation.skip.bind(suiteImplementation),
      );
      return describeFn;
    }
  };

  const describe: SuiteFunction = Object.assign(
      (title: string, fn?: SuiteBody) => currentGlobals('describe').describe(title, fn),
      {
        only: (title: string, fn?: SuiteBody) => currentGlobals('describe.only').describe.only(title, fn),
        skip: (title: string, fn?: SuiteBody) => currentGlobals('describe.skip').describe.skip(title, fn),
      },
  );

  const it: TestFunction<TState> = Object.assign(
      (title: string, fn?: TestBody<TState>) => currentIt('it')(title, fn),
      {
        only: (title: string, fn?: TestBody<TState>) => currentIt('it.only').only(title, fn),
        skip: (title: string, fn?: TestBody<TState>) => currentIt('it.skip').skip(title, fn),
      },
  );

  function setup(settings: TSuiteSettings): void {
    const currentSetup = currentGlobals('setup').setup;
    if (!currentSetup) {
      throw new Error('setup() can only be called inside of a describe() body.');
    }
    currentSetup(settings);
  }

  return Object.assign(devtoolsTestInterface, {
    description: options.description,
    describe,
    it,
    setup,
  });
}

function customIt<TState>(
    testImplementation: TestFunctions,
    suite: Mocha.Suite,
    file: string,
    mocha: Mocha,
    stateProvider?: TestStateProvider<TState, never>,
    ): CustomItFunction<TState> {
  function createTest(
      title: string,
      itBodyFn?: TestCallback<TState>|Mocha.AsyncFunc,
      ): Mocha.Test {
    const test: TimedTest = new Mocha.Test(
        title,
        suite.isPending() || !itBodyFn ? undefined :
                                         InstrumentedTestFunction.instrument<TState>(
                                             itBodyFn,
                                             'test',
                                             suite,
                                             stateProvider,
                                             ),
    );
    test.file = file;

    // Creates a proxy that changes the duration to return
    // our own timing.
    const proxyTest = new Proxy(test, {
      get(target, property, receiver) {
        if (property === 'duration' && target.realDuration) {
          return (Reflect.get(target, 'realDuration', receiver) ?? Reflect.get(target, property, receiver));
        }
        return Reflect.get(target, property, receiver);
      },
    });

    suite.addTest(proxyTest);
    return proxyTest;
  }

  // Regular mocha it returns the test instance.
  const localIt: CustomItFunction<TState> = Object.assign(
      function(
          title: string,
          fn?: TestCallback<TState>|Mocha.AsyncFunc,
          ):
          Mocha.Test {
            return createTest(title, fn);
          },
      {
        skip: function(
                  title: string,
                  _fn?: TestCallback<TState>|Mocha.AsyncFunc,
                  ): Mocha.Test {
          return createTest(title);
        },
        only: function(
                  title: string,
                  fn?: TestCallback<TState>|Mocha.AsyncFunc,
                  ): Mocha.Test {
          return testImplementation.only(mocha, createTest(title, fn));
        },
      },
  );

  return localIt;
}

export const devtoolsTestInterface: MochaInterface<unknown, unknown> = createMochaInterface({
  description: 'DevTools test interface',
  stateProvider: DefaultPuppeteerStateProvider.instance,
});
