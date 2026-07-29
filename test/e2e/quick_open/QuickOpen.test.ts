// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {step} from '../../shared/helper.js';
import {
  getMenuItemAtPosition,
  getMenuItemTitleAtPosition,
  openFileQuickOpen,
  readQuickOpenResults,
  typeIntoQuickOpen,
} from '../helpers/quick_open-helpers.js';
import {setIgnoreListPattern, togglePreferenceInSettingsTab} from '../helpers/settings-helpers.js';
import {openSourcesPanel, SourceFileEvents, waitForSourceFiles} from '../helpers/sources-helpers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';
import type {InspectedPage} from '../shared/target-helper.js';

async function openAFileWithQuickMenu(devToolsPage: DevToolsPage, inspectedPage: InspectedPage) {
  await waitForSourceFiles(
      devToolsPage, SourceFileEvents.SOURCE_FILE_LOADED, files => files.some(f => f.endsWith('hello-world.html')),
      async () => {
        await step('open quick open menu and select the first option', async () => {
          await inspectedPage.goToResource('pages/hello-world.html');
          await openFileQuickOpen(devToolsPage);
          const firstItem = await getMenuItemAtPosition(devToolsPage, 0);
          await devToolsPage.clickElement(firstItem);
        });
        await step('check the sources panel is open with the selected file', async () => {
          await devToolsPage.waitFor('.navigator-file-tree-item');
        });
      });
}

describe('Quick Open menu', () => {
  it('lists available files', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('pages/hello-world.html');
    await openFileQuickOpen(devToolsPage);
    const firstItemTitle = await getMenuItemTitleAtPosition(devToolsPage, 0);
    assert.strictEqual(firstItemTitle, 'hello-world.html');
  });

  it('opens the sources panel when a file is selected', async ({devToolsPage, inspectedPage}) => {
    await openAFileWithQuickMenu(devToolsPage, inspectedPage);
    await togglePreferenceInSettingsTab(devToolsPage, 'Focus Sources panel when triggering a breakpoint', undefined);
    await openAFileWithQuickMenu(devToolsPage, inspectedPage);
  });

  it('sorts authored above deployed', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('sources/multi-workers-sourcemap.html');
    await openSourcesPanel(devToolsPage);

    await typeIntoQuickOpen(devToolsPage, 'mult', undefined);
    const list = await readQuickOpenResults(devToolsPage);
    assert.deepEqual(list, ['multi-workers.js', 'multi-workers.min.js', 'multi-workers-sourcemap.html']);
  });

  it('sorts ignore listed below unignored', async ({devToolsPage, inspectedPage}) => {
    await setIgnoreListPattern(devToolsPage, 'mycode');
    await inspectedPage.goToResource('sources/multi-files.html');
    await openSourcesPanel(devToolsPage);

    await typeIntoQuickOpen(devToolsPage, 'mult', undefined);
    const list = await readQuickOpenResults(devToolsPage);
    assert.deepEqual(list, ['multi-files-thirdparty.js', 'multi-files.html', 'multi-files-mycode.js']);
  });

  it('lists both deployed and authored file', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('sources/sourcemap-origin.html');
    await openSourcesPanel(devToolsPage);

    await typeIntoQuickOpen(devToolsPage, 'sourcemap-origin.clash.js', undefined);
    const list = await readQuickOpenResults(devToolsPage);
    assert.deepEqual(list, ['sourcemap-origin.clash.js', 'sourcemap-origin.clash.js']);
  });

  it('should not list network fetch requests (that are not overidden)', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('network/fetch-json.html');
    await typeIntoQuickOpen(devToolsPage, 'json', undefined);
    const list = await readQuickOpenResults(devToolsPage);
    assert.isFalse(list.includes('coffees.json'));
  });

  it('should not list network xhr requests (that are not overidden)', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('network/xhr-json.html');
    await typeIntoQuickOpen(devToolsPage, 'json', undefined);
    const list = await readQuickOpenResults(devToolsPage);
    assert.isFalse(list.includes('coffees.json'));
  });
});
