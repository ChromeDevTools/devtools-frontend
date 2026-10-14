// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Mocha from 'mocha';

import {karmaWindow} from './browser-globals.js';

/**
 * Receives the BDD functions (`describe`, `it`, ...) instead of the global
 * object. Tests import them from 'mocha', which the import map resolves to this
 * module, and the exports below forward to the functions on this context.
 */
const mochaContext = {} as Mocha.MochaGlobals;

export function installDevtoolsBdd(): void {
  const mochaGlobal = karmaWindow.Mocha;

  const karmaConfig = karmaWindow.__karma__.config;

  const checkoutRoot = karmaConfig.checkoutRoot as string;
  const pathSeparator = karmaConfig.pathSeparator as string;

  mochaGlobal.interfaces['devtools-bdd'] = function(suite: Mocha.Suite) {
    mochaGlobal.interfaces.bdd(suite);
    suite.on('pre-require', function(context: Mocha.MochaGlobals) {
      const originalDescribe = context.describe;
      const originalIt = context.it;

      function extractFileNameFromStack() {
        const stack = new Error().stack;
        const match = stack?.match(/\/base\/(.+?\.test\.(?:js|mjs))/);
        if (!match) {
          throw new Error('Could not find file name in stack trace');
        }
        const file = decodeURIComponent(match[1]);
        return checkoutRoot + pathSeparator + file.replace(/\//g, pathSeparator);
      }

      function wrapDescribe(originalFn: Mocha.SuiteFunction): Mocha.SuiteFunction;
      function wrapDescribe(originalFn: Mocha.ExclusiveSuiteFunction): Mocha.ExclusiveSuiteFunction;
      function wrapDescribe(originalFn: Mocha.PendingSuiteFunction): Mocha.PendingSuiteFunction;
      function wrapDescribe(originalFn: Mocha.SuiteFunction|Mocha.ExclusiveSuiteFunction|Mocha.PendingSuiteFunction):
          Mocha.SuiteFunction|Mocha.ExclusiveSuiteFunction|Mocha.PendingSuiteFunction {
        return function(this: Mocha.Suite, title: string, fn?: (this: Mocha.Suite) => void) {
          const s =
              (originalFn as (this: Mocha.Suite, title: string, fn?: (this: Mocha.Suite) => void) => Mocha.Suite | void)
                  .call(this, title, fn);
          if (s && !s.file) {
            let file = s.parent?.file;
            if (!file) {
              file = extractFileNameFromStack();
            }
            s.file = file;
          }
          return s;
        } as unknown as Mocha.SuiteFunction |
            Mocha.ExclusiveSuiteFunction | Mocha.PendingSuiteFunction;
      }

      context.describe = Object.assign(wrapDescribe(originalDescribe), {
        only: wrapDescribe(originalDescribe.only),
        skip: wrapDescribe(originalDescribe.skip),
      });

      function wrapIt(originalFn: Mocha.TestFunction): Mocha.TestFunction;
      function wrapIt(originalFn: Mocha.ExclusiveTestFunction): Mocha.ExclusiveTestFunction;
      function wrapIt(originalFn: Mocha.PendingTestFunction): Mocha.PendingTestFunction;
      function wrapIt(originalFn: Mocha.TestFunction|Mocha.ExclusiveTestFunction|Mocha.PendingTestFunction):
          Mocha.TestFunction|Mocha.ExclusiveTestFunction|Mocha.PendingTestFunction {
        return function(this: Mocha.Context, titleOrFn: string|Mocha.Func|Mocha.AsyncFunc,
                        fn?: Mocha.Func|Mocha.AsyncFunc) {
          const t = (originalFn as (this: Mocha.Context, titleOrFn: string|Mocha.Func|Mocha.AsyncFunc,
                                    fn?: Mocha.Func|Mocha.AsyncFunc) => Mocha.Test | void)
                        .call(this, titleOrFn, fn);
          if (t && t.parent) {
            let file = t.parent.file;
            if (!file) {
              file = extractFileNameFromStack();
            }
            t.file = file;
          }
          return t;
        } as unknown as Mocha.TestFunction |
            Mocha.ExclusiveTestFunction | Mocha.PendingTestFunction;
      }

      context.it = Object.assign(wrapIt(originalIt), {
        only: wrapIt(originalIt.only),
        skip: wrapIt(originalIt.skip),
        retries: originalIt.retries,
      });
    });
  };
  // `mocha.ui()` would install the interface on the global object, bind it to
  // the private context instead.
  mochaGlobal.prototype.ui.call(karmaWindow.mocha, 'devtools-bdd');
  karmaWindow.mocha.suite.emit('pre-require', mochaContext, '', karmaWindow.mocha);
}

export const after: Mocha.HookFunction<Mocha.Hook> = karmaWindow.Mocha.after;
export const afterEach: Mocha.HookFunction<Mocha.Hook> = karmaWindow.Mocha.afterEach;
export const before: Mocha.HookFunction<Mocha.Hook> = karmaWindow.Mocha.before;
export const beforeEach: Mocha.HookFunction<Mocha.Hook> = karmaWindow.Mocha.beforeEach;
export const describe: Mocha.SuiteFunction = karmaWindow.Mocha.describe;
export const it: Mocha.TestFunction = karmaWindow.Mocha.it;
export const run: () => void = karmaWindow.Mocha.run;
export const setup: Mocha.HookFunction = karmaWindow.Mocha.setup;
export const suite: Mocha.SuiteFunction = karmaWindow.Mocha.suite;
export const suiteSetup: Mocha.HookFunction = karmaWindow.Mocha.suiteSetup;
export const suiteTeardown: Mocha.HookFunction = karmaWindow.Mocha.suiteTeardown;
export const teardown: Mocha.HookFunction = karmaWindow.Mocha.teardown;
export const test: Mocha.TestFunction = karmaWindow.Mocha.test;
export const xdescribe: Mocha.PendingSuiteFunction = karmaWindow.Mocha.xdescribe;
export const xit: Mocha.PendingTestFunction = karmaWindow.Mocha.xit;
