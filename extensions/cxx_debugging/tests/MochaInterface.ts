// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Mocha from 'mocha';

/**
 * The window of the Karma context page with the globals of the Mocha browser
 * bundle.
 */
interface MochaWindow extends Window {
  mocha: Mocha;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  Mocha: typeof Mocha;
}

const mochaWindow = window as unknown as MochaWindow;

const mochaContext = {} as Mocha.MochaGlobals;
mochaWindow.mocha.suite.emit('pre-require', mochaContext, '', mochaWindow.mocha);
for (const key of Object.keys(mochaContext)) {
  delete (window as unknown as Record<string, unknown>)[key];
}

export const after: Mocha.HookFunction<Mocha.Hook> = mochaWindow.Mocha.after;
export const afterEach: Mocha.HookFunction<Mocha.Hook> = mochaWindow.Mocha.afterEach;
export const before: Mocha.HookFunction<Mocha.Hook> = mochaWindow.Mocha.before;
export const beforeEach: Mocha.HookFunction<Mocha.Hook> = mochaWindow.Mocha.beforeEach;
export const describe: Mocha.SuiteFunction = mochaWindow.Mocha.describe;
export const it: Mocha.TestFunction = mochaWindow.Mocha.it;
export const run: () => void = mochaWindow.Mocha.run;
export const setup: Mocha.HookFunction = mochaWindow.Mocha.setup;
export const suite: Mocha.SuiteFunction = mochaWindow.Mocha.suite;
export const suiteSetup: Mocha.HookFunction = mochaWindow.Mocha.suiteSetup;
export const suiteTeardown: Mocha.HookFunction = mochaWindow.Mocha.suiteTeardown;
export const teardown: Mocha.HookFunction = mochaWindow.Mocha.teardown;
export const test: Mocha.TestFunction = mochaWindow.Mocha.test;
export const xdescribe: Mocha.PendingSuiteFunction = mochaWindow.Mocha.xdescribe;
export const xit: Mocha.PendingTestFunction = mochaWindow.Mocha.xit;
