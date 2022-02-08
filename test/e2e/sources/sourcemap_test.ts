// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {click, getBrowserAndPages, goToResource, step, typeText, waitFor, waitForElementWithTextContent, waitForFunction, waitForFunctionWithTries} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {clickNthChildOfSelectedElementNode, focusElementsTree, waitForContentOfSelectedElementsNode, waitForCSSPropertyValue, waitForElementsStyleSection} from '../helpers/elements-helpers.js';
import {addBreakpointForLine, clickOnContextMenu, getBreakpointDecorators, getValuesForScope, openSourceCodeEditorForFile, removeBreakpointForLine, RESUME_BUTTON, retrieveTopCallFrameScriptLocation, retrieveTopCallFrameWithoutResuming, STEP_OUT_BUTTON, STEP_OVER_BUTTON} from '../helpers/sources-helpers.js';

describe('The Sources Tab', async () => {
  // Flaky test.
  it.skip('[crbug.com/1272490] sets multiple breakpoints in case of code-splitting', async () => {
    const {target, frontend} = getBrowserAndPages();
    await openSourceCodeEditorForFile('sourcemap-codesplit.ts', 'sourcemap-codesplit.html');
    await addBreakpointForLine(frontend, 3);

    const scriptLocation0 = await retrieveTopCallFrameScriptLocation('functions[0]();', target);
    assert.deepEqual(scriptLocation0, 'sourcemap-codesplit.ts:3');

    await target.evaluate(
        'var s = document.createElement("script"); s.src = "sourcemap-codesplit2.js"; document.body.appendChild(s);');

    // Wait for the sourcemap of sourcemap-codesplit2.js to load, which is
    // indicated by the status text in the toolbar of the Sources panel.
    const toolbarHandle = await waitFor('.sources-toolbar');
    await waitForElementWithTextContent('sourcemap-codesplit2.js', toolbarHandle);

    const scriptLocation1 = await retrieveTopCallFrameScriptLocation('functions[1]();', target);
    assert.deepEqual(scriptLocation1, 'sourcemap-codesplit.ts:3');
  });

  async function waitForStackTopMatch(matcher: RegExp) {
    // The call stack is updated asynchronously, so let us wait until we see the correct one
    // (or report the last one we have seen before timeout).
    let stepLocation = '<no call stack>';
    await waitForFunctionWithTries(async () => {
      stepLocation = await retrieveTopCallFrameWithoutResuming() ?? '<invalid>';
      return stepLocation?.match(matcher);
    }, {tries: 10});
    return stepLocation;
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

  it('shows unminified identifiers in scopes', async () => {
    const {target, frontend} = getBrowserAndPages();
    await openSourceCodeEditorForFile('sourcemap-minified.js', 'sourcemap-minified.html');

    let scriptEvaluation: Promise<unknown>;
    const breakLocationRegExp = /sourcemap-minified\.js:1$/;

    await step('Run to debugger statement', async () => {
      scriptEvaluation = target.evaluate('sayHello();');

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

    await step('Resume', async () => {
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
});

describe('The Elements Tab', async () => {
  it('links to the right SASS source for inline CSS with relative sourcemap (crbug.com/787792)', async () => {
    await goToResource('sources/sourcemap-css-inline-relative.html');
    await step('Prepare elements tab', async () => {
      await waitForElementsStyleSection();
      await waitForContentOfSelectedElementsNode('<body>\u200B');
      await focusElementsTree();
      await clickNthChildOfSelectedElementNode(1);
    });
    const value = await waitForCSSPropertyValue('body .text', 'color', 'green', 'app.scss:6');
    await click(value, {clickOptions: {modifier: 'ControlOrMeta'}});
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
    const value = await waitForCSSPropertyValue('body .text', 'color', 'green', 'app.scss:6');
    await click(value, {clickOptions: {modifier: 'ControlOrMeta'}});
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
    const value = await waitForCSSPropertyValue('body .text', 'color', 'green', 'app.scss:6');
    await click(value, {clickOptions: {modifier: 'ControlOrMeta'}});
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
    const value = await waitForCSSPropertyValue('body .text', 'color', 'green', 'app.scss:6');
    await click(value, {clickOptions: {modifier: 'ControlOrMeta'}});
    await waitForElementWithTextContent('Line 12, Column 9');
  });
});
