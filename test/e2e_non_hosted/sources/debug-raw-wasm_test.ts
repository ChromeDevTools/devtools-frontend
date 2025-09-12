// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

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
} from '../../e2e/helpers/sources-helpers.js';

describe('Sources Tab', function() {
  it('shows the correct wasm source on load and reload', async ({devToolsPage, inspectedPage}) => {
    await devToolsPage.installEventListener(DEBUGGER_PAUSED_EVENT);
    await openSourcesPanel(devToolsPage);

    {
      const capturedFileNames = await captureAddedSourceFiles(
          2, () => inspectedPage.goToResource('sources/wasm/call-to-add-wasm.html'), devToolsPage);
      assert.deepEqual(capturedFileNames, [
        '/test/e2e/resources/sources/wasm/call-to-add-wasm.html',
        '/test/e2e/resources/sources/wasm/add.wasm',
      ]);
    }

    {
      const capturedFileNames = await captureAddedSourceFiles(2, async () => {
        await inspectedPage.reload();
      }, devToolsPage);
      assert.deepEqual(capturedFileNames, [
        '/test/e2e/resources/sources/wasm/call-to-add-wasm.html',
        '/test/e2e/resources/sources/wasm/add.wasm',
      ]);
    }
  });

  it('can add a breakpoint in raw wasm', async ({devToolsPage, inspectedPage}) => {
    await devToolsPage.installEventListener(DEBUGGER_PAUSED_EVENT);

    await openSourceCodeEditorForFile('add.wasm', 'wasm/call-to-add-wasm.html', devToolsPage, inspectedPage);
    await addBreakpointForLine('0x023', devToolsPage);

    const scriptLocation = await retrieveTopCallFrameScriptLocation('main();', inspectedPage, devToolsPage);
    assert.deepEqual(scriptLocation, 'add.wasm:0x23');
  });

  it('hits two breakpoints that are set and activated separately', async function({devToolsPage, inspectedPage}) {
    await devToolsPage.installEventListener(DEBUGGER_PAUSED_EVENT);
    const fileName = 'add.wasm';

    await openSourceCodeEditorForFile(fileName, 'wasm/call-to-add-wasm.html', devToolsPage, inspectedPage);

    await addBreakpointForLine('0x027', devToolsPage);
    await reloadPageAndWaitForSourceFile(fileName, devToolsPage, inspectedPage);
    await devToolsPage.waitForFunction(async () => await isBreakpointSet('0x027', devToolsPage));

    let scriptLocation = await retrieveTopCallFrameWithoutResuming(devToolsPage);
    assert.deepEqual(scriptLocation, 'add.wasm:0x27');

    await removeBreakpointForLine('0x027', devToolsPage);

    await devToolsPage.page.keyboard.press('F8');
    await devToolsPage.waitFor(PAUSE_BUTTON);

    await reloadPageAndWaitForSourceFile(fileName, devToolsPage, inspectedPage);

    await devToolsPage.waitForFunction(async () => !(await isBreakpointSet('0x027', devToolsPage)));
    await checkBreakpointDidNotActivate(devToolsPage);

    await addBreakpointForLine('0x028', devToolsPage);

    await reloadPageAndWaitForSourceFile(fileName, devToolsPage, inspectedPage);

    await devToolsPage.waitForFunction(async () => await isBreakpointSet('0x028', devToolsPage));

    scriptLocation = await retrieveTopCallFrameWithoutResuming(devToolsPage);
    assert.deepEqual(scriptLocation, 'add.wasm:0x28');
  });

  it('shows variable value in popover', async function({devToolsPage, inspectedPage}) {
    await devToolsPage.installEventListener(DEBUGGER_PAUSED_EVENT);
    const fileName = 'add.wasm';

    await openSourceCodeEditorForFile('add.wasm', 'wasm/call-to-add-wasm.html', devToolsPage, inspectedPage);
    await addBreakpointForLine('0x023', devToolsPage);
    await reloadPageAndWaitForSourceFile(fileName, devToolsPage, inspectedPage);
    const pausedPosition = await devToolsPage.waitForFunction(async () => {
      const element = await devToolsPage.$('.cm-executionLine .token-variable');
      if (element && await element.evaluate(e => e.isConnected)) {
        return element;
      }
      return undefined;
    });
    await pausedPosition.hover();
    const popover = await devToolsPage.waitFor('[data-stable-name-for-test="object-popover-content"]');
    const value =
        await devToolsPage.waitFor('.object-value-number', popover).then(e => e.evaluate(node => node.textContent));
    assert.strictEqual(value, '0');
  });

  it('cannot set a breakpoint on non-breakable line in raw wasm', async ({devToolsPage, inspectedPage}) => {
    await devToolsPage.installEventListener(DEBUGGER_PAUSED_EVENT);
    await openSourceCodeEditorForFile('add.wasm', 'wasm/call-to-add-wasm.html', devToolsPage, inspectedPage);
    assert.deepEqual(await getNonBreakableLines(devToolsPage), [
      0x000,
      0x022,
      0x04b,
    ]);
    assert.deepEqual(await getBreakpointDecorators(undefined, undefined, devToolsPage), []);
    // Line 3 is breakable.
    await addBreakpointForLine('0x023', devToolsPage);
    assert.deepEqual(await getBreakpointDecorators(undefined, undefined, devToolsPage), [0x023]);
  });

  it('is able to step with state', async ({devToolsPage, inspectedPage}) => {
    await devToolsPage.installEventListener(DEBUGGER_PAUSED_EVENT);
    const fileName = 'stepping-with-state.wasm';

    await openSourceCodeEditorForFile(
        'stepping-with-state.wasm', 'wasm/stepping-with-state.html', devToolsPage, inspectedPage);
    await addBreakpointForLine('0x060', devToolsPage);
    await reloadPageAndWaitForSourceFile(fileName, devToolsPage, inspectedPage);
    await devToolsPage.waitForFunction(async () => await isBreakpointSet('0x060', devToolsPage));

    let scriptLocation = await retrieveTopCallFrameWithoutResuming(devToolsPage);
    assert.deepEqual(scriptLocation, 'stepping-with-state.wasm:0x60');
    await stepThroughTheCode(devToolsPage);
    await stepThroughTheCode(devToolsPage);
    let localScopeValues = await getValuesForScope('Local', 0, 3, devToolsPage);
    assert.deepEqual(localScopeValues, [
      '$var0: i32 {value: 42}',
      '$var1: i32 {value: 8}',
      '$var2: i32 {value: 5}',
    ]);
    await devToolsPage.page.keyboard.press('F8');
    await devToolsPage.waitFor(PAUSE_BUTTON);
    await removeBreakpointForLine('0x060', devToolsPage);
    await addBreakpointForLine('0x048', devToolsPage);
    await reloadPageAndWaitForSourceFile(fileName, devToolsPage, inspectedPage);

    await devToolsPage.waitForFunction(async () => await isBreakpointSet('0x048', devToolsPage));

    scriptLocation = await retrieveTopCallFrameWithoutResuming(devToolsPage);
    assert.deepEqual(scriptLocation, 'stepping-with-state.wasm:0x48');
    await stepThroughTheCode(devToolsPage);
    await stepThroughTheCode(devToolsPage);
    localScopeValues = await getValuesForScope('Local', 0, 2, devToolsPage);
    assert.deepEqual(localScopeValues, [
      '$var0: i32 {value: 50}',
      '$var1: i32 {value: 5}',
    ]);
    await devToolsPage.page.keyboard.press('F8');
    await devToolsPage.waitFor(PAUSE_BUTTON);

    await checkBreakpointDidNotActivate(devToolsPage);
  });
  describe('with instrumentation breackpoints', () => {
    setup({enabledDevToolsExperiments: ['instrumentation-breakpoints']});
    it('is able to step with state in multi-threaded code in main thread', async ({devToolsPage, inspectedPage}) => {
      await devToolsPage.installEventListener(DEBUGGER_PAUSED_EVENT);
      const fileName = 'stepping-with-state.wasm';
      await openSourceCodeEditorForFile(
          'stepping-with-state.wasm', 'wasm/stepping-with-state-and-threads.html', devToolsPage, inspectedPage);

      await Promise.all([
        devToolsPage.click(THREADS_SELECTOR),
        devToolsPage.waitFor(THREADS_SELECTOR + '[aria-expanded="true"]'),
      ]);
      let selectedThreadElement = await devToolsPage.waitFor(SELECTED_THREAD_SELECTOR);
      let selectedThreadName = await selectedThreadElement.evaluate(element => {
        return element.innerText;
      });
      assert.strictEqual(selectedThreadName, 'Main', 'the Main thread is not active');
      assert.deepEqual(await getNonBreakableLines(devToolsPage), [
        0x000,
        0x03f,
        0x047,
        0x04f,
        0x057,
        0x05f,
        0x06c,
        0x0c1,
      ]);
      await addBreakpointForLine('0x060', devToolsPage);
      await reloadPageAndWaitForSourceFile(fileName, devToolsPage, inspectedPage);

      await devToolsPage.waitForFunction(async () => await isBreakpointSet('0x060', devToolsPage));

      let scriptLocation = await retrieveTopCallFrameWithoutResuming(devToolsPage);
      assert.deepEqual(scriptLocation, 'stepping-with-state.wasm:0x60');

      await stepThroughTheCode(devToolsPage);
      await stepThroughTheCode(devToolsPage);

      let localScopeValues = await getValuesForScope('Local', 0, 3, devToolsPage);
      assert.deepEqual(localScopeValues, [
        '$var0: i32 {value: 42}',
        '$var1: i32 {value: 8}',
        '$var2: i32 {value: 5}',
      ]);
      await devToolsPage.page.keyboard.press('F8');
      await devToolsPage.waitFor(PAUSE_BUTTON);
      await removeBreakpointForLine('0x060', devToolsPage);
      await addBreakpointForLine('0x048', devToolsPage);
      await reloadPageAndWaitForSourceFile(fileName, devToolsPage, inspectedPage);

      await devToolsPage.waitForFunction(async () => await isBreakpointSet('0x048', devToolsPage));

      scriptLocation = await retrieveTopCallFrameWithoutResuming(devToolsPage);
      assert.deepEqual(scriptLocation, 'stepping-with-state.wasm:0x48');

      selectedThreadElement = await devToolsPage.waitFor(SELECTED_THREAD_SELECTOR);
      selectedThreadName = await selectedThreadElement.evaluate(element => {
        return element.innerText;
      });
      assert.strictEqual(selectedThreadName, 'Main', 'the Main thread is not active');

      await stepThroughTheCode(devToolsPage);
      await stepThroughTheCode(devToolsPage);

      localScopeValues = await getValuesForScope('Local', 0, 2, devToolsPage);
      assert.deepEqual(localScopeValues, [
        '$var0: i32 {value: 50}',
        '$var1: i32 {value: 5}',
      ]);

      await removeBreakpointForLine('0x048', devToolsPage);

      await devToolsPage.page.keyboard.press('F8');
      await devToolsPage.waitFor(PAUSE_BUTTON);

      await checkBreakpointDidNotActivate(devToolsPage);
    });
    it('is able to step with state in multi-threaded code in worker thread', async ({devToolsPage, inspectedPage}) => {
      await devToolsPage.installEventListener(DEBUGGER_PAUSED_EVENT);
      const fileName = 'stepping-with-state.wasm';

      await openSourceCodeEditorForFile(
          fileName, 'wasm/stepping-with-state-and-threads.html', devToolsPage, inspectedPage);

      await Promise.all([
        devToolsPage.click(THREADS_SELECTOR),
        devToolsPage.waitFor(THREADS_SELECTOR + '[aria-expanded="true"]'),
      ]);

      let selectedThreadElement = await devToolsPage.waitFor(SELECTED_THREAD_SELECTOR);
      let selectedThreadName = await selectedThreadElement.evaluate(element => {
        return element.innerText;
      });
      assert.strictEqual(selectedThreadName, 'Main', 'the Main thread is not active');

      await addBreakpointForLine('0x06d', devToolsPage);

      await reloadPageAndWaitForSourceFile(fileName, devToolsPage, inspectedPage);

      await devToolsPage.waitForFunction(async () => await isBreakpointSet('0x06d', devToolsPage));

      let scriptLocation = await retrieveTopCallFrameWithoutResuming(devToolsPage);
      assert.deepEqual(scriptLocation, 'stepping-with-state.wasm:0x6d');

      selectedThreadElement = await devToolsPage.waitFor(SELECTED_THREAD_SELECTOR);
      selectedThreadName = await selectedThreadElement.evaluate(element => {
        return element.innerText;
      });
      assert.strictEqual(
          selectedThreadName, 'worker-stepping-with-state-and-threads.js', 'the worker thread is not active');

      await stepThroughTheCode(devToolsPage);
      await stepThroughTheCode(devToolsPage);

      let localScopeValues = await getValuesForScope('Local', 0, 1, devToolsPage);
      assert.deepEqual(localScopeValues, [
        '$var0: i32 {value: 42}',
        '$var1: i32 {value: 6}',
        '$var2: i32 {value: 5}',
      ]);

      await removeBreakpointForLine('0x06d', devToolsPage);

      await addBreakpointForLine('0x050', devToolsPage);

      await reloadPageAndWaitForSourceFile(fileName, devToolsPage, inspectedPage);

      await devToolsPage.waitForFunction(async () => await isBreakpointSet('0x050', devToolsPage));

      scriptLocation = await retrieveTopCallFrameWithoutResuming(devToolsPage);
      assert.deepEqual(scriptLocation, 'stepping-with-state.wasm:0x50');

      selectedThreadElement = await devToolsPage.waitFor(SELECTED_THREAD_SELECTOR);
      selectedThreadName = await selectedThreadElement.evaluate(element => {
        return element.innerText;
      });
      assert.strictEqual(
          selectedThreadName, 'worker-stepping-with-state-and-threads.js', 'the worker thread is not active');

      await stepThroughTheCode(devToolsPage);
      await stepThroughTheCode(devToolsPage);

      localScopeValues = await getValuesForScope('Local', 0, 1, devToolsPage);
      assert.deepEqual(localScopeValues, [
        '$var0: i32 {value: 42}',
        '$var1: i32 {value: 6}',
      ]);

      await devToolsPage.page.keyboard.press('F8');
      await devToolsPage.waitFor(PAUSE_BUTTON);

      await checkBreakpointDidNotActivate(devToolsPage);
    });
  });
});

describe('Raw-Wasm', () => {
  it('displays correct location in Wasm source', async ({devToolsPage, inspectedPage}) => {
    // Have the target load the page.
    await openSourceCodeEditorForFile(
        'callstack-wasm-to-js.wasm', 'wasm/callstack-wasm-to-js.html', devToolsPage, inspectedPage);

    // Go
    const fooPromise = inspectedPage.evaluate('foo();');  // Don't await this, the target hits a debugger statement.

    // This page automatically enters debugging.
    const messageElement = await devToolsPage.waitFor('.paused-message');
    const statusMain = await devToolsPage.waitFor('.status-main', messageElement);

    assert.isOk(statusMain, 'Unable to find .status-main element');

    const pauseMessage = await statusMain.evaluate(n => n.textContent);

    assert.strictEqual(pauseMessage, 'Debugger paused');

    // Find second frame of call stack
    const titles = await getCallFrameNames(devToolsPage);
    const locations = await getCallFrameLocations(devToolsPage);

    assert.isAbove(titles.length, 1);
    assert.isAbove(locations.length, 1);
    assert.strictEqual(titles[1], '$foo');
    assert.strictEqual(locations[1], 'callstack-wasm-to-js.wasm:0x32');

    // Select second call frame.
    await switchToCallFrame(2, devToolsPage);

    // Wasm code for function call should be highlighted
    const codeLine = await devToolsPage.waitFor('.cm-executionLine');
    const codeText = await codeLine.evaluate(n => n.textContent);

    assert.strictEqual(codeText, '    call $bar');

    // Resume the evaluation
    await devToolsPage.click(RESUME_BUTTON);
    await fooPromise;
  });
});
