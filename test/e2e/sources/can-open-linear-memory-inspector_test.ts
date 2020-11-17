// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {$, enableExperiment, getBrowserAndPages, step, waitFor} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {checkIfTabExistsInDrawer, DRAWER_PANEL_SELECTOR} from '../helpers/cross-tool-helper.js';
import {addBreakpointForLine, clickOnContextMenu, openSourceCodeEditorForFile, waitForSourceCodeLines} from '../helpers/sources-helpers.js';

const LINEAR_MEMORY_INSPECTOR_TAB_SELECTOR = '#tab-linear-memory-inspector';
const LINEAR_MEMORY_INSPECTOR_TABBED_PANE_SELECTOR = DRAWER_PANEL_SELECTOR + ' .tabbed-pane';

describe('Scope View', async () => {
  it('opens linear memory inspector', async () => {
    await enableExperiment('wasmDWARFDebugging');

    const {frontend, target} = getBrowserAndPages();
    const breakpointLine = 5;
    const numberOfLines = 7;

    await step('navigate to a page and open the Sources tab', async () => {
      await openSourceCodeEditorForFile('memory.wasm', 'wasm/memory.html');
    });

    await step(`add a breakpoint to line No.${breakpointLine}`, async () => {
      await addBreakpointForLine(frontend, breakpointLine);
    });

    await step('reload the page', async () => {
      await target.reload();
    });

    await step('wait for all the source code to appear', async () => {
      await waitForSourceCodeLines(numberOfLines);
    });

    await step('open linear memory inspector from context menu', async () => {
      await clickOnContextMenu('[aria-label="imports.memory"]', 'Inspect memory');
    });

    await step('check that linear memory inspector drawer is open', async () => {
      const drawerIsOpen = await checkIfTabExistsInDrawer(LINEAR_MEMORY_INSPECTOR_TAB_SELECTOR);
      assert.isTrue(drawerIsOpen);
    });

    await step('check that opened linear memory inspector has correct title', async () => {
      const lmiTabbedPane = await waitFor(LINEAR_MEMORY_INSPECTOR_TABBED_PANE_SELECTOR);
      const titleElement = await $('.tabbed-pane-header-tab-title', lmiTabbedPane);
      assert.isNotNull(titleElement);
      const title = await frontend.evaluate(x => x.innerText, titleElement);

      assert.strictEqual(title, 'memory.wasm');
    });
  });
});
