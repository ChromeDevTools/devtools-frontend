// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import * as puppeteer from 'puppeteer';

import {$, click, getBrowserAndPages, goToResource, step, timeout, waitFor, waitForFunction} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {addBreakpointForLine, checkBreakpointDidNotActivate, checkBreakpointIsActive, checkBreakpointIsNotActive, clearSourceFilesAdded, getBreakpointDecorators, getNonBreakableLines, listenForSourceFilesAdded, openSourceCodeEditorForFile, openSourcesPanel, RESUME_BUTTON, retrieveSourceFilesAdded, retrieveTopCallFrameScriptLocation, retrieveTopCallFrameWithoutResuming, SCOPE_LOCAL_VALUES_SELECTOR, SELECTED_THREAD_SELECTOR, sourceLineNumberSelector, stepThroughTheCode, TURNED_OFF_PAUSE_BUTTON_SELECTOR, waitForAdditionalSourceFiles, waitForSourceCodeLines} from '../helpers/sources-helpers.js';

describe('Sources Tab', async function() {
  // The tests in this suite are particularly slow, as they perform a lot of actions
  this.timeout(10000);

  // Disabled to the Chromium binary -> DevTools roller working again.
  it('shows the correct wasm source on load and reload', async () => {
    async function checkSources(frontend: puppeteer.Page) {
      await waitForAdditionalSourceFiles(frontend, 2);
      const capturedFileNames = await retrieveSourceFilesAdded(frontend);
      assert.deepEqual(
          capturedFileNames,
          ['/test/e2e/resources/sources/wasm/call-to-add-wasm.html', '/test/e2e/resources/sources/wasm/add.wasm']);
    }
    const {target, frontend} = getBrowserAndPages();
    await openSourcesPanel();

    await listenForSourceFilesAdded(frontend);
    await goToResource('sources/wasm/call-to-add-wasm.html');
    await checkSources(frontend);

    await clearSourceFilesAdded(frontend);
    await target.reload();
    await checkSources(frontend);
  });

  it('can add a breakpoint in raw wasm', async () => {
    const {target, frontend} = getBrowserAndPages();

    await openSourceCodeEditorForFile('add.wasm', 'wasm/call-to-add-wasm.html');
    await addBreakpointForLine(frontend, 3);

    const scriptLocation = await retrieveTopCallFrameScriptLocation('main();', target);
    assert.deepEqual(scriptLocation, 'add.wasm:0x23');
  });

  it('hits two breakpoints that are set and activated separately', async function() {
    const {target, frontend} = getBrowserAndPages();

    await step('navigate to a page and open the Sources tab', async () => {
      await openSourceCodeEditorForFile('add.wasm', 'wasm/call-to-add-wasm.html');
    });

    const numberOfLines = 7;

    await step('wait for all the source code to appear', async () => {
      await waitForSourceCodeLines(numberOfLines);
    });
    await step('add a breakpoint to line No.5', async () => {
      await addBreakpointForLine(frontend, 5);
    });

    await step('reload the page', async () => {
      await target.reload();
      // FIXME(crbug/1112692): Refactor test to remove the timeout.
      await timeout(100);
    });

    await step('wait for all the source code to appear', async () => {
      await waitForSourceCodeLines(numberOfLines);
    });

    await checkBreakpointIsActive(5);

    await step('check that the code has paused on the breakpoint at the correct script location', async () => {
      const scriptLocation = await retrieveTopCallFrameWithoutResuming();
      assert.deepEqual(scriptLocation, 'add.wasm:0x27');
    });

    await step('remove the breakpoint from the fifth line', async () => {
      await click(sourceLineNumberSelector(5));
    });

    await step('reload the page', async () => {
      await target.reload();
      // FIXME(crbug/1112692): Refactor test to remove the timeout.
      await timeout(100);
    });

    await step('wait for all the source code to appear', async () => {
      await waitForSourceCodeLines(numberOfLines);
    });

    await checkBreakpointIsNotActive(5);
    await checkBreakpointDidNotActivate();

    await step('add a breakpoint to line No.6', async () => {
      await addBreakpointForLine(frontend, 6);
    });

    await step('reload the page', async () => {
      await target.reload();
      // FIXME(crbug/1112692): Refactor test to remove the timeout.
      await timeout(100);
    });

    await step('wait for all the source code to appear', async () => {
      await waitForSourceCodeLines(numberOfLines);
    });

    await checkBreakpointIsActive(6);

    await step('check that the code has paused on the breakpoint at the correct script location', async () => {
      const scriptLocation = await retrieveTopCallFrameWithoutResuming();
      assert.deepEqual(scriptLocation, 'add.wasm:0x28');
    });
  });

  it('cannot set a breakpoint on non-breakable line in raw wasm', async () => {
    const {frontend} = getBrowserAndPages();

    await openSourceCodeEditorForFile('add.wasm', 'wasm/call-to-add-wasm.html');
    assert.deepEqual(await getNonBreakableLines(frontend), [
      0x000,
      0x020,
      0x04b,
    ]);
    // Line 1 is non-breakable.
    await addBreakpointForLine(frontend, 1, true);
    assert.deepEqual(await getBreakpointDecorators(frontend), []);
    // Line 3 is breakable.
    await addBreakpointForLine(frontend, 3);
    assert.deepEqual(await getBreakpointDecorators(frontend), [0x023]);
  });

  it('is able to step with state', async () => {
    const {target, frontend} = getBrowserAndPages();

    await step('navigate to a page and open the Sources tab', async () => {
      await openSourceCodeEditorForFile('stepping-with-state.wasm', 'wasm/stepping-with-state.html');
    });

    const numberOfLines = 32;

    await step('wait for all the source code to appear', async () => {
      await waitForSourceCodeLines(numberOfLines);
    });

    await step('add a breakpoint to line No.23', async () => {
      await addBreakpointForLine(frontend, 23);
    });

    await step('reload the page', async () => {
      await target.reload();
      // FIXME(crbug/1112692): Refactor test to remove the timeout.
      await timeout(100);
    });

    await step('wait for all the source code to appear', async () => {
      await waitForSourceCodeLines(numberOfLines);
    });

    await checkBreakpointIsActive(23);

    await step('check that the code has paused on the breakpoint at the correct script location', async () => {
      const scriptLocation = await retrieveTopCallFrameWithoutResuming();
      assert.deepEqual(scriptLocation, 'stepping-with-state.wasm:0x60');
    });

    await step('step two times through the code', async () => {
      await stepThroughTheCode();
      await stepThroughTheCode();
    });

    await step('check that the variables in the scope view show the correct values', async () => {
      await waitFor(SCOPE_LOCAL_VALUES_SELECTOR);
      const localScopeView = await waitFor(SCOPE_LOCAL_VALUES_SELECTOR);
      await waitForFunction(async () => {
        const local_scope_values = await localScopeView.evaluate(element => {
          return (element as HTMLElement).innerText;
        });
        return local_scope_values === '"": 42';
      });
    });

    await step('remove the breakpoint from the 23rd line', async () => {
      await click(sourceLineNumberSelector(23));
    });

    await step('add a breakpoint to line No.8', async () => {
      await addBreakpointForLine(frontend, 8);
    });

    await step('reload the page', async () => {
      await target.reload();
      // FIXME(crbug/1112692): Refactor test to remove the timeout.
      await timeout(100);
    });

    await step('wait for all the source code to appear', async () => {
      await waitForSourceCodeLines(numberOfLines);
    });

    await checkBreakpointIsActive(8);

    await step('check that the code has paused on the breakpoint at the correct script location', async () => {
      const scriptLocation = await retrieveTopCallFrameWithoutResuming();
      assert.deepEqual(scriptLocation, 'stepping-with-state.wasm:0x48');
    });

    await step('step two times through the code', async () => {
      await stepThroughTheCode();
      await stepThroughTheCode();
    });

    await step('check that the variables in the scope view show the correct values', async () => {
      await waitFor(SCOPE_LOCAL_VALUES_SELECTOR);
      const localScopeView = await waitFor(SCOPE_LOCAL_VALUES_SELECTOR);
      await waitForFunction(async () => {
        const local_scope_values = await localScopeView.evaluate(element => {
          return (element as HTMLElement).innerText;
        });
        return local_scope_values === '"": 50';
      });
    });

    await step('resume script execution', async () => {
      await frontend.keyboard.press('F8');
      await waitFor(TURNED_OFF_PAUSE_BUTTON_SELECTOR);
    });

    await checkBreakpointDidNotActivate();
  });

  it('is able to step with state in multi-threaded code', async () => {
    const {target, frontend} = getBrowserAndPages();

    await step('navigate to a page and open the Sources tab', async () => {
      await openSourceCodeEditorForFile('stepping-with-state.wasm', 'wasm/stepping-with-state-and-threads.html');
    });

    const numberOfLines = 32;

    await step('check that the main thread is selected', async () => {
      const selectedThreadElement = await waitFor(SELECTED_THREAD_SELECTOR);
      const selectedThreadName = await selectedThreadElement.evaluate(element => {
        return (element as HTMLElement).innerText;
      });
      assert.strictEqual(selectedThreadName, 'Main', 'the Main thread is not active');
    });

    await step('add a breakpoint to line No.23', async () => {
      await addBreakpointForLine(frontend, 23);
    });

    await step('reload the page', async () => {
      await target.reload();
      // FIXME(crbug/1112692): Refactor test to remove the timeout.
      await timeout(100);
    });

    await step('wait for all the source code to appear', async () => {
      await waitForSourceCodeLines(numberOfLines);
    });

    await checkBreakpointIsActive(23);

    await step('check that the code has paused on the breakpoint at the correct script location', async () => {
      const scriptLocation = await retrieveTopCallFrameWithoutResuming();
      assert.deepEqual(scriptLocation, 'stepping-with-state.wasm:0x60');
    });

    await step('step two times through the code', async () => {
      await stepThroughTheCode();
      await stepThroughTheCode();
    });

    await step('check that the variables in the scope view show the correct values', async () => {
      await waitFor(SCOPE_LOCAL_VALUES_SELECTOR);
      const localScopeView = await waitFor(SCOPE_LOCAL_VALUES_SELECTOR);
      await waitForFunction(async () => {
        const local_scope_values = await localScopeView.evaluate(element => {
          return (element as HTMLElement).innerText;
        });
        return local_scope_values === '"": 42';
      });
    });

    await step('remove the breakpoint from the 23rd line', async () => {
      await click(sourceLineNumberSelector(23));
    });

    await step('add a breakpoint to line No.8', async () => {
      await addBreakpointForLine(frontend, 8);
    });

    await step('reload the page', async () => {
      await target.reload();
      // FIXME(crbug/1112692): Refactor test to remove the timeout.
      await timeout(100);
    });

    await step('wait for all the source code to appear', async () => {
      await waitForSourceCodeLines(numberOfLines);
    });

    await checkBreakpointIsActive(8);

    await step('check that the code has paused on the breakpoint at the correct script location', async () => {
      const scriptLocation = await retrieveTopCallFrameWithoutResuming();
      assert.deepEqual(scriptLocation, 'stepping-with-state.wasm:0x48');
    });

    await step('check that the main thread is selected', async () => {
      const selectedThreadElement = await waitFor(SELECTED_THREAD_SELECTOR);
      const selectedThreadName = await selectedThreadElement.evaluate(element => {
        return (element as HTMLElement).innerText;
      });
      assert.strictEqual(selectedThreadName, 'Main', 'the Main thread is not active');
    });

    await step('step two times through the code', async () => {
      await stepThroughTheCode();
      await stepThroughTheCode();
    });

    await step('check that the variables in the scope view show the correct values', async () => {
      await waitFor(SCOPE_LOCAL_VALUES_SELECTOR);
      const localScopeView = await waitFor(SCOPE_LOCAL_VALUES_SELECTOR);
      await waitForFunction(async () => {
        const local_scope_values = await localScopeView.evaluate(element => {
          return (element as HTMLElement).innerText;
        });
        return local_scope_values === '"": 50';
      });
    });

    await step('remove the breakpoint from the 8th line', async () => {
      await click(sourceLineNumberSelector(8));
    });

    await step('resume script execution', async () => {
      await frontend.keyboard.press('F8');
      await waitFor(TURNED_OFF_PAUSE_BUTTON_SELECTOR);
    });

    await checkBreakpointDidNotActivate();

    await step('add a breakpoint to line No.30', async () => {
      await addBreakpointForLine(frontend, 30);
    });

    await step('reload the page', async () => {
      await target.reload();
      // FIXME(crbug/1112692): Refactor test to remove the timeout.
      await timeout(100);
    });

    await step('wait for all the source code to appear', async () => {
      await waitForSourceCodeLines(numberOfLines);
    });

    await checkBreakpointIsActive(30);

    await step('check that the code has paused on the breakpoint at the correct script location', async () => {
      const scriptLocation = await retrieveTopCallFrameWithoutResuming();
      assert.deepEqual(scriptLocation, 'stepping-with-state.wasm:0x6d');
    });

    await step('check that the worker thread is selected', async () => {
      const selectedThreadElement = await waitFor(SELECTED_THREAD_SELECTOR);
      const selectedThreadName = await selectedThreadElement.evaluate(element => {
        return (element as HTMLElement).innerText;
      });
      assert.strictEqual(
          selectedThreadName, 'worker-stepping-with-state-and-threads.js', 'the worker thread is not active');
    });

    await step('step two times through the code', async () => {
      await stepThroughTheCode();
      await stepThroughTheCode();
    });

    await step('check that the variables in the scope view show the correct values', async () => {
      await waitFor(SCOPE_LOCAL_VALUES_SELECTOR);
      const localScopeView = await waitFor(SCOPE_LOCAL_VALUES_SELECTOR);
      await waitForFunction(async () => {
        const local_scope_values = await localScopeView.evaluate(element => {
          return (element as HTMLElement).innerText;
        });
        return local_scope_values === '"": 42';
      });
    });

    await step('remove the breakpoint from the 30th line', async () => {
      await click(sourceLineNumberSelector(30));
    });

    await step('add a breakpoint to line No.13', async () => {
      await addBreakpointForLine(frontend, 13);
    });

    await step('reload the page', async () => {
      await target.reload();
      // FIXME(crbug/1112692): Refactor test to remove the timeout.
      await timeout(100);
    });

    await step('wait for all the source code to appear', async () => {
      await waitForSourceCodeLines(numberOfLines);
    });

    await checkBreakpointIsActive(13);

    await step('check that the code has paused on the breakpoint at the correct script location', async () => {
      const scriptLocation = await retrieveTopCallFrameWithoutResuming();
      assert.deepEqual(scriptLocation, 'stepping-with-state.wasm:0x50');
    });

    await step('check that the worker thread is selected', async () => {
      const selectedThreadElement = await waitFor(SELECTED_THREAD_SELECTOR);
      const selectedThreadName = await selectedThreadElement.evaluate(element => {
        return (element as HTMLElement).innerText;
      });
      assert.strictEqual(
          selectedThreadName, 'worker-stepping-with-state-and-threads.js', 'the worker thread is not active');
    });

    await step('step two times through the code', async () => {
      await stepThroughTheCode();
      await stepThroughTheCode();
    });

    await step('check that the variables in the scope view show the correct values', async () => {
      await waitFor(SCOPE_LOCAL_VALUES_SELECTOR);
      const localScopeView = await waitFor(SCOPE_LOCAL_VALUES_SELECTOR);
      await waitForFunction(async () => {
        const local_scope_values = await localScopeView.evaluate(element => {
          return (element as HTMLElement).innerText;
        });
        return local_scope_values === '"": 42';
      });
    });

    await step('resume script execution', async () => {
      await frontend.keyboard.press('F8');
      await waitFor(TURNED_OFF_PAUSE_BUTTON_SELECTOR);
    });

    await checkBreakpointDidNotActivate();
  });
});

describe('Raw-Wasm', async () => {
  // Failing on Windows-only
  it.skip('[crbug.com/1098707]: displays correct location in Wasm source', async () => {
    const {frontend} = getBrowserAndPages();

    // Have the target load the page.
    await goToResource('sources/wasm/callstack-wasm-to-js.html');

    // This page automatically enters debugging.
    const messageElement = await frontend.waitForSelector('.paused-message');
    const statusMain = await $('.status-main', messageElement);

    if (!statusMain) {
      assert.fail('Unable to find .status-main element');
      return;
    }

    const pauseMessage = await statusMain.evaluate(n => n.textContent);

    assert.strictEqual(pauseMessage, 'Debugger paused');

    const sidebar = await messageElement.evaluateHandle(n => n.parentElement);

    // Find second frame of call stack
    const callFrame = (await $('.call-frame-item.selected + .call-frame-item', sidebar));
    if (!callFrame) {
      assert.fail('Unable to find callframe');
      return;
    }

    const callFrameTitle = (await $('.call-frame-title-text', callFrame));
    if (!callFrameTitle) {
      assert.fail('Unable to find callframe title');
      return;
    }

    const title = await callFrameTitle.evaluate(n => n.textContent);
    const callFrameLocation = await $('.call-frame-location', callFrame);
    if (!callFrameLocation) {
      assert.fail('Unable to find callframe location');
      return;
    }

    const location = await callFrameLocation.evaluate(n => n.textContent);

    assert.strictEqual(title, 'foo');
    assert.strictEqual(location, 'callstack-wasm-to-js.wasm:0x32');

    // Select next call frame.
    await callFrame.press('ArrowDown');
    await callFrame.press('Space');

    // Wasm code for function call should be highlighted
    const codeLine = await frontend.waitForSelector('.cm-execution-line pre');
    const codeText = await codeLine.evaluate(n => n.textContent);

    assert.strictEqual(codeText, '    call $bar');

    // Resume the evaluation
    await click(RESUME_BUTTON);
  });
});
