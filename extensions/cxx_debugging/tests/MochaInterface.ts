// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Mocha from 'mocha';

declare global {
  interface Window {
    mocha: Mocha;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    Mocha: typeof Mocha;
  }
}

const mochaContext = {} as Mocha.MochaGlobals;
window.mocha.suite.emit('pre-require', mochaContext, '', window.mocha);
for (const key of Object.keys(mochaContext)) {
  delete (window as unknown as Record<string, unknown>)[key];
}

export const after: Mocha.HookFunction<Mocha.Hook> = window.Mocha.after;
export const afterEach: Mocha.HookFunction<Mocha.Hook> = window.Mocha.afterEach;
export const before: Mocha.HookFunction<Mocha.Hook> = window.Mocha.before;
export const beforeEach: Mocha.HookFunction<Mocha.Hook> = window.Mocha.beforeEach;
export const describe: Mocha.SuiteFunction = window.Mocha.describe;
export const it: Mocha.TestFunction = window.Mocha.it;
export const run: () => void = window.Mocha.run;
export const setup: Mocha.HookFunction = window.Mocha.setup;
export const suite: Mocha.SuiteFunction = window.Mocha.suite;
export const suiteSetup: Mocha.HookFunction = window.Mocha.suiteSetup;
export const suiteTeardown: Mocha.HookFunction = window.Mocha.suiteTeardown;
export const teardown: Mocha.HookFunction = window.Mocha.teardown;
export const test: Mocha.TestFunction = window.Mocha.test;
export const xdescribe: Mocha.PendingSuiteFunction = window.Mocha.xdescribe;
export const xit: Mocha.PendingTestFunction = window.Mocha.xit;
