// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {describe, it} from '../conductor/mocha-interface.js';
import {openSoftContextMenuAndClickOnItem} from '../helpers/context-menu-helpers.js';
import {
  openFileWithQuickOpen,
  runCommandWithQuickOpen,
} from '../helpers/quick_open-helpers.js';
import {
  expandSourceTreeItem,
  openFileInSourcesPanel,
  openSnippetsSubPane,
  openSourceCodeEditorForFile,
  openSourcesPanel,
  readSourcesTreeView,
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
           await runCommandWithQuickOpen(devToolsPage, 'Don’t automatically reveal files in sidebar');

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

      it('which updates when an iframe is added', async ({devToolsPage, inspectedPage}) => {
        const setGroupByFolder = async (checked: boolean) => {
          await devToolsPage.click('[title="More options"]');
          await devToolsPage.waitFor('.soft-context-menu');
          await devToolsPage.click(`[aria-label="Group by folder, ${checked ? 'unchecked' : 'checked'}"]`);
          await devToolsPage.waitForNone('.soft-context-menu');
          if (checked) {
            await devToolsPage.waitFor('[aria-label="test/e2e/resources/application, nw-folder"]');
          } else {
            await devToolsPage.waitForNone('[aria-label="test/e2e/resources/application, nw-folder"]');
          }
        };
        const waitForSourcesTreeView = async (expectedTree: string[]) => {
          const actualTree = await devToolsPage.waitForFunction(async () => {
            const tree = (await readSourcesTreeView(devToolsPage)).filter(item => !item.startsWith('pptr:'));
            if (tree.length !== expectedTree.length) {
              return undefined;
            }
            return tree.every((item, index) => item === expectedTree[index]) ? tree : undefined;
          });
          assert.deepEqual(actualTree, expectedTree);
        };
        const expandAllInitialFolderTree = async () => {
          await expandSourceTreeItem(devToolsPage, '[aria-label="top, frame"]');
          await expandSourceTreeItem(
              devToolsPage,
              `[aria-label="top, frame"] + ol > [aria-label="localhost:${inspectedPage.serverPort}, domain"]`);
          await expandSourceTreeItem(devToolsPage, '[aria-label="test/e2e/resources/application, nw-folder"]');
        };

        await inspectedPage.goToResource('application/resource-tree-non-unique-url-iframe.html');
        await openSourcesPanel(devToolsPage);
        await expandAllInitialFolderTree();

        await waitForSourcesTreeView([
          'top',
          'localhost:XXXX',
          'test/e2e/resources/application',
          'resource-tree-non-unique-url-iframe.html',
          'styles-non-unique-url.css',
        ]);

        await setGroupByFolder(false);
        try {
          await expandSourceTreeItem(devToolsPage, '[aria-label="top, frame"]');
          await waitForSourcesTreeView([
            'top',
            'resource-tree-non-unique-url-iframe.html',
            'styles-non-unique-url.css',
          ]);
        } finally {
          await setGroupByFolder(true);
        }

        await inspectedPage.evaluate(() => {
          const iframe = document.createElement('iframe');
          iframe.src = '../search/search.html';
          // eslint-disable-next-line @devtools/no-document-body-mutation
          document.body.appendChild(iframe);
        });

        await expandAllInitialFolderTree();
        await expandSourceTreeItem(devToolsPage, '[aria-label="search.html, frame"]');
        await expandSourceTreeItem(
            devToolsPage,
            `[aria-label="search.html, frame"] + ol > [aria-label="localhost:${inspectedPage.serverPort}, domain"]`);
        await expandSourceTreeItem(devToolsPage, '[aria-label="test/e2e/resources/search, nw-folder"]');

        await waitForSourcesTreeView([
          'top',
          'localhost:XXXX',
          'test/e2e/resources/application',
          'resource-tree-non-unique-url-iframe.html',
          'styles-non-unique-url.css',
          'search.html',
          'localhost:XXXX',
          'test/e2e/resources/search',
          'search.html',
          'search.js',
          'search.css',
        ]);

        await setGroupByFolder(false);
        try {
          await expandSourceTreeItem(devToolsPage, '[aria-label="top, frame"]');
          await expandSourceTreeItem(devToolsPage, '[aria-label="search.html, frame"]');
          await waitForSourcesTreeView([
            'top',
            'resource-tree-non-unique-url-iframe.html',
            'styles-non-unique-url.css',
            'search.html',
            'search.html',
            'search.js',
            'search.css',
          ]);
        } finally {
          await setGroupByFolder(true);
        }
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
