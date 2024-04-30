// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {type ElementHandle, type JSHandle} from 'puppeteer-core';

import {
  CONSOLE_TAB_SELECTOR,
  focusConsolePrompt,
  typeIntoConsoleAndWaitForResult,
} from 'test/e2e/helpers/console-helpers.js';
import {
  addBreakpointForLine,
  CODE_LINE_SELECTOR,
  openFileInEditor,
  openSourcesPanel,
  PAUSE_INDICATOR_SELECTOR,
  removeBreakpointForLine,
  RESUME_BUTTON,
  retrieveTopCallFrameWithoutResuming,
  SELECTED_THREAD_SELECTOR,
} from 'test/e2e/helpers/sources-helpers.js';
import {
  $$,
  assertNotNullOrUndefined,
  click,
  clickElement,
  debuggerStatement,
  getBrowserAndPages,
  getPendingEvents,
  installEventListener,
  timeout,
  waitFor,
  waitForFunction,
} from 'test/shared/helper.js';
import {describe, it} from 'test/shared/mocha-extensions.js';

import {
  loadTests,
  openTestSuiteResourceInSourcesPanel,
  type Action,
} from './cxx-debugging-extension-helpers.js';

const STEP_OVER_BUTTON = '[aria-label="Step over next function call"]';
const STEP_OUT_BUTTON = '[aria-label="Step out of current function"]';
const STEP_INTO_BUTTON = '[aria-label="Step into next function call"]';

function pausedReasonText(reason: string) {
  switch (reason) {
    case 'breakpoint':
      return 'Paused on breakpoint';
    case 'step':
      return 'Debugger paused';
  }
}

describe('CXX Debugging Extension Test Suite', function() {
  for (const {name, test, script} of loadTests()) {
    if (!script) {
      continue;
    }
    it(name, async () => {
      const {frontend} = getBrowserAndPages();
      try {
        await openTestSuiteResourceInSourcesPanel(test);
        await installEventListener(frontend, 'DevTools.DebuggerPaused');

        if (script === null || script.length === 0) {
          return;
        }

        for (const paused of script) {
          const {file, line, reason, variables, evaluations, thread, actions} = paused;
          if (reason === 'setup') {
            if (paused !== script[0]) {
              throw new Error('`setup` actions can only be the first step');
            }

            if (!actions) {
              throw new Error('The `setup` step must define actions');
            }

            // Perform initial setup
            await doActions({actions, reason});
            continue;
          }

          await waitForFunction(
              async () => ((await getPendingEvents(frontend, 'DevTools.DebuggerPaused')) || []).length > 0);

          const stopped = await waitFor(PAUSE_INDICATOR_SELECTOR);
          const stoppedText = await waitForFunction(async () => stopped.evaluate(node => node.textContent));

          assert.equal(stoppedText, pausedReasonText(reason));

          const pausedLocation = await retrieveTopCallFrameWithoutResuming();
          if (pausedLocation?.includes('…')) {
            const pausedLocationSplit = pausedLocation.split('…');
            assert.isTrue(
                `${file}:${line}`.startsWith(pausedLocationSplit[0]),
                `expected ${file}:${line} to start with ${pausedLocationSplit[0]}`);
            assert.isTrue(
                `${file}:${line}`.endsWith(pausedLocationSplit[1]),
                `expected ${file}:${line} to end with ${pausedLocationSplit[1]}`);
          } else {
            assert.deepEqual(pausedLocation, `${file}:${line}`);
          }

          if (variables) {
            for (const {name, type: variableType, value} of variables) {
              const [scope, ...variableFields] = name.split('.');
              const scopeViewEntry = await readScopeView(scope, variableFields);
              assert.isAbove(scopeViewEntry.length, 0);
              const scopeVariable = scopeViewEntry[scopeViewEntry.length - 1];
              const variableName = variableFields[variableFields.length - 1];

              if (variableName.startsWith('$')) {
                if (variableType) {
                  assert.isTrue(scopeVariable && scopeVariable.endsWith(`: ${variableType}`));
                } else if (value) {
                  assert.isTrue(scopeVariable && scopeVariable.endsWith(`: ${value}`));
                }
              } else {
                if (variableType) {
                  assert.equal(scopeVariable, `${variableName}: ${variableType}`);
                } else if (value) {
                  assert.equal(scopeVariable, `${variableName}: ${value}`);
                }
              }
            }
          }

          if (evaluations) {
            // TODO(jarin) Without waiting here, the FE often misses the click on the console tab.
            await timeout(500);
            await click(CONSOLE_TAB_SELECTOR);
            await focusConsolePrompt();

            for (const {expression, value} of evaluations) {
              await typeIntoConsoleAndWaitForResult(frontend, expression);
              const evaluateResults = await frontend.evaluate(() => {
                return Array.from(document.querySelectorAll('.console-user-command-result'))
                    .map(node => node.textContent);
              });
              const result = evaluateResults[evaluateResults.length - 1];
              assert.equal(result, value.toString());
            }

            await openSourcesPanel();
          }

          if (thread) {
            const threadElement = await waitFor(SELECTED_THREAD_SELECTOR);
            const threadText = await waitForFunction(async () => threadElement.evaluate(node => node.textContent));
            assert.include(threadText, thread, 'selected thread is not as expected');
          }

          // Run actions or resume
          await doActions(paused);
        }
      } catch (e) {
        console.error(e.toString());
        if (process.env['DEBUG_TEST']) {
          await timeout(100000);
        }
        throw e;
      }
    });
  }
});

async function readScopeView(scope: string, variable: string[]) {
  const scopeElement = await waitFor(`[aria-label="${scope}"]`);
  if (scopeElement === null) {
    throw new Error(`Scope entry for ${scope} not found`);
  }

  let parentNode = await scopeElement.evaluateHandle(n => n.nextElementSibling);
  assert(parentNode, 'Scope element has no siblings');

  const result = [];
  for (const node of variable) {
    const elementHandle: ElementHandle<Element> = await getMember(node, parentNode);
    const isExpanded = await elementHandle.evaluate((node: Element) => {
      node.scrollIntoView();
      return node.getAttribute('aria-expanded');
    });

    const name = await elementHandle.$('.name-and-value');
    if (isExpanded === 'false') {
      // Clicking on an expandable element with the memory icon can result in
      // unintentional click on the icon. This opens the memory viewer but does
      // not propagate the click event, so the element does not expand.
      // Selecting a child element instead eliminates this issue.
      if (name) {
        await clickElement(name);
      } else {
        await clickElement(elementHandle);
      }
    }

    if (name) {
      result.push(await name.evaluate(node => node.textContent));
    }

    parentNode = await elementHandle.evaluateHandle(n => n.nextElementSibling);
    assert(parentNode, 'Element has no siblings');
  }
  return result;

  async function getMember(name: string, parentNode: ElementHandle|JSHandle<null>): Promise<ElementHandle<Element>> {
    if (name.startsWith('$')) {
      const index = parseInt(name.slice(1), 10);
      if (!isNaN(index)) {
        const members = await waitForFunction(async () => {
          const elements = await $$('li', parentNode);
          if (elements.length > index) {
            return elements;
          }
          return undefined;
        });
        return members[index];
      }
    }
    const elementHandle: ElementHandle<Element> =
        await waitFor(`[data-object-property-name-for-test="${name}"]`, parentNode);
    return elementHandle;
  }
}

async function scrollToLine(lineNumber: number): Promise<void> {
  await waitForFunction(async () => {
    const visibleLines = await $$(CODE_LINE_SELECTOR);
    assertNotNullOrUndefined(visibleLines[0]);
    const lineNumbers = await Promise.all(visibleLines.map(v => v.evaluate(e => Number(e.textContent ?? ''))));
    if (lineNumbers.includes(lineNumber)) {
      return true;
    }
    // CM has some extra lines at the beginning and end, so pick the middle line to determine scrolling direction
    const mid = lineNumbers[Math.floor(lineNumbers.length / 2)];
    await visibleLines[0].press(mid < lineNumber ? 'PageDown' : 'PageUp');
    return false;
  });
}

async function doActions({actions, reason}: {actions?: Action[], reason: string}) {
  const {frontend, target} = getBrowserAndPages();
  let continuation;
  if (actions) {
    for (const step of actions) {
      const {action} = step;
      switch (action) {
        case 'set_breakpoint': {
          const {file, breakpoint} = step;
          if (!file) {
            throw new Error('Invalid breakpoint spec: missing `file`');
          }
          if (!breakpoint) {
            throw new Error('Invalid breakpoint spec: missing `breakpoint`');
          }
          await openFileInEditor(file);
          await scrollToLine(Number(breakpoint));
          await addBreakpointForLine(frontend, breakpoint);
          break;
        }
        case 'remove_breakpoint': {
          const {breakpoint} = step;
          if (!breakpoint) {
            throw new Error('Invalid breakpoint spec: missing `breakpoint`');
          }
          await scrollToLine(Number(breakpoint));
          await removeBreakpointForLine(frontend, breakpoint);
          break;
        }
        case 'step_over':
        case 'step_out':
        case 'step_into':
        case 'resume':
        case 'reload':
          if (reason === 'setup') {
            throw new Error(`The 'setup' reason cannot contain a continue action such as '${action}'`);
          }
          continuation = action;
          break;
        default:
          throw new Error(`Unknown action "${action}"`);
      }
    }
  }

  if (reason === 'setup') {
    continuation = 'reload';
  }

  switch (continuation) {
    case 'step_over':
      await click(STEP_OVER_BUTTON);
      break;
    case 'step_out':
      await click(STEP_OUT_BUTTON);
      break;
    case 'step_into':
      await click(STEP_INTO_BUTTON);
      break;
    case 'reload':
      await target.reload();
      break;
    default:
      await waitFor(RESUME_BUTTON);
      await click(RESUME_BUTTON);
      break;
  }
}
