// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {platform} from '../../conductor/platform.js';
import {describe, it} from '../conductor/mocha-interface.js';
import {clickOnContextMenu, CONSOLE_TAB_SELECTOR, focusConsolePrompt} from '../helpers/console-helpers.js';

describe('The Console Tab', function() {
  const RESULT_SELECTOR = '.console-message-text';
  // Targets the root tree element of object previews (like Maps and Sets) in the Console
  const OBJECT_SELECTOR = '.object-properties-section-root-element';
  const LINE_END = platform === 'win32' ? '\r\n' : '\n';

  it('can copy contents for strings', async ({devToolsPage}) => {
    await devToolsPage.useSoftMenu();
    await devToolsPage.click(CONSOLE_TAB_SELECTOR);
    await focusConsolePrompt(devToolsPage);
    await devToolsPage.typeText('\'string\\ncontent\'\n');
    await devToolsPage.waitFor(RESULT_SELECTOR);
    await clickOnContextMenu(devToolsPage, RESULT_SELECTOR, 'copy-string-contents');
    const copiedContent = await devToolsPage.readClipboard();
    assert.deepEqual(copiedContent, `string${LINE_END}content`);
  });

  it('can copy strings as JS literals', async ({devToolsPage}) => {
    await devToolsPage.click(CONSOLE_TAB_SELECTOR);
    await focusConsolePrompt(devToolsPage);
    await devToolsPage.typeText('\'string\\ncontent\'\n');
    await devToolsPage.waitFor(RESULT_SELECTOR);
    await clickOnContextMenu(devToolsPage, RESULT_SELECTOR, 'copy-string-as-js-literal');
    const copiedContent = await devToolsPage.readClipboard();
    assert.deepEqual(copiedContent, '\'string\\ncontent\'');
  });

  it('can copy strings as JSON literals', async ({devToolsPage}) => {
    await devToolsPage.click(CONSOLE_TAB_SELECTOR);
    await focusConsolePrompt(devToolsPage);
    await devToolsPage.typeText('\'string\\ncontent\'\n');
    await devToolsPage.waitFor(RESULT_SELECTOR);
    await clickOnContextMenu(devToolsPage, RESULT_SELECTOR, 'copy-string-as-json-literal');
    const copiedContent = await devToolsPage.readClipboard();
    assert.deepEqual(copiedContent, '"string\\ncontent"');
  });

  it('can copy numbers', async ({devToolsPage}) => {
    await devToolsPage.click(CONSOLE_TAB_SELECTOR);
    await focusConsolePrompt(devToolsPage);
    await devToolsPage.typeText('500\n');
    await devToolsPage.waitFor(RESULT_SELECTOR);
    await clickOnContextMenu(devToolsPage, RESULT_SELECTOR, 'copy-primitive');
    const copiedContent = await devToolsPage.readClipboard();
    assert.deepEqual(copiedContent, '500');
  });

  it('can copy bigints', async ({devToolsPage}) => {
    await devToolsPage.click(CONSOLE_TAB_SELECTOR);
    await focusConsolePrompt(devToolsPage);
    await devToolsPage.typeText('500n\n');
    await devToolsPage.waitFor(RESULT_SELECTOR);
    await clickOnContextMenu(devToolsPage, RESULT_SELECTOR, 'copy-primitive');
    const copiedContent = await devToolsPage.readClipboard();
    assert.deepEqual(copiedContent, '500n');
  });

  it('can copy booleans', async ({devToolsPage}) => {
    await devToolsPage.click(CONSOLE_TAB_SELECTOR);
    await focusConsolePrompt(devToolsPage);
    await devToolsPage.typeText('true\n');
    await devToolsPage.waitFor(RESULT_SELECTOR);
    await clickOnContextMenu(devToolsPage, RESULT_SELECTOR, 'copy-primitive');
    const copiedContent = await devToolsPage.readClipboard();
    assert.deepEqual(copiedContent, 'true');
  });

  it('can copy undefined', async ({devToolsPage}) => {
    await devToolsPage.click(CONSOLE_TAB_SELECTOR);
    await focusConsolePrompt(devToolsPage);
    await devToolsPage.typeText('undefined\n');
    await devToolsPage.waitFor(RESULT_SELECTOR);
    await clickOnContextMenu(devToolsPage, RESULT_SELECTOR, 'copy-primitive');
    const copiedContent = await devToolsPage.readClipboard();
    assert.deepEqual(copiedContent, 'undefined');
  });

  it('can copy maps', async ({devToolsPage}) => {
    await devToolsPage.click(CONSOLE_TAB_SELECTOR);
    await focusConsolePrompt(devToolsPage);
    await devToolsPage.typeText('new Map([["key1","value1"],["key2","value2"]])\n');
    await devToolsPage.waitFor(OBJECT_SELECTOR);
    await clickOnContextMenu(devToolsPage, OBJECT_SELECTOR, 'copy-object');
    const copiedContent = await devToolsPage.readClipboard();
    assert.deepEqual(
        copiedContent,
        `new Map([${LINE_END}    [${LINE_END}        "key1",${LINE_END}        "value1"${LINE_END}    ],${
            LINE_END}    [${LINE_END}        "key2",${LINE_END}        "value2"${LINE_END}    ]${LINE_END}])`);
  });

  it('can copy sets', async ({devToolsPage}) => {
    await devToolsPage.click(CONSOLE_TAB_SELECTOR);
    await focusConsolePrompt(devToolsPage);
    await devToolsPage.typeText('new Set(["a","b","c"])\n');
    await devToolsPage.waitFor(OBJECT_SELECTOR);
    await clickOnContextMenu(devToolsPage, OBJECT_SELECTOR, 'copy-object');
    const copiedContent = await devToolsPage.readClipboard();
    assert.deepEqual(copiedContent, `new Set([${LINE_END}    "a",${LINE_END}    "b",${LINE_END}    "c"${LINE_END}])`);
  });

  describe('saving expressions as global temporary variables', function() {
    if (this.timeout() !== 0) {
      this.timeout(30_000);
    }

    it('skips existing globals when storing all value types as temp variables',
       async ({devToolsPage, inspectedPage}) => {
         await inspectedPage.evaluate(() => {
           for (let i = 3; i < 8; ++i) {
             (window as unknown as Record<string, string>)['temp' + i] = 'Reserved';
           }
         });

         await devToolsPage.useSoftMenu();
         await devToolsPage.click(CONSOLE_TAB_SELECTOR);

         interface TempVarCase {
           expression: string;
           targetSelector: string;
           waitForReady?: string;
           expandObject?: boolean;
           waitForTempReady?: string;
         }

         const cases: TempVarCase[] = [
           {expression: '42', targetSelector: RESULT_SELECTOR},
           {expression: '\'foo string\'', targetSelector: RESULT_SELECTOR},
           {expression: 'NaN', targetSelector: RESULT_SELECTOR},
           {expression: 'Infinity', targetSelector: RESULT_SELECTOR},
           {expression: '-Infinity', targetSelector: RESULT_SELECTOR},
           {expression: '-0', targetSelector: RESULT_SELECTOR},
           {
             expression: '[1, 2, NaN, -0, null, undefined]',
             targetSelector: OBJECT_SELECTOR,
             waitForTempReady: OBJECT_SELECTOR,
           },
           {
             expression: '({ foo: \'bar\' })',
             targetSelector: OBJECT_SELECTOR,
             waitForTempReady: OBJECT_SELECTOR,
           },
           {
             expression: '(function(){ return arguments; })(1,2,3,4)',
             targetSelector: OBJECT_SELECTOR,
             waitForTempReady: OBJECT_SELECTOR,
           },
           {
             expression: '(function func() {})',
             targetSelector: RESULT_SELECTOR,
             waitForReady: '.object-value-function.linkified',
             waitForTempReady: '.object-value-function.linkified',
           },
           // ConsoleViewMessage.ts:renderSymbolizedError renders SymbolizedErrorWidget without a
           // RemoteObject contextmenu listener for top-level Error outputs, so save an Error via an
           // expanded object property row (which attaches Store as global variable via ObjectPropertiesSection).
           {
             expression: '({ err: new Error(\'errr\') })',
             targetSelector: 'li[data-object-property-name-for-test="err"]',
             waitForReady: OBJECT_SELECTOR,
             expandObject: true,
             waitForTempReady: '.formatted-stack-frame',
           },
         ];

         let expectedResultCount = 0;
         const waitForResultCount = async(count: number): Promise<void> => {
           await devToolsPage.waitForFunction(async () => {
             return await devToolsPage.evaluate(expected => {
               return document.querySelectorAll('.console-user-command-result').length === expected;
             }, count);
           });
         };

         const savedEntries: Array<{varName: string, output: string}> = [];

         for (const testCase of cases) {
           await focusConsolePrompt(devToolsPage);
           await devToolsPage.typeText(`${testCase.expression}\n`);
           expectedResultCount += 1;
           await waitForResultCount(expectedResultCount);

           const wrappers = await devToolsPage.$$('.console-message-wrapper');
           const evalResultWrapper = wrappers[wrappers.length - 1];

           if (testCase.waitForReady) {
             await devToolsPage.waitFor(testCase.waitForReady, evalResultWrapper);
           }
           if (testCase.expandObject) {
             await devToolsPage.click('.console-view-object-properties-section', {root: evalResultWrapper});
           }

           await devToolsPage.click(
               testCase.targetSelector,
               {root: evalResultWrapper, clickOptions: {button: 'right'}},
           );
           await devToolsPage.waitFor('.soft-context-menu');
           await devToolsPage.click('[jslog*="context: store-as-global-variable"]');
           await devToolsPage.waitForNone('.soft-context-menu');

           expectedResultCount += 1;
           await waitForResultCount(expectedResultCount);

           const updatedWrappers = await devToolsPage.$$('.console-message-wrapper');
           const commandWrapper = updatedWrappers[updatedWrappers.length - 2];
           const tempResultWrapper = updatedWrappers[updatedWrappers.length - 1];
           if (testCase.waitForTempReady) {
             await devToolsPage.waitFor(testCase.waitForTempReady, tempResultWrapper);
           }

           const varName = await commandWrapper.evaluate(n => n.deepTextContent() ?? '');
           const output = await tempResultWrapper.evaluate(n => n.deepTextContent() ?? '');
           savedEntries.push({varName, output});
         }

         assert.deepEqual(savedEntries, [
           {varName: 'temp1', output: '42'},
           {varName: 'temp2', output: '\'foo string\''},
           {varName: 'temp8', output: 'NaN'},
           {varName: 'temp9', output: 'Infinity'},
           {varName: 'temp10', output: '-Infinity'},
           {varName: 'temp11', output: '-0'},
           {varName: 'temp12', output: '(6)\u00a0[1, 2, NaN, -0, null, undefined]'},
           {varName: 'temp13', output: '{foo: \'bar\'}'},
           {
             varName: 'temp14',
             output: 'Arguments(4)\u00a0[1, 2, 3, 4, callee: ƒ, Symbol(Symbol.iterator): ƒ]',
           },
           {varName: 'temp15', output: 'ƒ func() {}'},
           {varName: 'temp16', output: 'Error: errr\n    at <anonymous>:1:9'},
         ]);

         const reservedValues = await inspectedPage.evaluate(() => {
           return [3, 4, 5, 6, 7].map(i => (window as unknown as Record<string, unknown>)['temp' + i]);
         });
         assert.deepEqual(reservedValues, ['Reserved', 'Reserved', 'Reserved', 'Reserved', 'Reserved']);
       });
  });
});
