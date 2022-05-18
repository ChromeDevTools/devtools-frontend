// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  click,
  enableExperiment,
  getBrowserAndPages,
  goToResource,
  pasteText,
  step,
  typeText,
  waitFor,
  waitForElementWithTextContent,
  waitForFunction,
  waitForFunctionWithTries,
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
import {
  addBreakpointForLine,
  clickOnContextMenu,
  getBreakpointDecorators,
  getValuesForScope,
  openSourceCodeEditorForFile,
  openSourcesPanel,
  PAUSE_INDICATOR_SELECTOR,
  refreshDevToolsAndRemoveBackendState,
  removeBreakpointForLine,
  RESUME_BUTTON,
  retrieveTopCallFrameScriptLocation,
  retrieveTopCallFrameWithoutResuming,
  STEP_INTO_BUTTON,
  STEP_OUT_BUTTON,
  STEP_OVER_BUTTON,
} from '../helpers/sources-helpers.js';

describe('The Sources Tab', async function() {
  // Some of these tests that use instrumentation breakpoints
  // can be slower on mac and windows. Increase the timeout for them.
  if (this.timeout() !== 0) {
    this.timeout(10000);
  }

  it('sets multiple breakpoints in case of code-splitting', async () => {
    const {target, frontend} = getBrowserAndPages();
    await openSourceCodeEditorForFile('sourcemap-codesplit.ts', 'sourcemap-codesplit.html');
    await addBreakpointForLine(frontend, 3);

    for (let i = 0; i < 2; ++i) {
      const scriptLocation = await retrieveTopCallFrameScriptLocation(`functions[${i}]();`, target);
      assert.deepEqual(scriptLocation, 'sourcemap-codesplit.ts:3');
    }
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
      await frontend.evaluate(() => {
        // @ts-ignore
        globalThis.Root.Runtime.experiments.setEnabled('evaluateExpressionsWithSourceMaps', true);
      });

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

  it('updates decorators for removed breakpoints in case of code-splitting (crbug.com/1251675)', async () => {
    const {frontend} = getBrowserAndPages();
    await openSourceCodeEditorForFile('sourcemap-disjoint.js', 'sourcemap-disjoint.html');
    assert.deepEqual(await getBreakpointDecorators(), []);
    await addBreakpointForLine(frontend, 2);
    assert.deepEqual(await getBreakpointDecorators(), [2]);
    await removeBreakpointForLine(frontend, 2);
    assert.deepEqual(await getBreakpointDecorators(), []);
  });

  it(
      'reliably hits breakpoints on worker with source map', async () => {
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
