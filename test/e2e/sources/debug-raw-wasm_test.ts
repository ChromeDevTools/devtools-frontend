// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  $,
  click,
  enableExperiment,
  getBrowserAndPages,
  goToResource,
  installEventListener,
  step,
  waitFor,
  waitForFunction,
} from '../../shared/helper.js';

import {
  addBreakpointForLine,
  captureAddedSourceFiles,
  checkBreakpointDidNotActivate,
  DEBUGGER_PAUSED_EVENT,
  getBreakpointDecorators,
  getCallFrameLocations,
  getCallFrameNames,
  getNonBreakableLines,
  getValuesForScope,
  isBreakpointSet,
  openSourceCodeEditorForFile,
  openSourcesPanel,
  PAUSE_BUTTON,
  reloadPageAndWaitForSourceFile,
  removeBreakpointForLine,
  RESUME_BUTTON,
  retrieveTopCallFrameScriptLocation,
  retrieveTopCallFrameWithoutResuming,
  SELECTED_THREAD_SELECTOR,
  stepThroughTheCode,
  switchToCallFrame,
  THREADS_SELECTOR,
} from '../helpers/sources-helpers.js';

describe('Sources Tab', function() {
  // The tests in this suite are particularly slow, as they perform a lot of actions
  if (this.timeout() > 0) {
    this.timeout(10000);
  }

  beforeEach(async () => {
    const {frontend} = getBrowserAndPages();
    await installEventListener(frontend, DEBUGGER_PAUSED_EVENT);
  });

  it('shows the correct wasm source on load and reload', async () => {
    const {target} = getBrowserAndPages();
    await openSourcesPanel();

    {
      const capturedFileNames =
          await captureAddedSourceFiles(2, () => goToResource('sources/wasm/call-to-add-wasm.html'));
      assert.deepEqual(capturedFileNames, [
        '/test/e2e/resources/sources/wasm/call-to-add-wasm.html',
        '/test/e2e/resources/sources/wasm/add.wasm',
      ]);
    }

    {
      const capturedFileNames = await captureAddedSourceFiles(2, async () => {
        await target.reload();
      });
      assert.deepEqual(capturedFileNames, [
        '/test/e2e/resources/sources/wasm/call-to-add-wasm.html',
        '/test/e2e/resources/sources/wasm/add.wasm',
      ]);
    }
  });

  it('can add a breakpoint in raw wasm', async () => {
    const {target, frontend} = getBrowserAndPages();

    await openSourceCodeEditorForFile('add.wasm', 'wasm/call-to-add-wasm.html');
    await addBreakpointForLine(frontend, '0x023');

    const scriptLocation = await retrieveTopCallFrameScriptLocation('main();', target);
    assert.deepEqual(scriptLocation, 'add.wasm:0x23');
  });

  it('hits two breakpoints that are set and activated separately', async function() {
    const {target, frontend} = getBrowserAndPages();
    const fileName = 'add.wasm';

    await step('navigate to a page and open the Sources tab', async () => {
      await openSourceCodeEditorForFile(fileName, 'wasm/call-to-add-wasm.html');
    });

    await step('add a breakpoint to line No.0x027', async () => {
      await addBreakpointForLine(frontend, '0x027');
    });

    await step('reload the page', async () => {
      await reloadPageAndWaitForSourceFile(target, fileName);
    });

    await waitForFunction(async () => await isBreakpointSet('0x027'));

    await step('check that the code has paused on the breakpoint at the correct script location', async () => {
      const scriptLocation = await retrieveTopCallFrameWithoutResuming();
      assert.deepEqual(scriptLocation, 'add.wasm:0x27');
    });

    await step('remove the breakpoint from the line 0x027', async () => {
      await removeBreakpointForLine(frontend, '0x027');
    });

    await step('resume script execution', async () => {
      await frontend.keyboard.press('F8');
      await waitFor(PAUSE_BUTTON);
    });

    await step('reload the page', async () => {
      await reloadPageAndWaitForSourceFile(target, fileName);
    });

    await waitForFunction(async () => !(await isBreakpointSet('0x027')));
    await checkBreakpointDidNotActivate();

    await step('add a breakpoint to line No.0x028', async () => {
      await addBreakpointForLine(frontend, '0x028');
    });

    await step('reload the page', async () => {
      await reloadPageAndWaitForSourceFile(target, fileName);
    });

    await waitForFunction(async () => await isBreakpointSet('0x028'));

    await step('check that the code has paused on the breakpoint at the correct script location', async () => {
      const scriptLocation = await retrieveTopCallFrameWithoutResuming();
      assert.deepEqual(scriptLocation, 'add.wasm:0x28');
    });
  });

  it('shows variable value in popover', async function() {
    const {target, frontend} = getBrowserAndPages();
    const fileName = 'add.wasm';

    await step('navigate to a page and open the Sources tab', async () => {
      await openSourceCodeEditorForFile('add.wasm', 'wasm/call-to-add-wasm.html');
    });

    await step('add a breakpoint to line No.0x023', async () => {
      await addBreakpointForLine(frontend, '0x023');
    });

    await step('reload the page', async () => {
      await reloadPageAndWaitForSourceFile(target, fileName);
    });

    await step('hover over the $var0 in line No.0x023', async () => {
      const pausedPosition = await waitForFunction(async () => {
        const element = await $('.cm-executionLine .token-variable');
        if (element && await element.evaluate(e => e.isConnected)) {
          return element;
        }
        return undefined;
      });
      await pausedPosition.hover();
    });

    await step('check that popover with value 0 appears', async () => {
      const popover = await waitFor('[data-stable-name-for-test="object-popover-content"]');
      const value = await waitFor('.object-value-number', popover).then(e => e.evaluate(node => node.textContent));
      assert.strictEqual(value, '0');
    });
  });

  it('cannot set a breakpoint on non-breakable line in raw wasm', async () => {
    const {frontend} = getBrowserAndPages();

    await openSourceCodeEditorForFile('add.wasm', 'wasm/call-to-add-wasm.html');
    assert.deepEqual(await getNonBreakableLines(), [
      0x000,
      0x022,
      0x04b,
    ]);
    assert.deepEqual(await getBreakpointDecorators(), []);
    // Line 3 is breakable.
    await addBreakpointForLine(frontend, '0x023');
    assert.deepEqual(await getBreakpointDecorators(), [0x023]);
  });

  it('is able to step with state', async () => {
    const {target, frontend} = getBrowserAndPages();
    const fileName = 'stepping-with-state.wasm';

    await step('navigate to a page and open the Sources tab', async () => {
      await openSourceCodeEditorForFile('stepping-with-state.wasm', 'wasm/stepping-with-state.html');
    });

    await step('add a breakpoint to line No.0x060', async () => {
      await addBreakpointForLine(frontend, '0x060');
    });

    await step('reload the page', async () => {
      await reloadPageAndWaitForSourceFile(target, fileName);
    });

    await waitForFunction(async () => await isBreakpointSet('0x060'));

    await step('check that the code has paused on the breakpoint at the correct script location', async () => {
      const scriptLocation = await retrieveTopCallFrameWithoutResuming();
      assert.deepEqual(scriptLocation, 'stepping-with-state.wasm:0x60');
    });

    await step('step two times through the code', async () => {
      await stepThroughTheCode();
      await stepThroughTheCode();
    });

    await step('check that the variables in the scope view show the correct values', async () => {
      const localScopeValues = await getValuesForScope('Local', 0, 3);
      assert.deepEqual(localScopeValues, [
        '$var0: i32 {value: 42}',
        '$var1: i32 {value: 8}',
        '$var2: i32 {value: 5}',
      ]);
    });

    await step('resume script execution', async () => {
      await frontend.keyboard.press('F8');
      await waitFor(PAUSE_BUTTON);
    });

    await step('remove the breakpoint from the line 0x060', async () => {
      await removeBreakpointForLine(frontend, '0x060');
    });

    await step('add a breakpoint to line No.0x048', async () => {
      await addBreakpointForLine(frontend, '0x048');
    });

    await step('reload the page', async () => {
      await reloadPageAndWaitForSourceFile(target, fileName);
    });

    await waitForFunction(async () => await isBreakpointSet('0x048'));

    await step('check that the code has paused on the breakpoint at the correct script location', async () => {
      const scriptLocation = await retrieveTopCallFrameWithoutResuming();
      assert.deepEqual(scriptLocation, 'stepping-with-state.wasm:0x48');
    });

    await step('step two times through the code', async () => {
      await stepThroughTheCode();
      await stepThroughTheCode();
    });

    await step('check that the variables in the scope view show the correct values', async () => {
      const localScopeValues = await getValuesForScope('Local', 0, 2);
      assert.deepEqual(localScopeValues, [
        '$var0: i32 {value: 50}',
        '$var1: i32 {value: 5}',
      ]);
    });

    await step('resume script execution', async () => {
      await frontend.keyboard.press('F8');
      await waitFor(PAUSE_BUTTON);
    });

    await checkBreakpointDidNotActivate();
  });

  it('is able to step with state in multi-threaded code in main thread', async () => {
    await enableExperiment('instrumentation-breakpoints');
    const {target, frontend} = getBrowserAndPages();
    // enableExperiment() reloads the devtools page, so we need to reinstall the listener on the new window.
    await installEventListener(frontend, DEBUGGER_PAUSED_EVENT);
    const fileName = 'stepping-with-state.wasm';
    await step('navigate to a page and open the Sources tab', async () => {
      await openSourceCodeEditorForFile('stepping-with-state.wasm', 'wasm/stepping-with-state-and-threads.html');
    });

    await step('expand the Threads list', async () => {
      await Promise.all([
        click(THREADS_SELECTOR),
        waitFor(THREADS_SELECTOR + '[aria-expanded="true"]'),
      ]);
    });

    await step('check that the main thread is selected', async () => {
      const selectedThreadElement = await waitFor(SELECTED_THREAD_SELECTOR);
      const selectedThreadName = await selectedThreadElement.evaluate(element => {
        return (element as HTMLElement).innerText;
      });
      assert.strictEqual(selectedThreadName, 'Main', 'the Main thread is not active');
    });

    await step('check non-breakable lines and add a breakpoint to line No.0x060', async () => {
      assert.deepEqual(await getNonBreakableLines(), [
        0x000,
        0x03f,
        0x047,
        0x04f,
        0x057,
        0x05f,
        0x06c,
        0x0c1,
      ]);
      await addBreakpointForLine(frontend, '0x060');
    });

    await step('reload the page', async () => {
      await reloadPageAndWaitForSourceFile(target, fileName);
    });

    await waitForFunction(async () => await isBreakpointSet('0x060'));

    await step('check that the code has paused on the breakpoint at the correct script location', async () => {
      const scriptLocation = await retrieveTopCallFrameWithoutResuming();
      assert.deepEqual(scriptLocation, 'stepping-with-state.wasm:0x60');
    });

    await step('step two times through the code', async () => {
      await stepThroughTheCode();
      await stepThroughTheCode();
    });

    await step('check that the variables in the scope view show the correct values', async () => {
      const localScopeValues = await getValuesForScope('Local', 0, 3);
      assert.deepEqual(localScopeValues, [
        '$var0: i32 {value: 42}',
        '$var1: i32 {value: 8}',
        '$var2: i32 {value: 5}',
      ]);
    });

    await step('resume script execution', async () => {
      await frontend.keyboard.press('F8');
      await waitFor(PAUSE_BUTTON);
    });

    await step('remove the breakpoint from the line 0x060', async () => {
      await removeBreakpointForLine(frontend, '0x060');
    });

    await step('add a breakpoint to line No.0x048', async () => {
      await addBreakpointForLine(frontend, '0x048');
    });

    await step('reload the page', async () => {
      await reloadPageAndWaitForSourceFile(target, fileName);
    });

    await waitForFunction(async () => await isBreakpointSet('0x048'));

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
      const localScopeValues = await getValuesForScope('Local', 0, 2);
      assert.deepEqual(localScopeValues, [
        '$var0: i32 {value: 50}',
        '$var1: i32 {value: 5}',
      ]);
    });

    await step('remove the breakpoint from the 8th line', async () => {
      await removeBreakpointForLine(frontend, '0x048');
    });

    await step('resume script execution', async () => {
      await frontend.keyboard.press('F8');
      await waitFor(PAUSE_BUTTON);
    });

    await checkBreakpointDidNotActivate();
  });

  it('is able to step with state in multi-threaded code in worker thread', async () => {
    await enableExperiment('instrumentation-breakpoints');
    const {target, frontend} = getBrowserAndPages();
    // enableExperiment() reloads the devtools page, so we need to reinstall the listener on the new window.
    await installEventListener(frontend, DEBUGGER_PAUSED_EVENT);
    const fileName = 'stepping-with-state.wasm';

    await step('navigate to a page and open the Sources tab', async () => {
      await openSourceCodeEditorForFile(fileName, 'wasm/stepping-with-state-and-threads.html');
    });

    await step('expand the Threads list', async () => {
      await Promise.all([
        click(THREADS_SELECTOR),
        waitFor(THREADS_SELECTOR + '[aria-expanded="true"]'),
      ]);
    });

    await step('check that the main thread is selected', async () => {
      const selectedThreadElement = await waitFor(SELECTED_THREAD_SELECTOR);
      const selectedThreadName = await selectedThreadElement.evaluate(element => {
        return (element as HTMLElement).innerText;
      });
      assert.strictEqual(selectedThreadName, 'Main', 'the Main thread is not active');
    });

    await step('add a breakpoint to line No.0x06d', async () => {
      await addBreakpointForLine(frontend, '0x06d');
    });

    await step('reload the page', async () => {
      await reloadPageAndWaitForSourceFile(target, fileName);
    });

    await waitForFunction(async () => await isBreakpointSet('0x06d'));

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
      const localScopeValues = await getValuesForScope('Local', 0, 1);
      assert.deepEqual(localScopeValues, [
        '$var0: i32 {value: 42}',
        '$var1: i32 {value: 6}',
        '$var2: i32 {value: 5}',
      ]);
    });

    await step('remove the breakpoint from line 0x06d', async () => {
      await removeBreakpointForLine(frontend, '0x06d');
    });

    await step('add a breakpoint to line No.0x050', async () => {
      await addBreakpointForLine(frontend, '0x050');
    });

    await step('reload the page', async () => {
      await reloadPageAndWaitForSourceFile(target, fileName);
    });

    await waitForFunction(async () => await isBreakpointSet('0x050'));

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
      const localScopeValues = await getValuesForScope('Local', 0, 1);
      assert.deepEqual(localScopeValues, [
        '$var0: i32 {value: 42}',
        '$var1: i32 {value: 6}',
      ]);
    });

    await step('resume script execution', async () => {
      await frontend.keyboard.press('F8');
      await waitFor(PAUSE_BUTTON);
    });

    await checkBreakpointDidNotActivate();
  });
});

describe('Raw-Wasm', () => {
  it('displays correct location in Wasm source', async () => {
    const {target} = getBrowserAndPages();

    // Have the target load the page.
    await openSourceCodeEditorForFile('callstack-wasm-to-js.wasm', 'wasm/callstack-wasm-to-js.html');

    // Go
    const fooPromise = target.evaluate('foo();');  // Don't await this, the target hits a debugger statement.

    // This page automatically enters debugging.
    const messageElement = await waitFor('.paused-message');
    const statusMain = await waitFor('.status-main', messageElement);

    if (!statusMain) {
      assert.fail('Unable to find .status-main element');
    }

    const pauseMessage = await statusMain.evaluate(n => n.textContent);

    assert.strictEqual(pauseMessage, 'Debugger paused');

    // Find second frame of call stack
    const titles = await getCallFrameNames();
    const locations = await getCallFrameLocations();

    assert.isAbove(titles.length, 1);
    assert.isAbove(locations.length, 1);
    assert.strictEqual(titles[1], '$foo');
    assert.strictEqual(locations[1], 'callstack-wasm-to-js.wasm:0x32');

    // Select second call frame.
    await switchToCallFrame(2);

    // Wasm code for function call should be highlighted
    const codeLine = await waitFor('.cm-executionLine');
    const codeText = await codeLine.evaluate(n => n.textContent);

    assert.strictEqual(codeText, '    call $bar');

    // Resume the evaluation
    await click(RESUME_BUTTON);
    await fooPromise;
  });
});
