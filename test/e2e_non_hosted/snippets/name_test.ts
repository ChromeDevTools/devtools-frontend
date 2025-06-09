// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  getAvailableSnippets,
  openCommandMenu,
  showSnippetsAutocompletion
} from '../../e2e/helpers/quick_open-helpers.js';
import {
  createNewSnippet,
  getOpenSources,
  openSnippetsSubPane,
  openSourcesPanel
} from '../../e2e/helpers/sources-helpers.js';
import type {DevToolsPage} from '../../e2e_non_hosted/shared/frontend-helper.js';

describe('Snippets subpane', () => {
  async function runTest(name: string, devToolsPage: DevToolsPage) {
    await openSourcesPanel(devToolsPage);
    await openSnippetsSubPane(devToolsPage);
    await createNewSnippet(name, undefined, devToolsPage);

    // Title matches
    const openSources = await devToolsPage.waitForFunction(async () => {
      const openSources = await getOpenSources(devToolsPage);
      return openSources.length > 0 ? openSources : undefined;
    });
    assert.deepEqual(openSources, [name]);

    await openCommandMenu(devToolsPage);
    await showSnippetsAutocompletion(devToolsPage);

    // Available in autocompletion
    const availableSnippets = await devToolsPage.waitForFunction(async () => {
      const availableSnippets = await getAvailableSnippets(devToolsPage);
      return availableSnippets.length > 0 ? availableSnippets : undefined;
    });
    assert.deepEqual(availableSnippets, [
      name + '\u200B',
    ]);
  }

  it('can create snippet with simple name', async ({devToolsPage}) => {
    await runTest('MySnippet', devToolsPage);
  });

  it('can create snippet with name like default name', async ({devToolsPage}) => {
    await runTest('My Snippet #555', devToolsPage);
  });

  it('can create snippet with name with slash', async ({devToolsPage}) => {
    await runTest('My Group #1/Snip #1', devToolsPage);
  });

  it('can create snippet with name with backslash', async ({devToolsPage}) => {
    await runTest('My Group #1\Snip #1', devToolsPage);
  });
});
