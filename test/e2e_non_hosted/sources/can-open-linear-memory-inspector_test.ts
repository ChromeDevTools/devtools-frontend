// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {checkIfTabExistsInDrawer, DRAWER_PANEL_SELECTOR} from '../../e2e/helpers/cross-tool-helper.js';
import {
  addBreakpointForLine,
  inspectMemory,
  openSourceCodeEditorForFile,
  PAUSE_INDICATOR_SELECTOR,
  reloadPageAndWaitForSourceFile,
  RESUME_BUTTON,
  retrieveTopCallFrameWithoutResuming,
} from '../../e2e/helpers/sources-helpers.js';

const LINEAR_MEMORY_INSPECTOR_TAB_SELECTOR = '#tab-linear-memory-inspector';
const LINEAR_MEMORY_INSPECTOR_TABBED_PANE_SELECTOR = DRAWER_PANEL_SELECTOR + ' .tabbed-pane';
const LINEAR_MEMORY_INSPECTOR_TABBED_PANE_TAB_SELECTOR = '.tabbed-pane-header-tab';
const LINEAR_MEMORY_INSPECTOR_TAB_TITLE_SELECTOR = '.tabbed-pane-header-tab-title';

describe('Scope View', () => {
  it('opens linear memory inspector', async ({devToolsPage, inspectedPage}) => {
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
});
