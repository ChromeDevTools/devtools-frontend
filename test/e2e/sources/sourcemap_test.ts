// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  $$,
  click,
  clickElement,
  enableExperiment,
  getBrowserAndPages,
  getVisibleTextContents,
  goToResource,
  pasteText,
  pressKey,
  step,
  typeText,
  waitFor,
  waitForElementWithTextContent,
  waitForFunction,
  withControlOrMetaKey,
} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {CONSOLE_TAB_SELECTOR, focusConsolePrompt, getCurrentConsoleMessages} from '../helpers/console-helpers.js';
import {
  clickNthChildOfSelectedElementNode,
  focusElementsTree,
  waitForContentOfSelectedElementsNode,
  waitForCSSPropertyValue,
  waitForElementsStyleSection,
} from '../helpers/elements-helpers.js';
import {setIgnoreListPattern} from '../helpers/settings-helpers.js';
import {
  addBreakpointForLine,
  clickOnContextMenu,
  getBreakpointDecorators,
  getCallFrameNames,
  getValuesForScope,
  isBreakpointSet,
  openFileInEditor,
  openSourceCodeEditorForFile,
  openSourcesPanel,
  PAUSE_INDICATOR_SELECTOR,
  refreshDevToolsAndRemoveBackendState,
  reloadPageAndWaitForSourceFile,
  removeBreakpointForLine,
  RESUME_BUTTON,
  retrieveCodeMirrorEditorContent,
  retrieveTopCallFrameScriptLocation,
  retrieveTopCallFrameWithoutResuming,
  STEP_INTO_BUTTON,
  STEP_OUT_BUTTON,
  STEP_OVER_BUTTON,
  waitForStackTopMatch,
} from '../helpers/sources-helpers.js';

async function waitForTextContent(selector: string) {
  const element = await waitFor(selector);
  return await element.evaluate(({textContent}) => textContent);
}

const DEVTOOLS_LINK = '.toolbar-item .devtools-link';
const INFOBAR_TEXT = '.infobar-info-text';

describe('The Sources Tab', async function() {
  // Some of these tests that use instrumentation breakpoints
  // can be slower on mac and windows. Increase the timeout for them.
  if (this.timeout() !== 0) {
    this.timeout(10000);
  }

  it('steps over a source line mapping to a range with several statements', async () => {
    const {target, frontend} = getBrowserAndPages();

    await openSourceCodeEditorForFile('sourcemap-stepping-source.js', 'sourcemap-stepping.html');
    let scriptEvaluation: Promise<unknown>;

    // DevTools is contracting long filenames with ellipses.
    // Let us match the location with regexp to match even contracted locations.
    const breakLocationRegExp = /.*source\.js:12$/;
    const stepLocationRegExp = /.*source\.js:13$/;

    await step('Run to breakpoint', async () => {
      await addBreakpointForLine(frontend, 12);

      scriptEvaluation = target.evaluate('singleline();');

      const scriptLocation = await waitForStackTopMatch(breakLocationRegExp);
      assert.match(scriptLocation, breakLocationRegExp);
    });

    await step('Step over the mapped line', async () => {
      await click(STEP_OVER_BUTTON);

      const stepLocation = await waitForStackTopMatch(stepLocationRegExp);
      assert.match(stepLocation, stepLocationRegExp);
    });

    await step('Resume', async () => {
      await click(RESUME_BUTTON);
      await scriptEvaluation;
    });
  });

  it('steps over a source line with mappings to several adjacent target lines', async () => {
    const {target, frontend} = getBrowserAndPages();
    await openSourceCodeEditorForFile('sourcemap-stepping-source.js', 'sourcemap-stepping.html');

    let scriptEvaluation: Promise<unknown>;

    // DevTools is contracting long filenames with ellipses.
    // Let us match the location with regexp to match even contracted locations.
    const breakLocationRegExp = /.*source\.js:4$/;
    const stepLocationRegExp = /.*source\.js:5$/;

    await step('Run to breakpoint', async () => {
      await addBreakpointForLine(frontend, 4);

      scriptEvaluation = target.evaluate('multiline();');

      const scriptLocation = await waitForStackTopMatch(breakLocationRegExp);
      assert.match(scriptLocation, breakLocationRegExp);
    });

    await step('Step over the mapped line', async () => {
      await click(STEP_OVER_BUTTON);

      const stepLocation = await waitForStackTopMatch(stepLocationRegExp);
      assert.match(stepLocation, stepLocationRegExp);
    });

    await step('Resume', async () => {
      await click(RESUME_BUTTON);
      await scriptEvaluation;
    });
  });

  it('steps out from a function, with source maps available (crbug/1283188)', async () => {
    const {target, frontend} = getBrowserAndPages();
    await openSourceCodeEditorForFile('sourcemap-stepping-source.js', 'sourcemap-stepping.html');

    let scriptEvaluation: Promise<unknown>;

    // DevTools is contracting long filenames with ellipses.
    // Let us match the location with regexp to match even contracted locations.
    const breakLocationRegExp = /.*source\.js:4$/;
    const stepLocationRegExp = /sourcemap-stepping.html:6$/;

    await step('Run to breakpoint', async () => {
      await addBreakpointForLine(frontend, 4);

      scriptEvaluation = target.evaluate('outer();');

      const scriptLocation = await waitForStackTopMatch(breakLocationRegExp);
      assert.match(scriptLocation, breakLocationRegExp);
    });

    await step('Step out from breakpoint', async () => {
      await click(STEP_OUT_BUTTON);

      const stepLocation = await waitForStackTopMatch(stepLocationRegExp);
      assert.match(stepLocation, stepLocationRegExp);
    });

    await step('Resume', async () => {
      await click(RESUME_BUTTON);
      await scriptEvaluation;
    });
  });

  it('stepping works at the end of a sourcemapped script (crbug/1305956)', async () => {
    const {target} = getBrowserAndPages();
    await openSourceCodeEditorForFile('sourcemap-stepping-at-end.js', 'sourcemap-stepping-at-end.html');

    // DevTools is contracting long filenames with ellipses.
    // Let us match the location with regexp to match even contracted locations.
    const breakLocationRegExp = /.*at-end\.js:2$/;
    const stepLocationRegExp = /.*at-end.html:6$/;

    for (const [description, button] of [
             ['into', STEP_INTO_BUTTON],
             ['out', STEP_OUT_BUTTON],
             ['over', STEP_OVER_BUTTON],
    ]) {
      let scriptEvaluation: Promise<unknown>;
      await step('Run to debugger statement', async () => {
        scriptEvaluation = target.evaluate('outer();');

        const scriptLocation = await waitForStackTopMatch(breakLocationRegExp);
        assert.match(scriptLocation, breakLocationRegExp);
      });

      await step(`Step ${description} from debugger statement`, async () => {
        await click(button);

        const stepLocation = await waitForStackTopMatch(stepLocationRegExp);
        assert.match(stepLocation, stepLocationRegExp);
      });

      await step('Resume', async () => {
        await click(RESUME_BUTTON);
        await scriptEvaluation;
      });
    }
  });

  it('shows unminified identifiers in scopes and console', async () => {
    const {target, frontend} = getBrowserAndPages();
    await openSourceCodeEditorForFile('sourcemap-minified.js', 'sourcemap-minified.html');

    let scriptEvaluation: Promise<unknown>;
    const breakLocationRegExp = /sourcemap-minified\.js:1$/;

    await step('Run to debugger statement', async () => {
      scriptEvaluation = target.evaluate('sayHello(" world");');

      const scriptLocation = await waitForStackTopMatch(breakLocationRegExp);
      assert.match(scriptLocation, breakLocationRegExp);
    });

    await step('Check local variable is eventually un-minified', async () => {
      const unminifiedVariable = 'element: div';
      await clickOnContextMenu('.cm-line', 'Add source map…');

      // Enter the source map URL into the appropriate input box.
      await waitFor('.add-source-map');
      await click('.add-source-map');
      await typeText('sourcemap-minified.map');
      await frontend.keyboard.press('Enter');

      const scopeValues = await waitForFunction(async () => {
        const values = await getValuesForScope('Local', 0, 0);
        return (values && values.includes(unminifiedVariable)) ? values : undefined;
      });
      assert.include(scopeValues, unminifiedVariable);
    });

    await step('Check that expression evaluation understands unminified name', async () => {
      await frontend.evaluate(`(async () => {
        const Root = await import('./core/root/root.js');
        Root.Runtime.experiments.setEnabled('evaluateExpressionsWithSourceMaps', true);
      })()`);

      await click(CONSOLE_TAB_SELECTOR);
      await focusConsolePrompt();
      await pasteText('`Hello${text}!`');
      await frontend.keyboard.press('Enter');

      // Wait for the console to be usable again.
      await frontend.waitForFunction(() => {
        return document.querySelectorAll('.console-user-command-result').length === 1;
      });
      const messages = await getCurrentConsoleMessages();

      assert.deepEqual(messages, ['\'Hello world!\'']);

      await openSourcesPanel();
    });

    await step('Resume', async () => {
      await click(RESUME_BUTTON);
      await scriptEvaluation;
    });
  });

  it('shows unminified identifiers in scopes with minified names clash and nested scopes', async () => {
    const {target, frontend} = getBrowserAndPages();
    await openSourceCodeEditorForFile('sourcemap-scopes-minified.js', 'sourcemap-scopes-minified.html');

    let scriptEvaluation: Promise<unknown>;
    const breakLocationOuterRegExp = /sourcemap-scopes-minified\.js:2$/;
    const breakLocationInnerRegExp = /sourcemap-scopes-minified\.js:5$/;

    const outerUnminifiedVariable = 'arg0: 10';
    const innerUnminifiedVariable = 'loop_var: 0';

    await step('Run to outer scope breakpoint', async () => {
      await addBreakpointForLine(frontend, 2);

      scriptEvaluation = target.evaluate('foo(10);');

      const scriptLocation = await waitForStackTopMatch(breakLocationOuterRegExp);
      assert.match(scriptLocation, breakLocationOuterRegExp);
    });

    await step('Check local scope variable is eventually un-minified', async () => {
      const scopeValues = await waitForFunction(async () => {
        const values = await getValuesForScope('Local', 0, 0);
        return (values && values.includes(outerUnminifiedVariable)) ? values : undefined;
      });
      assert.include(scopeValues, outerUnminifiedVariable);
    });

    await step('Resume from outer breakpoint', async () => {
      await addBreakpointForLine(frontend, 5);
      await click(RESUME_BUTTON);
      const scriptLocation = await waitForStackTopMatch(breakLocationInnerRegExp);
      assert.match(scriptLocation, breakLocationInnerRegExp);
    });

    await step('Check local and block scope variables are eventually un-minified', async () => {
      const blockScopeValues = await waitForFunction(async () => {
        const values = await getValuesForScope('Block', 0, 0);
        return (values && values.includes(innerUnminifiedVariable)) ? values : undefined;
      });
      assert.include(blockScopeValues, innerUnminifiedVariable);

      const scopeValues = await waitForFunction(async () => {
        const values = await getValuesForScope('Local', 0, 0);
        return (values && values.includes(outerUnminifiedVariable)) ? values : undefined;
      });
      assert.include(scopeValues, outerUnminifiedVariable);
    });

    await step('Resume from inner breakpoint', async () => {
      await removeBreakpointForLine(frontend, 2);
      await removeBreakpointForLine(frontend, 5);
      await click(RESUME_BUTTON);
      await scriptEvaluation;
    });
  });

  it('shows unminified function name in stack trace', async () => {
    const {target, frontend} = getBrowserAndPages();
    await openSourceCodeEditorForFile(
        'sourcemap-minified-function-name-compiled.js', 'sourcemap-minified-function-name.html');

    let scriptEvaluation: Promise<unknown>;
    const breakLocationOuterRegExp = /sourcemap-.*-compiled\.js:1$/;

    await step('Run to breakpoint', async () => {
      scriptEvaluation = target.evaluate('o(1, 2)');

      const scriptLocation = await waitForStackTopMatch(breakLocationOuterRegExp);
      assert.match(scriptLocation, breakLocationOuterRegExp);
    });

    await step('Add source map', async () => {
      await clickOnContextMenu('.cm-line', 'Add source map…');

      // Enter the source map URL into the appropriate input box.
      await click('.add-source-map');
      await typeText('sourcemap-minified-function-name-compiled.map');
      await frontend.keyboard.press('Enter');
    });

    await step('Check function name is eventually un-minified', async () => {
      const functionName = await waitForFunction(async () => {
        const functionName = await waitForTextContent('.call-frame-title-text');
        return functionName && functionName === 'unminified' ? functionName : undefined;
      });
      assert.strictEqual(functionName, 'unminified');
    });

    await step('Resume execution', async () => {
      await click(RESUME_BUTTON);
      await scriptEvaluation;
    });
  });

  // TODO(crbug.com/1346228) Flaky - timeouts.
  it.skip('[crbug.com/1346228] automatically ignore-lists third party code from source maps', async function() {
    const {target} = getBrowserAndPages();
    await openSourceCodeEditorForFile('webpack-main.js', 'webpack-index.html');

    let scriptEvaluation: Promise<unknown>;
    const breakLocationOuterRegExp = /index\.js:12$/;

    await step('Run to breakpoint', async () => {
      scriptEvaluation = target.evaluate('window.foo()');

      const scriptLocation = await waitForStackTopMatch(breakLocationOuterRegExp);
      assert.match(scriptLocation, breakLocationOuterRegExp);
      assert.deepEqual(await getCallFrameNames(), ['baz', 'bar', 'foo', '(anonymous)']);
    });

    await step('Toggle to show ignore-listed frames', async () => {
      await click('.ignore-listed-message-label');
      await waitFor('.ignore-listed-call-frame:not(.hidden)');
      assert.deepEqual(await getCallFrameNames(), ['baz', 'vendor', 'bar', 'foo', '(anonymous)']);
    });

    await step('Toggle back off', async () => {
      await click('.ignore-listed-message-label');
      await waitFor('.ignore-listed-call-frame.hidden');
      assert.deepEqual(await getCallFrameNames(), ['baz', 'bar', 'foo', '(anonymous)']);
    });

    await step('Resume execution', async () => {
      await click(RESUME_BUTTON);
      await scriptEvaluation;
    });
  });

  it('updates decorators for removed breakpoints in case of code-splitting (crbug.com/1251675)', async () => {
    const {frontend} = getBrowserAndPages();
    await openSourceCodeEditorForFile('sourcemap-disjoint.js', 'sourcemap-disjoint.html');
    assert.deepEqual(await getBreakpointDecorators(), []);
    await addBreakpointForLine(frontend, 2);
    assert.deepEqual(await getBreakpointDecorators(), [2]);
    await removeBreakpointForLine(frontend, 2);
    assert.deepEqual(await getBreakpointDecorators(), []);
  });

  it('reliably hits breakpoints on worker with source map', async () => {
    await enableExperiment('instrumentationBreakpoints');
    const {target, frontend} = getBrowserAndPages();
    await openSourceCodeEditorForFile('sourcemap-stepping-source.js', 'sourcemap-breakpoint.html');

    await step('Add a breakpoint at first line of function multiline', async () => {
      await addBreakpointForLine(frontend, 4);
    });

    await step('Navigate to a different site to refresh devtools and remove back-end state', async () => {
      await refreshDevToolsAndRemoveBackendState(target);
    });

    await step('Navigate back to test page', () => {
      void goToResource('sources/sourcemap-breakpoint.html');
    });

    await step('wait for pause and check if we stopped at line 4', async () => {
      await waitFor(PAUSE_INDICATOR_SELECTOR);
      await waitForFunction(async () => {
        const topCallFrame = await retrieveTopCallFrameWithoutResuming();
        return topCallFrame === 'sourcemap-stepping-source.js:4';
      });
    });

    await step('Resume', async () => {
      await click(RESUME_BUTTON);
    });
  });

  it('links to the correct origins for source-mapped resources', async () => {
    await goToResource('sources/sourcemap-origin.html');
    await openSourcesPanel();

    await step('Check origin of source-mapped JavaScript', async () => {
      await openFileInEditor('sourcemap-origin.js');
      const linkText = await waitForTextContent(DEVTOOLS_LINK);
      assert.strictEqual(linkText, 'sourcemap-origin.min.js');
    });

    await step('Check origin of source-mapped SASS', async () => {
      await openFileInEditor('sourcemap-origin.scss');
      const linkText = await waitForTextContent(DEVTOOLS_LINK);
      assert.strictEqual(linkText, 'sourcemap-origin.css');
    });

    await step('Check origin of source-mapped JavaScript with URL clash', async () => {
      await openFileInEditor('sourcemap-origin.clash.js');
      const linkText = await waitForTextContent(DEVTOOLS_LINK);
      assert.strictEqual(linkText, 'sourcemap-origin.clash.js');
    });
  });

  it('shows Source map loaded infobar', async () => {
    await goToResource('sources/sourcemap-origin.html');
    await openSourcesPanel();

    await step('Get infobar text', async () => {
      await openFileInEditor('sourcemap-origin.min.js');
      const infobarText = await waitForTextContent(INFOBAR_TEXT);
      assert.strictEqual(infobarText, 'Source map loaded.');
    });
  });

  it('shows Source map loaded infobar after attaching', async () => {
    const {frontend} = getBrowserAndPages();
    await openSourceCodeEditorForFile('sourcemap-minified.js', 'sourcemap-minified.html');

    await step('Attach source map', async () => {
      await clickOnContextMenu('.cm-line', 'Add source map…');

      // Enter the source map URL into the appropriate input box.
      await click('.add-source-map');
      await typeText('sourcemap-minified.map');
      await frontend.keyboard.press('Enter');
    });

    await step('Get infobar text', async () => {
      const infobarText = await waitForTextContent(INFOBAR_TEXT);
      assert.strictEqual(infobarText, 'Source map loaded.');
    });
  });

  it('shows Source map skipped infobar', async () => {
    await setIgnoreListPattern('.min.js');
    await openSourceCodeEditorForFile('sourcemap-origin.min.js', 'sourcemap-origin.html');

    await step('Get infobar texts', async () => {
      await openFileInEditor('sourcemap-origin.min.js');
      await waitFor('.infobar-warning');
      await waitFor('.infobar-info');
      const infobarTexts = await getVisibleTextContents(INFOBAR_TEXT);
      assert.deepEqual(
          infobarTexts, ['This script is on the debugger\'s ignore list', 'Source map skipped for this file.']);
    });
  });

  it('shows Source map error infobar after failing to attach', async () => {
    const {frontend} = getBrowserAndPages();
    await openSourceCodeEditorForFile('sourcemap-minified.js', 'sourcemap-minified.html');

    await step('Attach source map', async () => {
      await clickOnContextMenu('.cm-line', 'Add source map…');

      // Enter the source map URL into the appropriate input box.
      await click('.add-source-map');
      await typeText('sourcemap-invalid.map');
      await frontend.keyboard.press('Enter');
    });

    await step('Get infobar text', async () => {
      const infobarText = await waitForTextContent(INFOBAR_TEXT);
      assert.strictEqual(infobarText, 'Source map failed to load.');
    });
  });

  describe('can deal with code-splitting', () => {
    it('sets multiple breakpoints in case of code-splitting', async () => {
      const {target, frontend} = getBrowserAndPages();
      await openSourceCodeEditorForFile('sourcemap-codesplit.ts', 'sourcemap-codesplit.html');
      await addBreakpointForLine(frontend, 3);

      for (let i = 0; i < 2; ++i) {
        const scriptLocation = await retrieveTopCallFrameScriptLocation(`functions[${i}]();`, target);
        assert.deepEqual(scriptLocation, 'sourcemap-codesplit.ts:3');
      }
    });

    it('restores breakpoints correctly in case of code-splitting (crbug.com/1412033)', async () => {
      const {target, frontend} = getBrowserAndPages();

      // Load the initial setup with only one script pointing to `codesplitting-bar.ts`...
      await openSourceCodeEditorForFile('codesplitting-bar.ts', 'codesplitting.html');

      // ...and set a breakpoint inside `bar()`.
      await addBreakpointForLine(frontend, 2);

      // Now load the second script pointing to `codesplitting-bar.ts`...
      await target.evaluate('addSecond();');

      // ...wait for the new origin to be listed...
      const linkTexts = await waitForFunction(async () => {
        const links = await $$(DEVTOOLS_LINK);
        const linkTexts = await Promise.all(links.map(node => node.evaluate(({textContent}) => textContent)));
        if (linkTexts.length === 1 && linkTexts[0] === 'codesplitting-first.js') {
          return undefined;
        }
        return linkTexts;
      });
      assert.sameMembers(linkTexts, ['codesplitting-first.js', 'codesplitting-second.js']);

      // ...and eventually wait for the breakpoint to be restored in line 2.
      await waitForFunction(async () => await isBreakpointSet(2));

      // Eventually we should stop on the breakpoint in the `codesplitting-second.js`.
      await waitForFunction(() => {
        return Promise.race([
          target.evaluate('second()').then(() => false),
          waitFor(PAUSE_INDICATOR_SELECTOR).then(() => true),
        ]);
      });
      await click(RESUME_BUTTON);
    });

    it('hits breakpoints reliably after reload in case of code-splitting (crbug.com/1490369)', async () => {
      const {target, frontend} = getBrowserAndPages();

      // Set the breakpoint inside `shared()` in `shared.js`.
      await openSourceCodeEditorForFile('shared.js', 'codesplitting-race.html');
      await addBreakpointForLine(frontend, 2);
      await waitForFunction(async () => await isBreakpointSet(2));

      // Reload the page.
      const reloadPromise = target.reload();

      // Now the debugger should pause twice reliably.
      await waitFor(PAUSE_INDICATOR_SELECTOR);
      await click(RESUME_BUTTON);
      await waitFor(PAUSE_INDICATOR_SELECTOR);
      await click(RESUME_BUTTON);

      await reloadPromise;
    });
  });

  describe('can deal with hot module replacement', () => {
    // The tests in here simulate Hot Module Replacement (HMR) workflows related
    // to how DevTools deals with source maps in these situations.

    it('correctly handles URL clashes between compiled and source-mapped scripts', async () => {
      const {target} = getBrowserAndPages();

      // Load the "initial bundle"...
      await openSourceCodeEditorForFile('index.js', 'sourcemap-hmr.html');

      // ...and check that index.js content is as expected.
      // In particular, this asserts that the front-end does not get creative in
      // appending suffixes like '? [sm]' to the index.js here.
      const initialContent = await retrieveCodeMirrorEditorContent();
      assert.deepEqual(initialContent, [
        'globalThis.hello = () => {',
        '  console.log("Hello world!");',
        '}',
        '',
      ]);

      // Simulate the hot module replacement for index.js...
      await target.evaluate('update();');

      // ...and wait for its content to load (should just replace
      // the existing tab contents for index.js). We perform this
      // check by waiting until the editor contents differ from
      // the initial contents, and then asserting that it looks
      // as expected afterwards.
      const updatedContent = await waitForFunction(async () => {
        const content = await retrieveCodeMirrorEditorContent();
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

    it('correctly maintains breakpoints from initial bundle to replacement', async () => {
      const {target, frontend} = getBrowserAndPages();

      // Load the "initial bundle" and set a breakpoint on the second line.
      await openSourceCodeEditorForFile('index.js', 'sourcemap-hmr.html');
      await addBreakpointForLine(frontend, 2);

      // Simulate the hot module replacement for index.js
      await target.evaluate('update();');

      // Wait for the "hot module replacement" to take effect for index.js.
      await waitForFunction(async () => {
        const content = await retrieveCodeMirrorEditorContent();
        return content[1].includes('UPDATED');
      });

      // Wait for the breakpoint to appear on line 2 of the updated index.js.
      await waitForFunction(async () => await isBreakpointSet(2));
    });

    it('correctly maintains breakpoints from replacement to initial bundle (across reloads)', async () => {
      const {target, frontend} = getBrowserAndPages();

      // Load the "initial bundle".
      await openSourceCodeEditorForFile('index.js', 'sourcemap-hmr.html');

      // Simulate the hot module replacement for index.js
      await target.evaluate('update();');

      // Wait for the "hot module replacement" to take effect for index.js.
      await waitForFunction(async () => {
        const content = await retrieveCodeMirrorEditorContent();
        return content[1].includes('UPDATED');
      });

      // Set a breakpoint on the second line.
      await addBreakpointForLine(frontend, 2);

      // Reload the page and re-open (the initial) index.js.
      await reloadPageAndWaitForSourceFile(target, 'index.js');

      // Check that the breakpoint still exists on line 2.
      assert.isTrue(await isBreakpointSet(2));
    });
  });

  it('can attach sourcemaps to CSS files from a context menu', async () => {
    await openSourceCodeEditorForFile('sourcemap-css.css', 'sourcemap-css-noinline.html');

    await click('aria/Code editor', {clickOptions: {button: 'right'}});
    await click('aria/Add source map…');
    await waitFor('.add-source-map');
    await typeText('sourcemap-css-absolute.map');
    await pressKey('Enter');

    await waitFor('[aria-label="app.scss, file"]');
  });
});

describe('The Elements Tab', async () => {
  async function clickStyleValueWithModifiers(selector: string, name: string, value: string, location: string) {
    const element = await waitForCSSPropertyValue(selector, name, value, location);
    // Click with offset to skip swatches.
    await withControlOrMetaKey(() => clickElement(element, {clickOptions: {offset: {x: 20, y: 5}}}));
  }

  it('links to the right SASS source for inline CSS with relative sourcemap (crbug.com/787792)', async () => {
    await goToResource('sources/sourcemap-css-inline-relative.html');
    await step('Prepare elements tab', async () => {
      await waitForElementsStyleSection();
      await waitForContentOfSelectedElementsNode('<body>\u200B');
      await focusElementsTree();
      await clickNthChildOfSelectedElementNode(1);
    });
    await clickStyleValueWithModifiers('body .text', 'color', 'green', 'app.scss:6');
    await waitForElementWithTextContent('Line 12, Column 9');
  });

  it('links to the right SASS source for inline CSS with absolute sourcemap (crbug.com/787792)', async () => {
    await goToResource('sources/sourcemap-css-dynamic-link.html');
    await step('Prepare elements tab', async () => {
      await waitForElementsStyleSection();
      await waitForContentOfSelectedElementsNode('<body>\u200B');
      await focusElementsTree();
      await clickNthChildOfSelectedElementNode(1);
    });
    await clickStyleValueWithModifiers('body .text', 'color', 'green', 'app.scss:6');
    await waitForElementWithTextContent('Line 12, Column 9');
  });

  it('links to the right SASS source for dynamically added CSS style tags (crbug.com/787792)', async () => {
    await goToResource('sources/sourcemap-css-dynamic.html');
    await step('Prepare elements tab', async () => {
      await waitForElementsStyleSection();
      await waitForContentOfSelectedElementsNode('<body>\u200B');
      await focusElementsTree();
      await clickNthChildOfSelectedElementNode(1);
    });
    await clickStyleValueWithModifiers('body .text', 'color', 'green', 'app.scss:6');
    await waitForElementWithTextContent('Line 12, Column 9');
  });

  it('links to the right SASS source for dynamically added CSS link tags (crbug.com/787792)', async () => {
    await goToResource('sources/sourcemap-css-dynamic-link.html');
    await step('Prepare elements tab', async () => {
      await waitForElementsStyleSection();
      await waitForContentOfSelectedElementsNode('<body>\u200B');
      await focusElementsTree();
      await clickNthChildOfSelectedElementNode(1);
    });
    await clickStyleValueWithModifiers('body .text', 'color', 'green', 'app.scss:6');
    await waitForElementWithTextContent('Line 12, Column 9');
  });
});
