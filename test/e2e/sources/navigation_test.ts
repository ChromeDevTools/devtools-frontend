// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {getBrowserAndPages, waitFor, waitForNone} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {
  clickOnContextMenu,
  openSourceCodeEditorForFile,
  openSourcesPanel,
  toggleDebuggerSidebar,
  toggleNavigatorSidebar,
} from '../helpers/sources-helpers.js';

describe('The Sources Tab', async () => {
  describe('Navigation', () => {
    it('should show a "search in folder" option in the context menu of folders', async () => {
      await openSourceCodeEditorForFile('index.html', 'navigation/index.html');

      await clickOnContextMenu('[aria-label="test/e2e/resources/sources/navigation, nw-folder"]', 'Search in folder');
      const element = await waitFor('[aria-label="Search Query"]');
      const value = await element.evaluate(input => (input as HTMLInputElement).value);

      assert.strictEqual(value, 'file:test/e2e/resources/sources/navigation');
    });
  });

  describe('Sidebar shortcuts', () => {
    it('should Ctrl + Shift + Y shortcut toggle navigator sidebar', async () => {
      const {frontend} = getBrowserAndPages();
      await openSourcesPanel();
      // Make sure that the navigator sidebar is not collapsed in initial state
      await waitFor('.navigator-tabbed-pane');
      // Collapse navigator sidebar
      await toggleNavigatorSidebar(frontend);
      await waitForNone('.navigator-tabbed-pane');
      // Expand navigator sidebar
      await toggleNavigatorSidebar(frontend);
      await waitFor('.navigator-tabbed-pane');
    });

    it('should Ctrl + Shift + H shortcut toggle debug sidebar', async () => {
      const {frontend} = getBrowserAndPages();
      await openSourcesPanel();
      // Make sure that the debug sidebar is not collapsed in initial state
      await waitFor('.scripts-debug-toolbar');
      //  Collapse debug sidebar
      await toggleDebuggerSidebar(frontend);
      await waitForNone('.scripts-debug-toolbar');
      // Expand debug sidebar
      await toggleDebuggerSidebar(frontend);
      await waitFor('.scripts-debug-toolbar');
    });
  });
});
