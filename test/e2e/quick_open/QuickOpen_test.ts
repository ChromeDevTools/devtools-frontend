// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {clickElement, enableExperiment, goToResource, step, waitFor} from '../../shared/helper.js';

import {navigateToElementsTab} from '../helpers/elements-helpers.js';
import {
  getMenuItemAtPosition,
  getMenuItemTitleAtPosition,
  openFileQuickOpen,
  readQuickOpenResults,
  typeIntoQuickOpen,
} from '../helpers/quick_open-helpers.js';
import {setIgnoreListPattern, togglePreferenceInSettingsTab} from '../helpers/settings-helpers.js';
import {openSourcesPanel, SourceFileEvents, waitForSourceFiles} from '../helpers/sources-helpers.js';

async function openAFileWithQuickMenu() {
  await step('navigate to elements tab', async () => {
    await navigateToElementsTab();
  });

  await waitForSourceFiles(
      SourceFileEvents.SOURCE_FILE_LOADED, files => files.some(f => f.endsWith('hello-world.html')), async () => {
        await step('open quick open menu and select the first option', async () => {
          await goToResource('pages/hello-world.html');
          await openFileQuickOpen();
          const firstItem = await getMenuItemAtPosition(0);
          await clickElement(firstItem);
        });
        await step('check the sources panel is open with the selected file', async () => {
          await waitFor('.navigator-file-tree-item');
        });
      });
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

  it('sorts ignore listed below unignored', async () => {
    await setIgnoreListPattern('mycode');
    await goToResource('sources/multi-files.html');
    await openSourcesPanel();

    await typeIntoQuickOpen('mult');
    const list = await readQuickOpenResults();
    assert.deepEqual(list, ['multi-files-thirdparty.js', 'multi-files.html', 'multi-files-mycode.js']);
  });

  it('Does not list ignore-listed files', async () => {
    await enableExperiment('just-my-code');
    await setIgnoreListPattern('workers.js');
    await goToResource('sources/multi-workers-sourcemap.html');
    await openSourcesPanel();

    await typeIntoQuickOpen('mult');
    const list = await readQuickOpenResults();
    assert.deepEqual(list, ['multi-workers.min.js', 'multi-workers-sourcemap.html']);
  });

  it('lists both deployed and authored file', async () => {
    await goToResource('sources/sourcemap-origin.html');
    await openSourcesPanel();

    await typeIntoQuickOpen('sourcemap-origin.clash.js');
    const list = await readQuickOpenResults();
    assert.deepEqual(list, ['sourcemap-origin.clash.js', 'sourcemap-origin.clash.js']);
  });

  it('should not list network fetch requests (that are not overidden)', async () => {
    await goToResource('network/fetch-json.html');
    await typeIntoQuickOpen('json');
    const list = await readQuickOpenResults();
    assert.isFalse(list.includes('coffees.json'));
  });

  it('should not list network xhr requests (that are not overidden)', async () => {
    await goToResource('network/xhr-json.html');
    await typeIntoQuickOpen('json');
    const list = await readQuickOpenResults();
    assert.isFalse(list.includes('coffees.json'));
  });
});
