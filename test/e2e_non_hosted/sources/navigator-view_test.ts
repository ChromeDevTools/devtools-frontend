// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {openSoftContextMenuAndClickOnItem} from '../../e2e/helpers/context-menu-helpers.js';
import {
  openFileWithQuickOpen,
  runCommandWithQuickOpen,
} from '../../e2e/helpers/quick_open-helpers.js';
import {
  openFileInSourcesPanel,
  openSnippetsSubPane,
  openSourceCodeEditorForFile,
  openSourcesPanel,
  toggleNavigatorSidebar,
} from '../../e2e/helpers/sources-helpers.js';

describe('The Sources panel', () => {
  describe('contains a Navigator view', () => {
    describe('with a Page tab', () => {
      it('which offers a context menu option "Search in all files" for top frames',
         async ({devToolsPage, inspectedPage}) => {
           await openSourceCodeEditorForFile('index.html', 'navigation/index.html', devToolsPage, inspectedPage);

           await openSoftContextMenuAndClickOnItem('[aria-label="top, frame"]', 'Search in all files', devToolsPage);

           const element = await devToolsPage.waitFor('[aria-label="Find"]');
           const value = await element.evaluate(input => (input as HTMLInputElement).value);
           assert.strictEqual(value, '');
         });

      it('which offers a context menu option "Search in folder" for folders', async ({devToolsPage, inspectedPage}) => {
        await openSourceCodeEditorForFile('index.html', 'navigation/index.html', devToolsPage, inspectedPage);

        await openSoftContextMenuAndClickOnItem(
            '[aria-label="test/e2e/resources/sources/navigation, nw-folder"]', 'Search in folder', devToolsPage);

        const element = await devToolsPage.waitFor('[aria-label="Find"]');
        const value = await element.evaluate(input => (input as HTMLInputElement).value);
        assert.strictEqual(value, 'file:test/e2e/resources/sources/navigation');
      });

      it('which automatically reveals the correct file (by default)', async ({devToolsPage, inspectedPage}) => {
        // Navigate without opening a file, while displaying the 'Page' tree.
        await openFileInSourcesPanel('navigation/index.html', devToolsPage, inspectedPage);

        // Open file via the command menu.
        await openFileWithQuickOpen('index.html', 0, devToolsPage);

        // Wait for the file to be selected in the 'Page' tree.
        await devToolsPage.waitFor('.navigator-file-tree-item[aria-label="index.html, file"][aria-selected="true"]');
      });

      it('which does not automatically reveal newly opened files when the setting is disabled',
         async ({devToolsPage, inspectedPage}) => {
           // Navigate and open minified-errors.html.
           await openSourceCodeEditorForFile(
               'minified-errors.html', 'minified-errors.html', devToolsPage, inspectedPage);
           // Wait for the file to be selected in the 'Page' tree.
           await devToolsPage.waitFor(
               '.navigator-file-tree-item[aria-label="minified-errors.html, file"][aria-selected="true"]');
           // Disable the automatic reveal feature.
           await runCommandWithQuickOpen('Do not automatically reveal files in sidebar', devToolsPage);

           // Open another file via the command menu.
           await openFileWithQuickOpen('minified-errors.js', 0, devToolsPage);

           // Check that the selected item in the tree is still minified-errors.html.
           const selectedTreeItem = await devToolsPage.waitFor('.navigator-file-tree-item[aria-selected="true"]');
           const selectedTreeItemText = await selectedTreeItem.evaluate(node => node.textContent);
           assert.strictEqual(selectedTreeItemText, 'minified-errors.html');
         });

      it('which reveals the correct file via the "Reveal in navigator sidebar" context menu option (in the code editor)',
         async ({devToolsPage, inspectedPage}) => {
           // Navigate and wait for 'index.html' to load, switch to 'Snippets' view.
           await openSourceCodeEditorForFile('index.html', 'navigation/index.html', devToolsPage, inspectedPage);
           await devToolsPage.waitFor('.tabbed-pane-header-tab[aria-label="index.html"][aria-selected="true"]');
           await openSnippetsSubPane(devToolsPage);

           // Manually reveal the file in the sidebar.
           await openSoftContextMenuAndClickOnItem(
               '[aria-label="Code editor"]', 'Reveal in navigator sidebar', devToolsPage);

           // Wait for the file to be selected in the 'Page' tree.
           await devToolsPage.waitFor('.navigator-file-tree-item[aria-label="index.html, file"][aria-selected="true"]');
         });

      it('which reveals the correct file via the "Reveal in navigator sidebar" context menu option (in the tab header)',
         async ({devToolsPage, inspectedPage}) => {
           // Navigate and wait for 'index.html' to load, switch to 'Snippets' view.
           await openSourceCodeEditorForFile('index.html', 'navigation/index.html', devToolsPage, inspectedPage);
           await devToolsPage.waitFor('.tabbed-pane-header-tab[aria-label="index.html"][aria-selected="true"]');
           await openSnippetsSubPane(devToolsPage);

           // Manually reveal the file in the sidebar.
           await openSoftContextMenuAndClickOnItem(
               '.tabbed-pane-header-tab[aria-label="index.html"][aria-selected="true"]',
               'Reveal in navigator sidebar',
               devToolsPage,
           );

           // Wait for the file to be selected in the 'Page' tree.
           await devToolsPage.waitFor('.navigator-file-tree-item[aria-label="index.html, file"][aria-selected="true"]');
         });

      it('which reveals the correct file via the "Reveal active file in navigator sidebar" command',
         async ({devToolsPage, inspectedPage}) => {
           // Navigate and wait for 'index.html' to load, switch to 'Snippets' view.
           await openSourceCodeEditorForFile('index.html', 'navigation/index.html', devToolsPage, inspectedPage);
           await devToolsPage.waitFor('.tabbed-pane-header-tab[aria-label="index.html"][aria-selected="true"]');
           await openSnippetsSubPane(devToolsPage);

           // Manually reveal the file in the sidebar.
           await runCommandWithQuickOpen('Reveal active file in navigator sidebar', devToolsPage);

           // Wait for the file to be selected in the 'Page' tree.
           await devToolsPage.waitFor('.navigator-file-tree-item[aria-label="index.html, file"][aria-selected="true"]');
         });
    });

    it('which does not automatically reveal when opening a file', async ({devToolsPage, inspectedPage}) => {
      // Navigate without opening a file, close the navigator view.
      await openFileInSourcesPanel('navigation/index.html', devToolsPage, inspectedPage);
      await toggleNavigatorSidebar(devToolsPage.page);

      // Open file via the command menu.
      await openFileWithQuickOpen('index.html', 0, devToolsPage);

      // Check that the navigator view is still hidden.
      await devToolsPage.waitForNone('.navigator-tabbed-pane');
    });

    it('which can be toggled via Ctrl+Shift+Y shortcut keyboard shortcut', async ({devToolsPage}) => {
      // Open 'Sources' panel and make sure that the navigator view is not collapsed in initial state.
      await openSourcesPanel(devToolsPage);
      await devToolsPage.waitFor('.navigator-tabbed-pane');

      // Collapse navigator view.
      await toggleNavigatorSidebar(devToolsPage.page);
      await devToolsPage.waitForNone('.navigator-tabbed-pane');

      // Expand navigator view.
      await toggleNavigatorSidebar(devToolsPage.page);
      await devToolsPage.waitFor('.navigator-tabbed-pane');
    });

    it('which can scroll the navigator element into view on source file change', async ({devToolsPage}) => {
      async function openFirstSnippetInList() {
        const sourcesView = await devToolsPage.waitFor('#sources-panel-sources-view');
        await devToolsPage.click('[aria-label="More tabs"]', {root: sourcesView});
        await devToolsPage.click('[aria-label="Script snippet #1"]');
      }

      await openSourcesPanel(devToolsPage);
      await openSnippetsSubPane(devToolsPage);

      const numSnippets = 50;
      for (let i = 0; i < numSnippets; ++i) {
        await devToolsPage.click('[aria-label="New snippet"]');
        await devToolsPage.waitFor(`[aria-label="Script snippet #${i + 1}"]`);
      }

      const snippetsPanel = await devToolsPage.waitFor('[aria-label="Snippets panel"]');
      const scrollTopBeforeFileChange = await snippetsPanel.evaluate(panel => panel.scrollTop);

      await openFirstSnippetInList();

      await devToolsPage.waitForFunction(async () => {
        const scrollTopAfterFileChange = await snippetsPanel.evaluate(panel => panel.scrollTop);
        return scrollTopBeforeFileChange !== scrollTopAfterFileChange;
      });

      assert.notStrictEqual(scrollTopBeforeFileChange, await snippetsPanel.evaluate(panel => panel.scrollTop));
    });
  });
});
