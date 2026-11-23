// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type * as puppeteer from 'puppeteer-core';

// Needed to make use of the global declaration in ExtensionAPI.js of window.chrome.
// But if we make this a side-effect import, it will persist at compile type.
// So we import a type that we don't use to make TS realise it's just an import
// to declare some type, and it gets stripped at runtime.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type {Chrome} from '../../../extension-api/ExtensionAPI.js';
import {expectError} from '../../conductor/events.js';
import {describe, it} from '../conductor/mocha-interface.js';
import {loadExtension} from '../helpers/extension-helpers.js';

interface EvalResult {
  value: unknown;
  exceptionInfo?: {
    code?: string,
    description?: string,
    details?: unknown[],
    isError?: boolean,
    isException?: boolean,
    value?: string,
  };
}

async function evalInInspectedWindow(extension: puppeteer.Frame, expression: string): Promise<EvalResult> {
  return await extension.evaluate(
      expr => new Promise<EvalResult>(resolve => window.chrome.devtools.inspectedWindow.eval(
                                          expr, (value, exceptionInfo) => resolve({value, exceptionInfo}))),
      expression);
}

describe('Extension inspectedWindow.eval', () => {
  it('evaluates expressions in the inspected window', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('empty.html');
    await inspectedPage.evaluate(() => {
      interface TestWindow extends Window {
        inspectedValue?: {str: string, num: number};
        loop?: {next?: unknown};
      }
      const win = window as TestWindow;
      win.inspectedValue = {str: 'foo', num: 42};
      win.loop = {};
      win.loop.next = win.loop;
    });
    const extension = await loadExtension(devToolsPage, inspectedPage, 'TestExtension', undefined, undefined);

    const okResult = await evalInInspectedWindow(extension, 'inspectedValue');
    assert.deepEqual(okResult.value, {str: 'foo', num: 42});
    assert.isUndefined(okResult.exceptionInfo);

    const sdkError = expectError(/^Object reference chain is too long$/);
    const extensionError =
        expectError('Extension server error: Inspector protocol error: Object reference chain is too long');
    const loopResult = await evalInInspectedWindow(extension, 'window.loop');
    await devToolsPage.waitForFunction(async () => Boolean(sdkError.caught && extensionError.caught));
    assert.isUndefined(loopResult.value);
    assert.deepEqual(loopResult.exceptionInfo, {
      code: 'E_PROTOCOLERROR',
      description: 'Inspector protocol error: %s',
      details: ['Object reference chain is too long'],
      isError: true,
    });

    await extension.evaluate(async () => {
      await window.chrome.devtools.inspectedWindow.eval('function extensionFunc() {}');
      await window.chrome.devtools.inspectedWindow.eval('extensionVar = 42;');
    });
    const globalSymbolsResult = await evalInInspectedWindow(
        extension, '({ func: typeof window.extensionFunc, variable: window.extensionVar })');
    assert.deepEqual(globalSymbolsResult.value, {func: 'function', variable: 42});
    assert.isUndefined(globalSymbolsResult.exceptionInfo);

    const statementResult = await evalInInspectedWindow(extension, 'var x = 3; while (--x); x');
    assert.strictEqual(statementResult.value, 0);
    assert.isUndefined(statementResult.exceptionInfo);

    const undefinedResult = await evalInInspectedWindow(extension, 'undefined');
    assert.isUndefined(undefinedResult.value);
    assert.isUndefined(undefinedResult.exceptionInfo);

    const consoleApiResult = await evalInInspectedWindow(extension, 'typeof inspect');
    assert.strictEqual(consoleApiResult.value, 'function');
    assert.isUndefined(consoleApiResult.exceptionInfo);

    const stringifyOverriddenResult = await evalInInspectedWindow(
        extension, '(JSON.stringify = function() { throw \'oops! you can not use JSON.stringify\'; }), \'OK\'');
    assert.strictEqual(stringifyOverriddenResult.value, 'OK');
    assert.isUndefined(stringifyOverriddenResult.exceptionInfo);

    const throwsResult = await evalInInspectedWindow(extension, 'throw(\'testExceptionString\')');
    assert.isUndefined(throwsResult.value);
    assert.deepEqual(throwsResult.exceptionInfo, {
      isException: true,
      value: 'testExceptionString',
    });
  });
});
