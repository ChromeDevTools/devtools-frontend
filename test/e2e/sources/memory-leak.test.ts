// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {describe, it} from '../conductor/mocha-interface.js';
import {focusConsolePrompt} from '../helpers/console-helpers.js';
import {
  doubleClickSourceTreeItem,
  getOpenSources,
  openSourceCodeEditorForFile,
  openSourcesPanel,
  SourceFileEvents,
  waitForSourceFiles,
} from '../helpers/sources-helpers.js';
import type {DevToolsPage} from '../shared/DevToolsPage.js';

async function getRetainedUISourceCodeUrls(devToolsPage: DevToolsPage): Promise<string[]> {
  await devToolsPage.collectGarbage();

  const prototype = await devToolsPage.page.evaluateHandle(`(async () => {
    const Workspace = await import('./models/workspace/workspace.js');
    return Workspace.UISourceCode.UISourceCode.prototype;
  })()`);
  const instances = await devToolsPage.page.queryObjects(prototype);
  const urls = await instances.evaluate(
      instances => (instances as Array<{url(): string}>).map(uiSourceCode => uiSourceCode.url()));
  await instances.dispose();
  await prototype.dispose();
  return urls;
}

async function expandTreeItem(devToolsPage: DevToolsPage, selector: string): Promise<void> {
  const sourceTreeItem = await devToolsPage.waitFor(selector);
  let expanded = false;
  try {
    expanded = await sourceTreeItem.evaluate(element => element.getAttribute('aria-expanded') === 'true');
  } finally {
    await sourceTreeItem.dispose();
  }
  if (!expanded) {
    await doubleClickSourceTreeItem(devToolsPage, selector);
  }
}

async function readSourcesTree(devToolsPage: DevToolsPage): Promise<string[]> {
  const items = await devToolsPage.$$('.navigator-folder-tree-item,.navigator-file-tree-item');
  try {
    const results = await Promise.all(items.map(handle => handle.evaluate(el => el.textContent as string)));
    return results.map(item => item.replace(/localhost:[0-9]+/, 'localhost:XXXX'));
  } finally {
    await Promise.all(items.map(handle => handle.dispose()));
  }
}

async function waitForSourcesTreeView(devToolsPage: DevToolsPage, expectedTree: string[]): Promise<void> {
  await devToolsPage.waitForFunction(async () => {
    const tree = await readSourcesTree(devToolsPage);
    return tree.length === expectedTree.length && tree.every((item, index) => item === expectedTree[index]);
  });
  assert.deepEqual(await readSourcesTree(devToolsPage), expectedTree);
}

describe('The Sources panel', () => {
  it('does not retain UISourceCodes of the previous page after navigation', async ({devToolsPage, inspectedPage}) => {
    await openSourceCodeEditorForFile(devToolsPage, inspectedPage, 'popover.js', 'popover.html');

    await waitForSourceFiles(devToolsPage, SourceFileEvents.ADDED_TO_SOURCE_TREE,
                             files => files.some(f => f.endsWith('empty.html')),
                             () => inspectedPage.goToResource('empty.html'));
    await devToolsPage.waitForFunction(async () => (await getOpenSources(devToolsPage)).length === 0);
    // CodeMirror caches the Range it last used for measuring text at module level, which keeps the last
    // measured (already destroyed) editor alive. Type into the console prompt to make it measure elsewhere.
    // Don't open another source file for this, as it would also mask "last revealed file" retainers.
    await devToolsPage.pressKey('Escape');
    await focusConsolePrompt(devToolsPage);
    await devToolsPage.typeText('1');

    const urls = await getRetainedUISourceCodeUrls(devToolsPage);
    assert.deepEqual(urls.filter(url => url.includes('/popover.')), []);
  });

  it('removes main frame, child iframe, and sourcemapped UISourceCodes on main frame navigation',
     async ({devToolsPage, inspectedPage}) => {
       await inspectedPage.goToResource('pages/hello-world.html');
       await (await openSourcesPanel(devToolsPage)).dispose();

       const initialExpectedTree = [
         'top',
         'localhost:XXXX',
         'test/e2e/resources/pages',
         'hello-world.html',
       ];
       await waitForSourcesTreeView(devToolsPage, initialExpectedTree);

       await waitForSourceFiles(
           devToolsPage,
           SourceFileEvents.ADDED_TO_SOURCE_TREE,
           files => files.some(f => f.endsWith('sourcemap-origin.js')) &&
               files.some(f => f.endsWith('sourcemap-origin.scss')),
           async () => {
             await inspectedPage.evaluate(`(() => {
               const frame = document.createElement('iframe');
               frame.id = 'frame';
               frame.src = '/test/e2e/resources/sources/sourcemap-origin.html';
               document.body.appendChild(frame);
               return new Promise(resolve => {
                 frame.addEventListener('load', () => resolve(), {once: true});
               });
             })()\n//# sourceURL=_test_attachFrame.js`);
           },
       );

       const frameSelector = '[aria-label="frame (sourcemap-origin.html), frame"]';
       const frameDomainSelector =
           `${frameSelector} + ol > [aria-label="localhost:${inspectedPage.serverPort}, domain"]`;
       const frameFolderSelector = `${frameDomainSelector} + ol > [aria-label="test/e2e/resources/sources, nw-folder"]`;
       await expandTreeItem(devToolsPage, frameSelector);
       await expandTreeItem(devToolsPage, frameDomainSelector);
       await expandTreeItem(devToolsPage, frameFolderSelector);

       const attachedExpectedTree = [
         'top',
         'localhost:XXXX',
         'test/e2e/resources/pages',
         'hello-world.html',
         '_test_attachFrame.js',
         'frame (sourcemap-origin.html)',
         'localhost:XXXX',
         'test/e2e/resources/sources',
         'sourcemap-origin.html',
         'sourcemap-origin.clash.js',
         'sourcemap-origin.clash.js',
         'sourcemap-origin.js',
         'sourcemap-origin.min.js',
         'sourcemap-origin.css',
         'sourcemap-origin.scss',
       ];
       await waitForSourcesTreeView(devToolsPage, attachedExpectedTree);

       await waitForSourceFiles(
           devToolsPage,
           SourceFileEvents.ADDED_TO_SOURCE_TREE,
           files => files.some(f => f.endsWith('empty.html')),
           () => inspectedPage.goToResource('empty.html'),
       );

       const postNavigationExpectedTree = [
         'top',
         'localhost:XXXX',
         'test/e2e/resources',
         'empty.html',
       ];
       await waitForSourcesTreeView(devToolsPage, postNavigationExpectedTree);

       const urls = await getRetainedUISourceCodeUrls(devToolsPage);
       assert.include(urls, `${inspectedPage.getResourcesPath()}/empty.html`);
       assert.deepEqual(
           urls.filter(
               url => url.includes('hello-world.html') || url.includes('_test_attachFrame.js') ||
                   url.includes('sourcemap-origin'),
               ),
           [],
       );
     });
});
