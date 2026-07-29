// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {openSoftContextMenuAndClickOnItem} from '../helpers/context-menu-helpers.js';
import {
  openFileWithQuickOpen,
  runCommandWithQuickOpen,
} from '../helpers/quick_open-helpers.js';
import {
  openFileInSourcesPanel,
  openSnippetsSubPane,
  openSourceCodeEditorForFile,
  openSourcesPanel,
} from '../helpers/sources-helpers.js';

describe('The Sources panel', () => {
  describe('contains a Navigator view', () => {
    describe('with a Page tab', () => {
      it('which offers a context menu option "Search in all files" for top frames',
         async ({devToolsPage, inspectedPage}) => {
           await openSourceCodeEditorForFile(devToolsPage, inspectedPage, 'index.html', 'navigation/index.html');

           await openSoftContextMenuAndClickOnItem(devToolsPage, '[aria-label="top, frame"]', 'Search in all files');

           const element = await devToolsPage.waitFor('[aria-label="Find"]');
           const value = await element.evaluate(input => (input as HTMLInputElement).value);
           assert.strictEqual(value, '');
         });

      it('which offers a context menu option "Search in folder" for folders', async ({devToolsPage, inspectedPage}) => {
        await openSourceCodeEditorForFile(devToolsPage, inspectedPage, 'index.html', 'navigation/index.html');

        await openSoftContextMenuAndClickOnItem(
            devToolsPage, '[aria-label="test/e2e/resources/sources/navigation, nw-folder"]', 'Search in folder');

        const element = await devToolsPage.waitFor('[aria-label="Find"]');
        const value = await element.evaluate(input => (input as HTMLInputElement).value);
        assert.strictEqual(value, 'file:test/e2e/resources/sources/navigation');
      });

      it('which automatically reveals the correct file (by default)', async ({devToolsPage, inspectedPage}) => {
        // Navigate without opening a file, while displaying the 'Page' tree.
        await openFileInSourcesPanel(devToolsPage, inspectedPage, 'navigation/index.html');

        // Open file via the command menu.
        await openFileWithQuickOpen(devToolsPage, 'index.html', 0);

        // Wait for the file to be selected in the 'Page' tree.
        await devToolsPage.waitFor('.navigator-file-tree-item[aria-label="index.html, file"][aria-selected="true"]');
      });

      it('which does not automatically reveal newly opened files when the setting is disabled',
         async ({devToolsPage, inspectedPage}) => {
           // Navigate and open minified-errors.html.
           await openSourceCodeEditorForFile(devToolsPage, inspectedPage, 'minified-errors.html',
                                             'minified-errors.html');
           // Wait for the file to be selected in the 'Page' tree.
           await devToolsPage.waitFor(
               '.navigator-file-tree-item[aria-label="minified-errors.html, file"][aria-selected="true"]');
           // Disable the automatic reveal feature.
           await runCommandWithQuickOpen(devToolsPage, 'Do not automatically reveal files in sidebar');

           // Open another file via the command menu.
           await openFileWithQuickOpen(devToolsPage, 'minified-errors.js', 0);

           // Check that the selected item in the tree is still minified-errors.html.
           const selectedTreeItem = await devToolsPage.waitFor('.navigator-file-tree-item[aria-selected="true"]');
           const selectedTreeItemText = await selectedTreeItem.evaluate(node => node.textContent);
           assert.strictEqual(selectedTreeItemText, 'minified-errors.html');
         });

      it('which reveals the correct file via the "Reveal in navigator sidebar" context menu option (in the code editor)',
         async ({devToolsPage, inspectedPage}) => {
           // Navigate and wait for 'index.html' to load, switch to 'Snippets' view.
           await openSourceCodeEditorForFile(devToolsPage, inspectedPage, 'index.html', 'navigation/index.html');
           await devToolsPage.waitFor('.tabbed-pane-header-tab[aria-label="index.html"][aria-selected="true"]');
           await openSnippetsSubPane(devToolsPage);

           // Manually reveal the file in the sidebar.
           await openSoftContextMenuAndClickOnItem(devToolsPage, '[aria-label="Code editor"]',
                                                   'Reveal in navigator sidebar');

           // Wait for the file to be selected in the 'Page' tree.
           await devToolsPage.waitFor('.navigator-file-tree-item[aria-label="index.html, file"][aria-selected="true"]');
         });

      it('which reveals the correct file via the "Reveal in navigator sidebar" context menu option (in the tab header)',
         async ({devToolsPage, inspectedPage}) => {
           // Navigate and wait for 'index.html' to load, switch to 'Snippets' view.
           await openSourceCodeEditorForFile(devToolsPage, inspectedPage, 'index.html', 'navigation/index.html');
           await devToolsPage.waitFor('.tabbed-pane-header-tab[aria-label="index.html"][aria-selected="true"]');
           await openSnippetsSubPane(devToolsPage);

           // Manually reveal the file in the sidebar.
           await openSoftContextMenuAndClickOnItem(
               devToolsPage, '.tabbed-pane-header-tab[aria-label="index.html"][aria-selected="true"]',
               'Reveal in navigator sidebar');

           // Wait for the file to be selected in the 'Page' tree.
           await devToolsPage.waitFor('.navigator-file-tree-item[aria-label="index.html, file"][aria-selected="true"]');
         });

      it('which reveals the correct file via the "Reveal active file in navigator sidebar" command',
         async ({devToolsPage, inspectedPage}) => {
           // Navigate and wait for 'index.html' to load, switch to 'Snippets' view.
           await openSourceCodeEditorForFile(devToolsPage, inspectedPage, 'index.html', 'navigation/index.html');
           await devToolsPage.waitFor('.tabbed-pane-header-tab[aria-label="index.html"][aria-selected="true"]');
           await openSnippetsSubPane(devToolsPage);

           // Manually reveal the file in the sidebar.
           await runCommandWithQuickOpen(devToolsPage, 'Reveal active file in navigator sidebar');

           // Wait for the file to be selected in the 'Page' tree.
           await devToolsPage.waitFor('.navigator-file-tree-item[aria-label="index.html, file"][aria-selected="true"]');
         });
    });

    it('which does not automatically reveal when opening a file', async ({devToolsPage, inspectedPage}) => {
      // Navigate without opening a file, close the navigator view.
      await openFileInSourcesPanel(devToolsPage, inspectedPage, 'navigation/index.html');
      await devToolsPage.pressKey('y', {control: true, shift: true});

      // Open file via the command menu.
      await openFileWithQuickOpen(devToolsPage, 'index.html', 0);

      // Check that the navigator view is still hidden.
      await devToolsPage.waitForNone('.navigator-tabbed-pane');
    });

    it('which can be toggled via Ctrl+Shift+Y shortcut keyboard shortcut', async ({devToolsPage}) => {
      // Open 'Sources' panel and make sure that the navigator view is not collapsed in initial state.
      await openSourcesPanel(devToolsPage);
      await devToolsPage.waitFor('.navigator-tabbed-pane');

      // Collapse navigator view.
      await devToolsPage.pressKey('y', {control: true, shift: true});
      await devToolsPage.waitForNone('.navigator-tabbed-pane');

      // Expand navigator view.
      await devToolsPage.pressKey('y', {control: true, shift: true});
      await devToolsPage.waitFor('.navigator-tabbed-pane');
    });
  });
});
