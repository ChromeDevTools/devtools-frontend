// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {describe, it} from '../conductor/mocha-interface.js';
import {getStructuredConsoleMessages, waitForConsoleMessagesToBeNonEmpty} from '../helpers/console-helpers.js';
import {openSoftContextMenuAndClickOnItem} from '../helpers/context-menu-helpers.js';
import {createNewSnippet, openSnippetsSubPane, openSourcesPanel, runSnippet} from '../helpers/sources-helpers.js';

const SNIPPETS_TAB_SELECTOR = '[aria-label="Snippets"]';

describe('Snippets', function() {
  it('with special characters in their name can be deleted', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('empty.html');
    const sourcePanel = await openSourcesPanel(devToolsPage);
    await devToolsPage.clickMoreTabsButton(sourcePanel);
    await devToolsPage.click(SNIPPETS_TAB_SELECTOR);

    await devToolsPage.click('[aria-label="New snippet"]');
    // The tree item for the new snippet shows up before the rename prompt is
    // activated, so wait for the prompt to be in editing mode before typing.
    await devToolsPage.waitFor('[aria-label^="Script snippet"] devtools-prompt[editing]');
    await devToolsPage.typeText('file@name\n');

    // Committing the rename and re-rendering the tree item happen asynchronously.
    await devToolsPage.waitFor('[aria-label="file@name, file"]');
    const treeItemNames = await devToolsPage.waitForFunction(async () => {
      const treeItems = await devToolsPage.$$('.navigator-file-tree-item');
      const names = await Promise.all(treeItems.map(x => x.evaluate(y => y.textContent)));
      return names.length === 1 && names[0] === 'file@name' ? names : undefined;
    });
    assert.deepEqual(treeItemNames, ['file@name']);

    await openSoftContextMenuAndClickOnItem(devToolsPage, '[aria-label="file@name, file"]', 'Remove');

    await devToolsPage.waitForNone('.navigator-file-tree-item');
  });

  it('can load modules via import()', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('empty.html');
    await openSourcesPanel(devToolsPage);
    await openSnippetsSubPane(devToolsPage);

    const snippetCode = [
      '(async () => {',
      '  const myModule = await import(\'./sources/multi-files-mycode.js\');',
      '  console.log(\'myModule.outer: \' + myModule.outer.name);',
      '})()',
      '\'end of snippet\'',
    ].join('\n');
    await createNewSnippet(devToolsPage, 'my_snippet_name', snippetCode);

    await runSnippet(devToolsPage);

    await waitForConsoleMessagesToBeNonEmpty(devToolsPage, 2);
    const messages = await getStructuredConsoleMessages(devToolsPage);
    assert.deepEqual(
        messages.map(({message, source}) => ({message, source})),
        [
          {message: '\'end of snippet\'', source: 'my_snippet_name:1'},
          {message: 'myModule.outer: outer', source: 'my_snippet_name:3'},
        ],
    );
  });
});
