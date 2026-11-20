// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {describe, it} from '../conductor/mocha-interface.js';
import {
  CONSOLE_PROMPT_SELECTOR,
  CONSOLE_SELECTOR,
  CONSOLE_TAB_SELECTOR,
  focusConsolePrompt,
  navigateToConsoleTab,
  turnOffHistoryAutocomplete,
  typeIntoConsole,
  typeIntoConsoleAndWaitForResult,
} from '../helpers/console-helpers.js';
import {
  getCallFrameNames,
  openSourcesPanel,
  PAUSE_INDICATOR_SELECTOR,
  RESUME_BUTTON,
} from '../helpers/sources-helpers.js';

describe('The Console Tab', () => {
  it('exposes the last evaluation using "$_"', async ({devToolsPage}) => {
    await navigateToConsoleTab(devToolsPage);
    await turnOffHistoryAutocomplete(devToolsPage);
    await focusConsolePrompt(devToolsPage);

    await typeIntoConsoleAndWaitForResult(devToolsPage, '1+1', undefined, undefined);
    await typeIntoConsoleAndWaitForResult(devToolsPage, '$_', undefined, undefined);

    let evaluateResults = await devToolsPage.evaluate(() => {
      return Array.from(document.querySelectorAll('.console-user-command-result')).map(node => node.textContent);
    });
    assert.deepEqual(evaluateResults, ['2', '2'], 'did not find expected output in the console');

    await typeIntoConsole(devToolsPage, 'console.clear();');

    await devToolsPage.waitForFunction(() => {
      return devToolsPage.evaluate(() => {
        return document.querySelectorAll('.console-user-command-result').length === 1;
      });
    });

    await typeIntoConsoleAndWaitForResult(devToolsPage, '$_', undefined, undefined);

    evaluateResults = await devToolsPage.evaluate(() => {
      return Array.from(document.querySelectorAll('.console-user-command-result')).map(node => node.textContent);
    });
    assert.deepEqual(evaluateResults, ['undefined', 'undefined'], 'did not find expected output in the console');
  });

  describe('saving objects to temporary variables while paused', function() {
    if (this.timeout() !== 0) {
      this.timeout(60_000);
    }

    it('skips reserved globals and preserves null-prototype receiver while paused',
       async ({devToolsPage, inspectedPage}) => {
         const RESULT_SELECTOR = '.console-message-text';
         const OBJECT_SELECTOR = '.object-properties-section-root-element';

         await devToolsPage.useSoftMenu();
         await openSourcesPanel(devToolsPage);
         await inspectedPage.goToHtml(`
           <script>
             var thisObj;

             function testFunction()
             {
                 function inner()
                 {
                     debugger;
                 }

                 thisObj = { foo: 42, __proto__: null };
                 for (var i = 1; i < 6; ++i)
                     thisObj["temp" + i] = "FAIL";

                 inner.call(thisObj);
             }

             function checkThisObject()
             {
                 for (var key in thisObj) {
                     if (key === "foo")
                         console.assert(thisObj[key] === 42);
                     else if (key.substr(0, 4) === "temp")
                         console.assert(thisObj[key] === "FAIL");
                     else
                         console.error("FAIL: Unexpected property " + key);
                 }
             }

             for (var i = 3; i < 8; ++i)
                 window["temp" + i] = "Reserved";
           </script>
         `);
         await inspectedPage.evaluate('setTimeout(testFunction, 0)');

         await devToolsPage.waitFor(PAUSE_INDICATOR_SELECTOR);
         await devToolsPage.waitForFunction(async () => {
           const frames = await getCallFrameNames(devToolsPage);
           return frames.length >= 2 && frames[0] === 'inner' && frames[1] === 'testFunction';
         });

         await devToolsPage.click(CONSOLE_TAB_SELECTOR);
         await devToolsPage.waitFor(CONSOLE_PROMPT_SELECTOR);

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
             waitForReady: OBJECT_SELECTOR,
             waitForTempReady: OBJECT_SELECTOR,
           },
           {
             expression: '({ foo: \'bar\' })',
             targetSelector: OBJECT_SELECTOR,
             waitForReady: OBJECT_SELECTOR,
             waitForTempReady: OBJECT_SELECTOR,
           },
           {
             expression: '(function(){ return arguments; })(1,2,3,4)',
             targetSelector: OBJECT_SELECTOR,
             waitForReady: OBJECT_SELECTOR,
             waitForTempReady: OBJECT_SELECTOR,
           },
           {
             expression: '(function func() {})',
             targetSelector: RESULT_SELECTOR,
             waitForReady: '.object-value-function.linkified',
             waitForTempReady: '.object-value-function.linkified',
           },
           // ConsoleViewMessage.ts:renderSymbolizedError renders SymbolizedErrorWidget without a
           // RemoteObject contextmenu listener for top-level Error outputs, so store the Error via
           // an expanded object property row (ObjectPropertiesSection attaches Store as global variable).
           {
             expression: '({ err: new Error(\'errr\') })',
             targetSelector: 'li[data-object-property-name-for-test="err"] .name-and-value',
             waitForReady: OBJECT_SELECTOR,
             expandObject: true,
             waitForTempReady: '.formatted-stack-frame',
           },
         ];

         let expectedResultCount = 0;
         const waitForResultCount = async(count: number): Promise<void> => {
           await devToolsPage.waitForFunction(async () => {
             const ready = await devToolsPage.evaluate((expected, selector) => {
               const results = document.querySelectorAll(selector);
               if (results.length !== expected) {
                 return false;
               }
               const latest = results[results.length - 1];
               return Boolean(latest?.deepTextContent()?.trim());
             }, count, CONSOLE_SELECTOR);
             return ready;
           });
         };

         const savedEntries: Array<{varName: string, output: string}> = [];

         for (const testCase of cases) {
           await focusConsolePrompt(devToolsPage);
           await devToolsPage.pasteText(testCase.expression);
           await devToolsPage.pressKey('Enter');
           expectedResultCount += 1;
           await waitForResultCount(expectedResultCount);

           const wrappers = await devToolsPage.$$('.console-message-wrapper');
           const evalResultWrapper = wrappers[wrappers.length - 1];

           if (testCase.waitForReady) {
             await devToolsPage.waitFor(testCase.waitForReady, evalResultWrapper);
           }
           if (testCase.expandObject) {
             await devToolsPage.click('.console-view-object-properties-section', {root: evalResultWrapper});
             await devToolsPage.waitForFunction(async () => {
               const row = await devToolsPage.$(testCase.targetSelector, evalResultWrapper);
               if (!row) {
                 return false;
               }
               const text = await row.evaluate(node => node.deepTextContent()?.trim() ?? '');
               return text.length > 0;
             });
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

           const [varName, output] = await devToolsPage.waitForFunction(async () => {
             const nameText = await commandWrapper.evaluate(n => n.deepTextContent()?.trim() ?? '');
             const outputText = await tempResultWrapper.evaluate(n => n.deepTextContent()?.trim() ?? '');
             return nameText && outputText ? [nameText, outputText] as const: undefined;
           });
           savedEntries.push({varName, output});
         }

         assert.lengthOf(savedEntries, 11);
         assert.deepEqual(savedEntries.slice(0, 10), [
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
         ]);

         const errorEntry = savedEntries[10];
         assert.strictEqual(errorEntry.varName, 'temp16');
         const errorLines = errorEntry.output.split('\n');
         assert.strictEqual(errorLines[0], 'Error: errr');
         assert.include(errorEntry.output, 'at eval (eval at inner');
         assert.include(errorEntry.output, 'at Object.inner');
         assert.include(errorEntry.output, 'at testFunction');

         await openSourcesPanel(devToolsPage);
         await devToolsPage.click(RESUME_BUTTON);
         await devToolsPage.waitForNone(PAUSE_INDICATOR_SELECTOR);

         await inspectedPage.evaluate('checkThisObject()');
         const pageState = await inspectedPage.evaluate(() => {
           const win = window as unknown as Record<string, unknown>;
           const obj = win['thisObj'] as Record<string, unknown>;
           return {
             keys: Object.keys(obj),
             entries: Object.fromEntries(Object.entries(obj)),
             hasNullProto: Object.getPrototypeOf(obj) === null,
             reserved: [3, 4, 5, 6, 7].map(i => win[`temp${i}`]),
             savedError: win['temp16'] instanceof Error ? (win['temp16'] as Error).message : String(win['temp16']),
           };
         });
         assert.deepEqual(pageState.keys, ['foo', 'temp1', 'temp2', 'temp3', 'temp4', 'temp5']);
         assert.deepEqual(
             pageState.entries,
             {foo: 42, temp1: 'FAIL', temp2: 'FAIL', temp3: 'FAIL', temp4: 'FAIL', temp5: 'FAIL'},
         );
         assert.isTrue(pageState.hasNullProto);
         assert.deepEqual(pageState.reserved, ['Reserved', 'Reserved', 'Reserved', 'Reserved', 'Reserved']);
         assert.strictEqual(pageState.savedError, 'errr');
         assert.deepEqual(await devToolsPage.$$('.console-error-level'), []);
       });
  });
});
