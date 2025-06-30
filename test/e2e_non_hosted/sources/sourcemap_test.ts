// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  CONSOLE_TAB_SELECTOR,
  focusConsolePrompt,
  getCurrentConsoleMessages,
  Level
} from '../../e2e/helpers/console-helpers.js';
import {openSoftContextMenuAndClickOnItem} from '../../e2e/helpers/context-menu-helpers.js';
import {
  clickNthChildOfSelectedElementNode,
  focusElementsTree,
  waitForCSSPropertyValue,
  waitForElementsStyleSection
} from '../../e2e/helpers/elements-helpers.js';
import {setIgnoreListPattern} from '../../e2e/helpers/settings-helpers.js';
import {
  addBreakpointForLine,
  getBreakpointDecorators,
  getCallFrameNames,
  getValuesForScope,
  isBreakpointSet,
  openFileInEditor,
  openSourceCodeEditorForFile,
  openSourcesPanel,
  PAUSE_INDICATOR_SELECTOR,
  reloadPageAndWaitForSourceFile,
  removeBreakpointForLine,
  RESUME_BUTTON,
  retrieveCodeMirrorEditorContent,
  retrieveTopCallFrameScriptLocation,
  retrieveTopCallFrameWithoutResuming,
  STEP_INTO_BUTTON,
  STEP_OUT_BUTTON,
  STEP_OVER_BUTTON,
  waitForStackTopMatch
} from '../../e2e/helpers/sources-helpers.js';
import {getVisibleTextContents} from '../../shared/helper.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';

async function waitForTextContent(selector: string, devToolsPage: DevToolsPage) {
  const element = await devToolsPage.waitFor(selector);
  return await element.evaluate(({textContent}) => textContent);
}

const DEVTOOLS_LINK = 'devtools-toolbar .devtools-link';
const INFOBAR_TEXT = '.infobar-info-text';

describe('The Sources Tab', function() {
  setup({enabledDevToolsExperiments: ['instrumentation-breakpoints']});
  it('reliably hits breakpoints on worker with source map', async ({devToolsPage, inspectedPage}) => {
    await openSourceCodeEditorForFile(
        'sourcemap-stepping-source.js', 'sourcemap-breakpoint.html', devToolsPage, inspectedPage);

    // Add a breakpoint at first line of function multiline
    await addBreakpointForLine(4, devToolsPage);

    // Navigate to a different site to refresh devtools and remove back-end state
    await inspectedPage.goTo('about:blank');

    // Navigate back to test page
    void inspectedPage.goToResource('sources/sourcemap-breakpoint.html');

    // wait for pause and check if we stopped at line 4
    await devToolsPage.waitFor(PAUSE_INDICATOR_SELECTOR);
    await devToolsPage.waitForFunction(async () => {
      const topCallFrame = await retrieveTopCallFrameWithoutResuming(devToolsPage);
      return topCallFrame === 'sourcemap-stepping-source.js:4';
    });

    // Resume
    await devToolsPage.click(RESUME_BUTTON);
  });
});

describe('The Sources Tab', function() {
  setup({});
  it('steps over a source line mapping to a range with several statements', async ({devToolsPage, inspectedPage}) => {
    await openSourceCodeEditorForFile(
        'sourcemap-stepping-source.js', 'sourcemap-stepping.html', devToolsPage, inspectedPage);
    // DevTools is contracting long filenames with ellipses.
    // Let us match the location with regexp to match even contracted locations.
    const breakLocationRegExp = /.*source\.js:12$/;
    const stepLocationRegExp = /.*source\.js:13$/;

    // Run to breakpoint
    await addBreakpointForLine(12, devToolsPage);

    const scriptEvaluation = inspectedPage.evaluate('singleline();');

    const scriptLocation = await waitForStackTopMatch(breakLocationRegExp, devToolsPage);
    assert.match(scriptLocation, breakLocationRegExp);

    // Step over the mapped line
    await devToolsPage.click(STEP_OVER_BUTTON);

    const stepLocation = await waitForStackTopMatch(stepLocationRegExp, devToolsPage);
    assert.match(stepLocation, stepLocationRegExp);

    // Resume
    await devToolsPage.click(RESUME_BUTTON);
    await scriptEvaluation;
  });

  it('steps over a source line with mappings to several adjacent target lines',
     async ({devToolsPage, inspectedPage}) => {
       await openSourceCodeEditorForFile(
           'sourcemap-stepping-source.js', 'sourcemap-stepping.html', devToolsPage, inspectedPage);

       // DevTools is contracting long filenames with ellipses.
       // Let us match the location with regexp to match even contracted locations.
       const breakLocationRegExp = /.*source\.js:4$/;
       const stepLocationRegExp = /.*source\.js:5$/;

       // Run to breakpoint
       await addBreakpointForLine(4, devToolsPage);

       const scriptEvaluation = inspectedPage.evaluate('multiline();');

       const scriptLocation = await waitForStackTopMatch(breakLocationRegExp, devToolsPage);
       assert.match(scriptLocation, breakLocationRegExp);

       // Step over the mapped line
       await devToolsPage.click(STEP_OVER_BUTTON);

       const stepLocation = await waitForStackTopMatch(stepLocationRegExp, devToolsPage);
       assert.match(stepLocation, stepLocationRegExp);

       // Resume
       await devToolsPage.click(RESUME_BUTTON);
       await scriptEvaluation;
     });

  it('steps out from a function, with source maps available (crbug/1283188)', async ({devToolsPage, inspectedPage}) => {
    await openSourceCodeEditorForFile(
        'sourcemap-stepping-source.js', 'sourcemap-stepping.html', devToolsPage, inspectedPage);

    // DevTools is contracting long filenames with ellipses.
    // Let us match the location with regexp to match even contracted locations.
    const breakLocationRegExp = /.*source\.js:4$/;
    const stepLocationRegExp = /sourcemap-stepping.html:6$/;

    // Run to breakpoint
    await addBreakpointForLine(4, devToolsPage);

    const scriptEvaluation = inspectedPage.evaluate('outer();');

    const scriptLocation = await waitForStackTopMatch(breakLocationRegExp, devToolsPage);
    assert.match(scriptLocation, breakLocationRegExp);

    // Step out from breakpoint
    await devToolsPage.click(STEP_OUT_BUTTON);

    const stepLocation = await waitForStackTopMatch(stepLocationRegExp, devToolsPage);
    assert.match(stepLocation, stepLocationRegExp);

    // Resume
    await devToolsPage.click(RESUME_BUTTON);
    await scriptEvaluation;
  });

  it('stepping works at the end of a sourcemapped script (crbug/1305956)', async ({devToolsPage, inspectedPage}) => {
    await openSourceCodeEditorForFile(
        'sourcemap-stepping-at-end.js', 'sourcemap-stepping-at-end.html', devToolsPage, inspectedPage);

    // DevTools is contracting long filenames with ellipses.
    // Let us match the location with regexp to match even contracted locations.
    const breakLocationRegExp = /.*at-end\.js:2$/;
    const stepLocationRegExp = /.*at-end.html:6$/;

    for (const button of [STEP_INTO_BUTTON, STEP_OUT_BUTTON, STEP_OVER_BUTTON]) {
      // Run to debugger statement
      const scriptEvaluation = inspectedPage.evaluate('outer();');

      const scriptLocation = await waitForStackTopMatch(breakLocationRegExp, devToolsPage);
      assert.match(scriptLocation, breakLocationRegExp);

      // Step ${description} from debugger statement
      await devToolsPage.click(button);

      const stepLocation = await waitForStackTopMatch(stepLocationRegExp, devToolsPage);
      assert.match(stepLocation, stepLocationRegExp);

      // Resume
      await devToolsPage.click(RESUME_BUTTON);
      await scriptEvaluation;
    }
  });

  it('shows unminified identifiers in scopes and console', async ({devToolsPage, inspectedPage}) => {
    await devToolsPage.evaluate(() => {
      // @ts-expect-error different context
      DevToolsAPI.setUseSoftMenu(true);
    });
    await openSourceCodeEditorForFile('sourcemap-minified.js', 'sourcemap-minified.html', devToolsPage, inspectedPage);

    const breakLocationRegExp = /sourcemap-minified\.js:1$/;

    // Run to debugger statement
    const scriptEvaluation = inspectedPage.evaluate('sayHello(" world");');

    const scriptLocation = await waitForStackTopMatch(breakLocationRegExp, devToolsPage);
    assert.match(scriptLocation, breakLocationRegExp);

    // Check local variable is eventually un-minified
    const unminifiedVariable = 'element: div';
    await openSoftContextMenuAndClickOnItem('.cm-executionLine', 'Add source map…', devToolsPage);

    // Enter the source map URL into the appropriate input box.
    await devToolsPage.click('.add-source-map');
    await devToolsPage.typeText('sourcemap-minified.map');
    await devToolsPage.pressKey('Enter');

    const scopeValues = await devToolsPage.waitForFunction(async () => {
      const values = await getValuesForScope('Local', 0, 0, devToolsPage);
      return (values?.includes(unminifiedVariable)) ? values : undefined;
    });
    assert.include(scopeValues, unminifiedVariable);

    // Check that expression evaluation understands unminified name
    await devToolsPage.click(CONSOLE_TAB_SELECTOR);
    await focusConsolePrompt(devToolsPage);
    await devToolsPage.pasteText('`Hello${text}!`');
    await devToolsPage.pressKey('Enter');

    // Wait for the console to be usable again.
    await devToolsPage.waitForFunction(
        () => devToolsPage.evaluate(() => document.querySelectorAll('.console-user-command-result').length === 1));
    const messages = await getCurrentConsoleMessages(false, Level.All, undefined, devToolsPage);

    assert.deepEqual(messages, ['\'Hello world!\'']);

    await openSourcesPanel(devToolsPage);

    // Resume
    await devToolsPage.click(RESUME_BUTTON);
    await scriptEvaluation;
  });

  it('shows unminified identifiers in scopes with minified names clash and nested scopes',
     async ({devToolsPage, inspectedPage}) => {
       await openSourceCodeEditorForFile(
           'sourcemap-scopes-minified.js', 'sourcemap-scopes-minified.html', devToolsPage, inspectedPage);

       const breakLocationOuterRegExp = /sourcemap-scopes-minified\.js:2$/;
       const breakLocationInnerRegExp = /sourcemap-scopes-minified\.js:5$/;

       const outerUnminifiedVariable = 'arg0: 10';
       const innerUnminifiedVariable = 'loop_var: 0';

       // Run to outer scope breakpoint
       await addBreakpointForLine(2, devToolsPage);

       const scriptEvaluation = inspectedPage.evaluate('foo(10);');

       const scriptLocation = await waitForStackTopMatch(breakLocationOuterRegExp, devToolsPage);
       assert.match(scriptLocation, breakLocationOuterRegExp);

       // Check local scope variable is eventually un-minified
       {
         const scopeValues = await devToolsPage.waitForFunction(async () => {
           const values = await getValuesForScope('Local', 0, 0, devToolsPage);
           return (values?.includes(outerUnminifiedVariable)) ? values : undefined;
         });
         assert.include(scopeValues, outerUnminifiedVariable);
       }

       // Resume from outer breakpoint
       {
         await addBreakpointForLine(5, devToolsPage);
         await devToolsPage.click(RESUME_BUTTON);
         const scriptLocation = await waitForStackTopMatch(breakLocationInnerRegExp, devToolsPage);
         assert.match(scriptLocation, breakLocationInnerRegExp);
       }

       // Check local and block scope variables are eventually un-minified
       const blockScopeValues = await devToolsPage.waitForFunction(async () => {
         const values = await getValuesForScope('Block', 0, 0, devToolsPage);
         return (values?.includes(innerUnminifiedVariable)) ? values : undefined;
       });
       assert.include(blockScopeValues, innerUnminifiedVariable);

       const scopeValues = await devToolsPage.waitForFunction(async () => {
         const values = await getValuesForScope('Local', 0, 0, devToolsPage);
         return (values?.includes(outerUnminifiedVariable)) ? values : undefined;
       });
       assert.include(scopeValues, outerUnminifiedVariable);

       // Resume from inner breakpoint
       await removeBreakpointForLine(2, devToolsPage);
       await removeBreakpointForLine(5, devToolsPage);
       await devToolsPage.click(RESUME_BUTTON);
       await scriptEvaluation;
     });

  it('shows unminified function name in stack trace', async ({devToolsPage, inspectedPage}) => {
    await openSourceCodeEditorForFile(
        'sourcemap-minified-function-name-compiled.js', 'sourcemap-minified-function-name.html', devToolsPage,
        inspectedPage);

    const breakLocationOuterRegExp = /sourcemap-.*-compiled\.js:1$/;

    // Run to breakpoint
    const scriptEvaluation = inspectedPage.evaluate('o(1, 2)');

    const scriptLocation = await waitForStackTopMatch(breakLocationOuterRegExp, devToolsPage);
    assert.match(scriptLocation, breakLocationOuterRegExp);

    // Add source map
    await openSoftContextMenuAndClickOnItem('.cm-line', 'Add source map…', devToolsPage);

    // Enter the source map URL into the appropriate input box.
    await devToolsPage.click('.add-source-map');
    await devToolsPage.typeText('sourcemap-minified-function-name-compiled.map');
    await devToolsPage.pressKey('Enter');

    // Check function name is eventually un-minified
    const functionName = await devToolsPage.waitForFunction(async () => {
      const functionName = await waitForTextContent('.call-frame-title-text', devToolsPage);
      return functionName && functionName === 'unminified' ? functionName : undefined;
    });
    assert.strictEqual(functionName, 'unminified');

    // Resume execution
    await devToolsPage.click(RESUME_BUTTON);
    await scriptEvaluation;
  });

  it('automatically ignore-lists third party code from source maps', async ({devToolsPage, inspectedPage}) => {
    await openSourceCodeEditorForFile('webpack-main.js', 'webpack-index.html', devToolsPage, inspectedPage);

    const breakLocationOuterRegExp = /index\.js:12$/;

    // Run to breakpoint
    const scriptEvaluation = inspectedPage.evaluate('window.foo()');

    const scriptLocation = await waitForStackTopMatch(breakLocationOuterRegExp, devToolsPage);
    assert.match(scriptLocation, breakLocationOuterRegExp);
    assert.deepEqual(await getCallFrameNames(devToolsPage), ['baz', 'bar', 'foo', '(anonymous)']);

    // Toggle to show ignore-listed frames
    await devToolsPage.click('.ignore-listed-message-label');
    await devToolsPage.waitFor('.ignore-listed-call-frame:not(.hidden)');
    assert.deepEqual(await getCallFrameNames(devToolsPage), ['baz', 'vendor', 'bar', 'foo', '(anonymous)']);

    // Toggle back off
    await devToolsPage.click('.ignore-listed-message-label');
    await devToolsPage.waitFor('.ignore-listed-call-frame.hidden');
    assert.deepEqual(await getCallFrameNames(devToolsPage), ['baz', 'bar', 'foo', '(anonymous)']);

    // Resume execution
    await devToolsPage.click(RESUME_BUTTON);
    await scriptEvaluation;
  });

  it('updates decorators for removed breakpoints in case of code-splitting (crbug.com/1251675)',
     async ({devToolsPage, inspectedPage}) => {
       await openSourceCodeEditorForFile(
           'sourcemap-disjoint.js', 'sourcemap-disjoint.html', devToolsPage, inspectedPage);
       assert.deepEqual(await getBreakpointDecorators(false, 0, devToolsPage), []);
       await addBreakpointForLine(2, devToolsPage);
       assert.deepEqual(await getBreakpointDecorators(false, 1, devToolsPage), [2]);
       await removeBreakpointForLine(2, devToolsPage);
       assert.deepEqual(await getBreakpointDecorators(false, 0, devToolsPage), []);
     });

  it('links to the correct origins for source-mapped resources', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('sources/sourcemap-origin.html');
    await openSourcesPanel(devToolsPage);

    // Check origin of source-mapped JavaScript
    {
      await openFileInEditor('sourcemap-origin.js', devToolsPage);
      const linkText = await waitForTextContent(DEVTOOLS_LINK, devToolsPage);
      assert.strictEqual(linkText, 'sourcemap-origin.min.js');
    }

    // Check origin of source-mapped SASS
    {
      await openFileInEditor('sourcemap-origin.scss', devToolsPage);
      const linkText = await waitForTextContent(DEVTOOLS_LINK, devToolsPage);
      assert.strictEqual(linkText, 'sourcemap-origin.css');
    }

    // Check origin of source-mapped JavaScript with URL clash
    {
      await openFileInEditor('sourcemap-origin.clash.js', devToolsPage);
      const linkText = await waitForTextContent(DEVTOOLS_LINK, devToolsPage);
      assert.strictEqual(linkText, 'sourcemap-origin.clash.js');
    }
  });

  it('shows Source map loaded infobar', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('sources/sourcemap-origin.html');
    await openSourcesPanel(devToolsPage);

    // Get infobar text
    await openFileInEditor('sourcemap-origin.min.js', devToolsPage);
    const infobarText = await waitForTextContent(INFOBAR_TEXT, devToolsPage);
    assert.strictEqual(infobarText, 'Source map loaded');
  });

  it('shows Source map loaded infobar after attaching', async ({devToolsPage, inspectedPage}) => {
    await openSourceCodeEditorForFile('sourcemap-minified.js', 'sourcemap-minified.html', devToolsPage, inspectedPage);

    // Attach source map
    await openSoftContextMenuAndClickOnItem('.cm-line', 'Add source map…', devToolsPage);

    // Enter the source map URL into the appropriate input box.
    await devToolsPage.click('.add-source-map');
    await devToolsPage.typeText('sourcemap-minified.map');
    await devToolsPage.pressKey('Enter');

    // Get infobar text
    const infobarText = await waitForTextContent(INFOBAR_TEXT, devToolsPage);
    assert.strictEqual(infobarText, 'Source map loaded');
  });

  it('shows Source map skipped infobar', async ({devToolsPage, inspectedPage}) => {
    await setIgnoreListPattern('.min.js', devToolsPage);
    await openSourceCodeEditorForFile('sourcemap-origin.min.js', 'sourcemap-origin.html', devToolsPage, inspectedPage);

    // Get infobar texts
    await openFileInEditor('sourcemap-origin.min.js', devToolsPage);
    await devToolsPage.waitFor('.infobar-warning');
    await devToolsPage.waitFor('.infobar-info');
    const infobarTexts = await getVisibleTextContents(INFOBAR_TEXT, devToolsPage);
    assert.deepEqual(
        infobarTexts, ['This script is on the debugger\'s ignore list', 'Source map skipped for this file']);
  });

  it('shows Source map error infobar after failing to attach', async ({devToolsPage, inspectedPage}) => {
    await openSourceCodeEditorForFile('sourcemap-minified.js', 'sourcemap-minified.html', devToolsPage, inspectedPage);

    // Attach source map
    await openSoftContextMenuAndClickOnItem('.cm-line', 'Add source map…', devToolsPage);

    // Enter the source map URL into the appropriate input box.
    await devToolsPage.click('.add-source-map');
    await devToolsPage.typeText('sourcemap-invalid.map');
    await devToolsPage.pressKey('Enter');

    // Get infobar text
    const infobarText = await waitForTextContent(INFOBAR_TEXT, devToolsPage);
    assert.strictEqual(infobarText, 'Source map failed to load');
  });

  describe('can deal with code-splitting', () => {
    it('sets multiple breakpoints in case of code-splitting', async ({devToolsPage, inspectedPage}) => {
      await openSourceCodeEditorForFile(
          'sourcemap-codesplit.ts', 'sourcemap-codesplit.html', devToolsPage, inspectedPage);
      await addBreakpointForLine(3, devToolsPage);

      for (let i = 0; i < 2; ++i) {
        const scriptLocation =
            await retrieveTopCallFrameScriptLocation(`functions[${i}]();`, inspectedPage, devToolsPage);
        assert.deepEqual(scriptLocation, 'sourcemap-codesplit.ts:3');
      }
    });

    it('restores breakpoints correctly in case of code-splitting (crbug.com/1412033)',
       async ({devToolsPage, inspectedPage}) => {
         // Load the initial setup with only one script pointing to `codesplitting-bar.ts`...
         await openSourceCodeEditorForFile('codesplitting-bar.ts', 'codesplitting.html', devToolsPage, inspectedPage);

         // ...and set a breakpoint inside `bar()`.
         await addBreakpointForLine(2, devToolsPage);

         // Now load the second script pointing to `codesplitting-bar.ts`...
         await inspectedPage.evaluate('addSecond();');

         // ...wait for the new origin to be listed...
         const linkTexts = await devToolsPage.waitForFunction(async () => {
           const links = await devToolsPage.page.$$(DEVTOOLS_LINK);
           const linkTexts = await Promise.all(links.map(node => node.evaluate(({textContent}) => textContent)));
           if (linkTexts.length === 1 && linkTexts[0] === 'codesplitting-first.js') {
             return undefined;
           }
           return linkTexts;
         });
         assert.sameMembers(linkTexts, ['codesplitting-first.js', 'codesplitting-second.js']);

         // ...and eventually wait for the breakpoint to be restored in line 2.
         await devToolsPage.waitForFunction(async () => await isBreakpointSet(2, devToolsPage));

         // Eventually we should stop on the breakpoint in the `codesplitting-second.js`.
         await devToolsPage.waitForFunction(() => {
           return Promise.race([
             inspectedPage.evaluate('second()').then(() => false),
             devToolsPage.waitFor(PAUSE_INDICATOR_SELECTOR).then(() => true),
           ]);
         });
         await devToolsPage.click(RESUME_BUTTON);
       });

    it('hits breakpoints reliably after reload in case of code-splitting (crbug.com/1490369)',
       async ({devToolsPage, inspectedPage}) => {
         // Set the breakpoint inside `shared()` in `shared.js`.
         await openSourceCodeEditorForFile('shared.js', 'codesplitting-race.html', devToolsPage, inspectedPage);
         await addBreakpointForLine(2, devToolsPage);
         await devToolsPage.waitForFunction(async () => await isBreakpointSet(2, devToolsPage));

         // Reload the page.
         const reloadPromise = inspectedPage.reload();

         // Now the debugger should pause twice reliably.
         await devToolsPage.waitFor(PAUSE_INDICATOR_SELECTOR);
         await devToolsPage.click(RESUME_BUTTON);
         await devToolsPage.waitFor(PAUSE_INDICATOR_SELECTOR);
         await devToolsPage.click(RESUME_BUTTON);

         await reloadPromise;
       });
  });

  describe('can deal with hot module replacement', () => {
    // The tests in here simulate Hot Module Replacement (HMR) workflows related
    // to how DevTools deals with source maps in these situations.

    it('correctly handles URL clashes between compiled and source-mapped scripts',
       async ({devToolsPage, inspectedPage}) => {
         // Load the "initial bundle"...
         await openSourceCodeEditorForFile('index.js', 'sourcemap-hmr.html', devToolsPage, inspectedPage);

         // ...and check that index.js content is as expected.
         // In particular, this asserts that the front-end does not get creative in
         // appending suffixes like '? [sm]' to the index.js here.
         const initialContent = await retrieveCodeMirrorEditorContent(devToolsPage);
         assert.deepEqual(initialContent, [
           'globalThis.hello = () => {',
           '  console.log("Hello world!");',
           '}',
           '',
         ]);

         // Simulate the hot module replacement for index.js...
         await inspectedPage.evaluate('update();');

         // ...and wait for its content to load (should just replace
         // the existing tab contents for index.js). We perform this
         // check by waiting until the editor contents differ from
         // the initial contents, and then asserting that it looks
         // as expected afterwards.
         const updatedContent = await devToolsPage.waitForFunction(async () => {
           const content = await retrieveCodeMirrorEditorContent(devToolsPage);
           if (content.length !== initialContent.length) {
             return content;
           }
           for (let i = 0; i < content.length; ++i) {
             if (content[i] !== initialContent[i]) {
               return content;
             }
           }
           return undefined;
         });
         assert.deepEqual(updatedContent, [
           'globalThis.hello = () => {',
           '  console.log("Hello UPDATED world!");',
           '}',
           '',
         ]);
       });

    it('correctly maintains breakpoints from initial bundle to replacement', async ({devToolsPage, inspectedPage}) => {
      // Load the "initial bundle" and set a breakpoint on the second line.
      await openSourceCodeEditorForFile('index.js', 'sourcemap-hmr.html', devToolsPage, inspectedPage);
      await addBreakpointForLine(2, devToolsPage);

      // Simulate the hot module replacement for index.js
      await inspectedPage.evaluate('update();');

      // Wait for the "hot module replacement" to take effect for index.js.
      await devToolsPage.waitForFunction(async () => {
        const content = await retrieveCodeMirrorEditorContent(devToolsPage);
        return content[1].includes('UPDATED');
      });

      // Wait for the breakpoint to appear on line 2 of the updated index.js.
      await devToolsPage.waitForFunction(async () => await isBreakpointSet(2, devToolsPage));
    });

    it('correctly maintains breakpoints from replacement to initial bundle (across reloads)',
       async ({devToolsPage, inspectedPage}) => {
         // Load the "initial bundle".
         await openSourceCodeEditorForFile('index.js', 'sourcemap-hmr.html', devToolsPage, inspectedPage);

         // Simulate the hot module replacement for index.js
         await inspectedPage.evaluate('update();');

         // Wait for the "hot module replacement" to take effect for index.js.
         await devToolsPage.waitForFunction(async () => {
           const content = await retrieveCodeMirrorEditorContent(devToolsPage);
           return content[1].includes('UPDATED');
         });

         // Set a breakpoint on the second line.
         await addBreakpointForLine(2, devToolsPage);

         // Reload the page and re-open (the initial) index.js.
         await reloadPageAndWaitForSourceFile('index.js', devToolsPage, inspectedPage);

         // Check that the breakpoint still exists on line 2.
         assert.isTrue(await isBreakpointSet(2, devToolsPage));
       });
  });

  it('can attach sourcemaps to CSS files from a context menu', async ({devToolsPage, inspectedPage}) => {
    await openSourceCodeEditorForFile('sourcemap-css.css', 'sourcemap-css-noinline.html', devToolsPage, inspectedPage);

    await devToolsPage.click('aria/Code editor', {clickOptions: {button: 'right'}});
    await devToolsPage.click('aria/Add source map…');
    await devToolsPage.waitFor('.add-source-map');
    await devToolsPage.typeText('sourcemap-css-absolute.map');
    await devToolsPage.pressKey('Enter');

    await devToolsPage.waitFor('[aria-label="app.scss, file"]');
  });
});

describe('The Elements Tab', () => {
  async function clickStyleValueWithModifiers(
      selector: string, name: string, value: string, location: string, devToolsPage: DevToolsPage) {
    const element = await waitForCSSPropertyValue(selector, name, value, location, devToolsPage);
    // Click with offset to skip swatches.
    await devToolsPage.withControlOrMetaKey(
        () => devToolsPage.clickElement(element, {clickOptions: {offset: {x: 20, y: 5}}}));
  }

  it('links to the right SASS source for inline CSS with relative sourcemap (crbug.com/787792)',
     async ({devToolsPage, inspectedPage}) => {
       await inspectedPage.goToResource('sources/sourcemap-css-inline-relative.html');
       // Prepare elements tab
       await waitForElementsStyleSection('<body', devToolsPage);
       await focusElementsTree(devToolsPage);
       await clickNthChildOfSelectedElementNode(1, devToolsPage);
       await clickStyleValueWithModifiers('body .text', 'color', 'green', 'app.scss:6', devToolsPage);
       await devToolsPage.waitForElementWithTextContent('Line 12, Column 9');
     });

  it('links to the right SASS source for inline CSS with absolute sourcemap (crbug.com/787792)',
     async ({devToolsPage, inspectedPage}) => {
       await inspectedPage.goToResource('sources/sourcemap-css-dynamic-link.html');
       // Prepare elements tab
       await waitForElementsStyleSection('<body', devToolsPage);
       await focusElementsTree(devToolsPage);
       await clickNthChildOfSelectedElementNode(1, devToolsPage);
       await clickStyleValueWithModifiers('body .text', 'color', 'green', 'app.scss:6', devToolsPage);
       await devToolsPage.waitForElementWithTextContent('Line 12, Column 9');
     });

  it('links to the right SASS source for dynamically added CSS style tags (crbug.com/787792)',
     async ({devToolsPage, inspectedPage}) => {
       await inspectedPage.goToResource('sources/sourcemap-css-dynamic.html');
       // Prepare elements tab
       await waitForElementsStyleSection('<body', devToolsPage);
       await focusElementsTree(devToolsPage);
       await clickNthChildOfSelectedElementNode(1, devToolsPage);
       await clickStyleValueWithModifiers('body .text', 'color', 'green', 'app.scss:6', devToolsPage);
       await devToolsPage.waitForElementWithTextContent('Line 12, Column 9');
     });

  it('links to the right SASS source for dynamically added CSS link tags (crbug.com/787792)',
     async ({devToolsPage, inspectedPage}) => {
       await inspectedPage.goToResource('sources/sourcemap-css-dynamic-link.html');
       // Prepare elements tab
       await waitForElementsStyleSection('<body', devToolsPage);
       await focusElementsTree(devToolsPage);
       await clickNthChildOfSelectedElementNode(1, devToolsPage);
       await clickStyleValueWithModifiers('body .text', 'color', 'green', 'app.scss:6', devToolsPage);
       await devToolsPage.waitForElementWithTextContent('Line 12, Column 9');
     });
});
