// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {selectOption} from '../../shared/helper.js';
import {checkIfTabExistsInDrawer, DRAWER_PANEL_SELECTOR} from '../helpers/cross-tool-helper.js';
import {
  addBreakpointForLine,
  inspectMemory,
  openSourceCodeEditorForFile,
  PAUSE_INDICATOR_SELECTOR,
  reloadPageAndWaitForSourceFile,
  RESUME_BUTTON,
  retrieveTopCallFrameWithoutResuming,
} from '../helpers/sources-helpers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';
import type {InspectedPage} from '../shared/target-helper.js';

const LINEAR_MEMORY_INSPECTOR_TAB_SELECTOR = '#tab-linear-memory-inspector';
const LINEAR_MEMORY_INSPECTOR_TABBED_PANE_SELECTOR = DRAWER_PANEL_SELECTOR + ' .tabbed-pane';
const LINEAR_MEMORY_INSPECTOR_TABBED_PANE_TAB_SELECTOR = '.tabbed-pane-header-tab';
const LINEAR_MEMORY_INSPECTOR_TAB_TITLE_SELECTOR = '.tabbed-pane-header-tab-title';
const VALUE_INTERPRETER_SELECTOR = 'devtools-linear-memory-inspector-interpreter';

describe('Linear Memory Inspector', () => {
  it('renders selectable values', async ({devToolsPage, inspectedPage}) => {
    await openLMI(devToolsPage, inspectedPage);
    const lmiTabbedPane = await devToolsPage.waitFor(LINEAR_MEMORY_INSPECTOR_TABBED_PANE_SELECTOR);
    const interpreter = await lmiTabbedPane.waitForSelector(VALUE_INTERPRETER_SELECTOR);
    assert.isNotNull(interpreter);
    const textContent = await devToolsPage.getTextContent('div + .selectable-text', interpreter);
    await devToolsPage.debuggerStatement();
    await devToolsPage.doubleClick('div + .selectable-text', {root: interpreter, clickOptions: {offset: {x: 5, y: 5}}});
    const selection = await devToolsPage.evaluate(() => window.getSelection()?.toString());
    assert.strictEqual(selection, textContent);
  });
});

describe('Scope View', () => {
  it('opens linear memory inspector', async ({devToolsPage, inspectedPage}) => {
    await openLMI(devToolsPage, inspectedPage);

    const lmiTabbedPane = await devToolsPage.waitFor(LINEAR_MEMORY_INSPECTOR_TABBED_PANE_SELECTOR);
    const titleElement = await devToolsPage.waitFor(LINEAR_MEMORY_INSPECTOR_TAB_TITLE_SELECTOR, lmiTabbedPane);
    assert.isNotNull(titleElement);
    const title = await titleElement.evaluate(x => (x as HTMLElement).innerText);

    assert.strictEqual(title, 'Memory(100)');
  });

  it('opens one linear memory inspector per ArrayBuffer', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('sources/memory-workers.rawresponse');

    await devToolsPage.waitFor(RESUME_BUTTON);

    await inspectMemory('sharedMem', devToolsPage);

    const drawerIsOpen = await checkIfTabExistsInDrawer(LINEAR_MEMORY_INSPECTOR_TAB_SELECTOR, devToolsPage);
    assert.isTrue(drawerIsOpen);

    const lmiTabbedPane = await devToolsPage.waitFor(LINEAR_MEMORY_INSPECTOR_TABBED_PANE_SELECTOR);
    const titleElement = await devToolsPage.waitFor(LINEAR_MEMORY_INSPECTOR_TAB_TITLE_SELECTOR, lmiTabbedPane);
    assert.isNotNull(titleElement);
    const title = await titleElement.evaluate(x => (x as HTMLElement).innerText);

    assert.strictEqual(title, 'SharedArrayBuffer(16)');

    // Save this as we will select it multiple times
    const sharedBufferTab = await devToolsPage.$(LINEAR_MEMORY_INSPECTOR_TABBED_PANE_TAB_SELECTOR, lmiTabbedPane);
    if (!sharedBufferTab) {
      // Throw here to satisfy TypeScript
      throw new Error('Failed to get tab');
    }

    await inspectMemory('memory2', devToolsPage);
    // Wait until two tabs are open
    await devToolsPage.waitFor(
        `${LINEAR_MEMORY_INSPECTOR_TABBED_PANE_TAB_SELECTOR} + ${LINEAR_MEMORY_INSPECTOR_TABBED_PANE_TAB_SELECTOR}`,
        lmiTabbedPane);
    // Shared buffer tab no longer active
    await devToolsPage.waitForFunction(() => {
      return sharedBufferTab.evaluate(e => e.getAttribute('aria-selected') === 'false');
    });

    await inspectMemory('sharedArray', devToolsPage);
    // Shared buffer should be selected again
    await devToolsPage.waitForFunction(() => {
      return sharedBufferTab.evaluate(e => e.getAttribute('aria-selected') === 'true');
    });
    // There should only be two tabs
    await devToolsPage.waitForFunction(async () => {
      const tabs = await devToolsPage.$$(LINEAR_MEMORY_INSPECTOR_TABBED_PANE_TAB_SELECTOR, lmiTabbedPane);
      return tabs.length === 2;
    });

    // Continue execution in this worker.
    await devToolsPage.click(RESUME_BUTTON);

    // Wait until we pause in the other worker.
    await devToolsPage.waitFor(PAUSE_INDICATOR_SELECTOR);
    const scriptLocation = await retrieveTopCallFrameWithoutResuming(devToolsPage);
    assert.deepEqual(scriptLocation, 'memory-worker1.rawresponse:10');

    await inspectMemory('memory1', devToolsPage);
    // Shared buffer tab no longer active
    await devToolsPage.waitForFunction(() => {
      return sharedBufferTab.evaluate(e => e.getAttribute('aria-selected') === 'false');
    });
    // Now there are three tabs
    await devToolsPage.waitForFunction(async () => {
      const tabs = await devToolsPage.$$(LINEAR_MEMORY_INSPECTOR_TABBED_PANE_TAB_SELECTOR, lmiTabbedPane);
      return tabs.length === 3;
    });

    await inspectMemory('sharedArr', devToolsPage);
    // Shared buffer tab active again
    await devToolsPage.waitForFunction(() => {
      return sharedBufferTab.evaluate(e => e.getAttribute('aria-selected') === 'true');
    });
    // Still three tabs
    await devToolsPage.waitForFunction(async () => {
      const tabs = await devToolsPage.$$(LINEAR_MEMORY_INSPECTOR_TABBED_PANE_TAB_SELECTOR, lmiTabbedPane);
      return tabs.length === 3;
    });
  });

  it('formats values correctly when value type mode is changed', async ({devToolsPage, inspectedPage}) => {
    await openLMI(devToolsPage, inspectedPage);
    const lmiTabbedPane = await devToolsPage.waitFor(LINEAR_MEMORY_INSPECTOR_TABBED_PANE_SELECTOR);
    const interpreter = await lmiTabbedPane.waitForSelector(VALUE_INTERPRETER_SELECTOR);
    assert.isNotNull(interpreter);

    const oldValueElement = await devToolsPage.$('div + .value-type-cell', interpreter);
    const oldValue = await oldValueElement.evaluate(e => (e as HTMLElement).innerText);
    const select = await devToolsPage.$('.value-types select', interpreter);
    assert.isNotNull(select);

    const currentMode = await select.evaluate(node => node.value);
    assert.strictEqual('dec', currentMode);

    await selectOption(select, 'hex');

    const newValue = await devToolsPage.waitForFunction(async () => {
      const newValueElement = await devToolsPage.$('div + .value-type-cell', interpreter);
      const textContent = await newValueElement.evaluate(e => (e as HTMLElement).innerText);
      if (!textContent.trim().startsWith('0x')) {
        return false;
      }
      return textContent;
    });

    // The standard format is decimal.
    // We expect the value to start with 0x... in hex mode.
    assert.match(oldValue, /^[0-9]+$/);
    assert.strictEqual(parseInt(oldValue, 10), parseInt(newValue, 16));
  });

  it('switches between value display and value settings', async ({devToolsPage, inspectedPage}) => {
    await openLMI(devToolsPage, inspectedPage);
    const lmiTabbedPane = await devToolsPage.waitFor(LINEAR_MEMORY_INSPECTOR_TABBED_PANE_SELECTOR);
    const interpreter = await lmiTabbedPane.waitForSelector(VALUE_INTERPRETER_SELECTOR);
    assert.isNotNull(interpreter);

    const settingsButton = await devToolsPage.waitFor('[data-settings="true"]', interpreter);
    // Display view should be visible initially
    await devToolsPage.waitFor('.value-types', interpreter);

    await settingsButton.click();
    // Settings view should be visible
    const settings = await devToolsPage.waitFor('.settings', interpreter);

    const settingsText = await settings.evaluate(el => (el as HTMLElement).innerText);
    assert.include(settingsText, 'Integer');
    assert.include(settingsText, 'Floating point');
    assert.include(settingsText, 'Other');

    await settingsButton.click();
    // Display view should be visible again
    await devToolsPage.waitFor('.value-types', interpreter);
  });
});

async function openLMI(devToolsPage: DevToolsPage, inspectedPage: InspectedPage) {
  const breakpointLine = '0x039';
  const fileName = 'memory.wasm';

  await openSourceCodeEditorForFile('memory.wasm', 'wasm/memory.html', devToolsPage, inspectedPage);

  await addBreakpointForLine(breakpointLine, devToolsPage);

  await reloadPageAndWaitForSourceFile(fileName, devToolsPage, inspectedPage);

  await devToolsPage.click('[aria-label="Module"]');
  await devToolsPage.waitFor('[aria-label="Module"][aria-expanded="true"]');

  await devToolsPage.waitFor('[data-object-property-name-for-test="memories"][aria-expanded="true"]');
  await inspectMemory('$imports.memory', devToolsPage);

  const drawerIsOpen = await checkIfTabExistsInDrawer(LINEAR_MEMORY_INSPECTOR_TAB_SELECTOR, devToolsPage);
  assert.isTrue(drawerIsOpen);
}
