// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {getBrowserAndPages, waitFor, waitForNone} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {openFileWithQuickOpen, runCommandWithQuickOpen} from '../helpers/quick_open-helpers.js';
import {
  clickOnContextMenu,
  getSelectedNavigatorTabTitle,
  openFileInSourcesPanel,
  openSnippetsSubPane,
  openSourceCodeEditorForFile,
  openSourcesPanel,
  toggleNavigatorSidebar,
} from '../helpers/sources-helpers.js';

describe('The Sources panel', async () => {
  describe('contains a Navigator view', () => {
    describe('with a Page tab', () => {
      it('which offers a context menu option "Search in folder" for folders', async () => {
        await openSourceCodeEditorForFile('index.html', 'navigation/index.html');

        await clickOnContextMenu('[aria-label="test/e2e/resources/sources/navigation, nw-folder"]', 'Search in folder');
        const element = await waitFor('[aria-label="Search Query"]');
        const value = await element.evaluate(input => (input as HTMLInputElement).value);

        assert.strictEqual(value, 'file:test/e2e/resources/sources/navigation');
      });

      it('which automatically reveals the correct file (by default)', async () => {
        // Navigate without opening a file, while displaying the 'Page' tree.
        await openFileInSourcesPanel('navigation/index.html');

        // Open file via the command menu.
        await openFileWithQuickOpen('index.html');

        // Wait for the file to be selected in the 'Page' tree.
        await waitFor('.navigator-file-tree-item[aria-label="index.html, file"][aria-selected="true"]');
      });

      it('which does not automatically reveal newly opened files when the setting is disabled', async () => {
        // Navigate and open minified-errors.html.
        await openSourceCodeEditorForFile('minified-errors.html', 'minified-errors.html');
        // Wait for the file to be selected in the 'Page' tree.
        await waitFor('.navigator-file-tree-item[aria-label="minified-errors.html, file"][aria-selected="true"]');
        // Disable the automatic reveal feature.
        await runCommandWithQuickOpen('Do not automatically reveal files in sidebar');

        // Open another file via the command menu.
        await openFileWithQuickOpen('minified-errors.js');
        // Wait for the file to appear in a 'Sources' panel tab.
        await waitFor('.tabbed-pane-header-tab[aria-label="minified-errors.js"][aria-selected="true"]');

        // Check that the selected item in the tree is still minified-errors.html.
        const selectedTreeItem = await waitFor('.navigator-file-tree-item[aria-selected="true"]');
        const selectedTreeItemText = await selectedTreeItem.evaluate(node => node.textContent);
        assert.strictEqual(selectedTreeItemText, 'minified-errors.html');
      });

      it('which reveals the correct file when using the "Reveal in sidebar" context menu option', async () => {
        // Navigate without opening a file, switch to 'Snippets' view.
        await openFileInSourcesPanel('navigation/index.html');
        await openSnippetsSubPane();

        // Open file via the command menu.
        await openFileWithQuickOpen('index.html');
        // Manually reveal the file in the sidebar.
        await clickOnContextMenu(
            '.tabbed-pane-header-tab[aria-label="index.html"][aria-selected="true"]',
            'Reveal in sidebar',
        );

        // Wait for the file to be selected in the 'Page' tree.
        await waitFor('.navigator-file-tree-item[aria-label="index.html, file"][aria-selected="true"]');
      });
    });

    it('which does not automatically switch to the Page tab when opening a document', async () => {
      // Navigate without opening a file, switch to 'Snippets' view.
      await openFileInSourcesPanel('navigation/index.html');
      await openSnippetsSubPane();

      // Open file via the command menu.
      await openFileWithQuickOpen('index.html');
      // Wait for the file to appear in a 'Sources' panel tab.
      await waitFor('.tabbed-pane-header-tab[aria-label="index.html"][aria-selected="true"]');

      // Check that we're still in 'Snippets' view.
      assert.strictEqual(await getSelectedNavigatorTabTitle(), 'Snippets');
    });

    it('which can be toggled via Ctrl+Shift+Y shortcut keyboard shortcut', async () => {
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
  });
});
