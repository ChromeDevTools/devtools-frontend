// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {$$, click, enableExperiment, getBrowserAndPages, goToResource, step, waitFor} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {navigateToElementsTab} from '../helpers/elements-helpers.js';
import {getMenuItemAtPosition, getMenuItemTitleAtPosition, openFileQuickOpen} from '../helpers/quick_open-helpers.js';
import {setIgnoreListPattern, togglePreferenceInSettingsTab} from '../helpers/settings-helpers.js';
import {listenForSourceFilesLoaded, openSourcesPanel, waitForSourceLoadedEvent} from '../helpers/sources-helpers.js';

async function openAFileWithQuickMenu() {
  const {frontend} = getBrowserAndPages();
  await listenForSourceFilesLoaded(frontend);
  await step('navigate to elements tab', async () => {
    await navigateToElementsTab();
  });
  await step('open quick open menu and select the first option', async () => {
    await goToResource('pages/hello-world.html');
    await openFileQuickOpen();
    const firstItem = await getMenuItemAtPosition(0);
    await click(firstItem);
  });
  await step('check the sources panel is open with the selected file', async () => {
    await waitFor('.navigator-file-tree-item');
    await waitForSourceLoadedEvent(frontend, 'hello-world.html');
  });
}

async function typeIntoQuickOpen(query: string, expectEmptyResults?: boolean) {
  await openFileQuickOpen();
  const prompt = await waitFor('[aria-label="Quick open prompt"]');
  await prompt.type(query);
  if (expectEmptyResults) {
    await waitFor('.filtered-list-widget :not(.hidden).not-found-text');
  } else {
    // Because each highlighted character is in its own div, we can count the highlighted
    // characters in one item to see that the list reflects the full query.
    const highlightSelector = new Array(query.length).fill('.highlight').join(' ~ ');
    await waitFor('.filtered-list-widget-title ' + highlightSelector);
  }
}

async function readQuickOpenResults(): Promise<string[]> {
  const items = await $$('.filtered-list-widget-title');
  return await Promise.all(items.map(element => element.evaluate(el => el.textContent as string)));
}

describe('Quick Open menu', () => {
  it('lists available files', async () => {
    await goToResource('pages/hello-world.html');
    await openFileQuickOpen();
    const firstItemTitle = await getMenuItemTitleAtPosition(0);
    assert.strictEqual(firstItemTitle, 'hello-world.html');
  });

  it('opens the sources panel when a file is selected', async () => {
    await openAFileWithQuickMenu();
    await togglePreferenceInSettingsTab('Focus Sources panel when triggering a breakpoint');
    await openAFileWithQuickMenu();
  });

  it('sorts authored above deployed', async () => {
    await goToResource('sources/multi-workers-sourcemap.html');
    await openSourcesPanel();

    await typeIntoQuickOpen('mult');
    const list = await readQuickOpenResults();
    assert.deepEqual(list, ['multi-workers.js', 'multi-workers.min.js', 'multi-workers-sourcemap.html']);
  });

  it('Does not list ignore-listed files', async () => {
    await enableExperiment('justMyCode');
    await setIgnoreListPattern('workers.js');
    await goToResource('sources/multi-workers-sourcemap.html');
    await openSourcesPanel();

    await typeIntoQuickOpen('mult');
    const list = await readQuickOpenResults();
    assert.deepEqual(list, ['multi-workers.min.js', 'multi-workers-sourcemap.html']);
  });
});
