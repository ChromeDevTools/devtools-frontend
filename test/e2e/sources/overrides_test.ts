// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  $$,
  click,
  enableExperiment,
  goToResource,
  step,
  typeText,
  waitFor,
  waitForAria,
  waitForNone,
} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {
  openNetworkTab,
  selectRequestByName,
  waitForSomeRequestsToAppear,
} from '../helpers/network-helpers.js';
import {
  readQuickOpenResults,
  typeIntoQuickOpen,
} from '../helpers/quick_open-helpers.js';
import {
  clickOnContextMenu,
  ENABLE_OVERRIDES_SELECTOR,
  enableLocalOverrides,
  openSourcesPanel,
} from '../helpers/sources-helpers.js';

const OVERRIDES_FILESYSTEM_SELECTOR = '[aria-label="overrides, fs"]';

describe('Overrides panel', async function() {
  afterEach(async () => {
    await openSourcesPanel();
    await click('[aria-label="Overrides"]');
    await click('[aria-label="Clear configuration"]');
    await waitFor(ENABLE_OVERRIDES_SELECTOR);
  });

  it('can create multiple new files', async () => {
    await goToResource('empty.html');
    await openSourcesPanel();
    await enableLocalOverrides();
    await clickOnContextMenu(OVERRIDES_FILESYSTEM_SELECTOR, 'New file');
    await waitFor('[aria-label="NewFile, file"]');
    await typeText('foo\n');

    await clickOnContextMenu(OVERRIDES_FILESYSTEM_SELECTOR, 'New file');
    await waitFor('[aria-label="NewFile, file"]');
    await typeText('bar\n');
    await waitFor('[aria-label="bar, file"]');

    const treeItems = await $$('.navigator-file-tree-item');
    const treeItemNames = await Promise.all(treeItems.map(x => x.evaluate(y => y.textContent)));
    assert.deepEqual(treeItemNames, ['bar', 'foo']);
  });

  it('can save fetch request for overrides via network panel', async () => {
    await step('enable overrides', async () => {
      await goToResource('network/fetch-json.html');
      await openSourcesPanel();
      await enableLocalOverrides();
    });

    await step('can create content overrides via request\'s context menu', async () => {
      await openNetworkTab();
      await selectRequestByName('coffees.json', {button: 'right'});
      await click('aria/Override content');
      await waitFor('[aria-label="coffees.json, file"]');
    });

    await step('should not show fetch request in the Sources > Page Tree', async () => {
      const pageTree = await waitForAria('Page');
      await pageTree.click();

      const treeItems = await $$('.navigator-file-tree-item');
      const treeItemNames = (await Promise.all(treeItems.map(x => x.evaluate(y => y.textContent))));
      assert.isFalse(treeItemNames?.includes('coffees.json'));
    });

    await step('should show overidden fetch request in Quick Open', async () => {
      await typeIntoQuickOpen('coffees.json');
      const list = await readQuickOpenResults();
      assert.deepEqual(list, ['coffees.json']);
    });
  });

  it('can save XHR request for overrides via network panel', async () => {
    await step('enable overrides', async () => {
      await goToResource('network/xhr-json.html');
      await openSourcesPanel();
      await enableLocalOverrides();
    });

    await step('can create content overrides via request\'s context menu', async () => {
      await openNetworkTab();
      await selectRequestByName('coffees.json', {button: 'right'});
      await click('aria/Override content');
      await waitFor('[aria-label="coffees.json, file"]');
    });

    await step('should not show xhr request in the Sources > Page Tree', async () => {
      const pageTree = await waitForAria('Page');
      await pageTree.click();

      const treeItems = await $$('.navigator-file-tree-item');
      const treeItemNames = (await Promise.all(treeItems.map(x => x.evaluate(y => y.textContent))));
      assert.isFalse(treeItemNames?.includes('coffees.json'));
    });

    await step('should show overidden xhr request in Quick Open', async () => {
      await typeIntoQuickOpen('coffees.json');
      const list = await readQuickOpenResults();
      assert.deepEqual(list, ['coffees.json']);
    });
  });

  it('can always override content via the Network panel', async () => {
    await step('can override without local overrides folder set up', async () => {
      await goToResource('network/fetch-json.html');
      await openNetworkTab();
      await selectRequestByName('coffees.json', {button: 'right'});
      await click('aria/Override content');

      // File permission pop up
      const infoBar = await waitForAria('Select a folder to store override files in.');
      await click('.infobar-main-row .infobar-button', {root: infoBar});

      // Open & close the file in the Sources panel
      const fileTab = await waitFor('[aria-label="coffees.json, file"]');
      assert.isNotNull(fileTab);

      await click('aria/Close coffees.json');
    });

    await step('can open the overridden file in the Sources panel if it exists', async () => {
      await openNetworkTab();
      await selectRequestByName('coffees.json', {button: 'right'});
      await click('aria/Override content');

      // No file permission pop up
      const popups = await $$('aria/Select a folder to store override files in.', undefined, 'aria');
      assert.strictEqual(popups.length, 0);

      // Open & close the file in the Sources panel
      const fileTab = await waitFor('[aria-label="coffees.json, file"]');
      assert.isNotNull(fileTab);

      await click('aria/Close coffees.json');
    });

    await step('can enable the local overrides setting and override content', async () => {
      // Disable Local overrides
      await click('aria/Enable Local Overrides');

      // Navigate to files
      await openNetworkTab();
      await selectRequestByName('coffees.json', {button: 'right'});
      await click('aria/Override content');

      // No file permission pop up
      const popups = await $$('aria/Select a folder to store override files in.', undefined, 'aria');
      assert.strictEqual(popups.length, 0);

      // Open & close the file in the Sources panel
      const fileTab = await waitFor('[aria-label="coffees.json, file"]');
      assert.isNotNull(fileTab);

      await click('aria/Close coffees.json');
    });
  });

  it('overrides indicator on the Network panel title', async () => {
    await step('no indicator when overrides setting is disabled', async () => {
      await goToResource('network/fetch-json.html');

      await openNetworkTab();
      const networkPanel = await waitFor('.tabbed-pane-header-tab.selected');
      const icons = await networkPanel.$$('.tabbed-pane-header-tab-icon');

      assert.strictEqual(icons.length, 0);
    });

    await step('shows indicator when overrides setting is enabled', async () => {
      // Set up & enable overrides
      await selectRequestByName('coffees.json', {button: 'right'});
      await click('aria/Override content');

      // File permission pop up
      const infoBar = await waitForAria('Select a folder to store override files in.');
      await click('.infobar-main-row .infobar-button', {root: infoBar});
      await waitFor('[aria-label="coffees.json, file"]');

      await openNetworkTab();
      const networkPanel = await waitFor('.tabbed-pane-header-tab.selected');
      const icons = await networkPanel.$$('.tabbed-pane-header-tab-icon');
      const iconTitleElement = await icons[0].$('aria/Requests may be rewritten by local overrides');

      assert.strictEqual(icons.length, 1);
      assert.isDefined(iconTitleElement);
    });

    await step('no indicator after clearing overrides configuration', async () => {
      await selectRequestByName('coffees.json', {button: 'right'});
      await click('aria/Override content');
      await click('aria/Clear configuration');

      await openNetworkTab();
      const networkPanel = await waitFor('.tabbed-pane-header-tab.selected');
      const icons = await networkPanel.$$('.tabbed-pane-header-tab-icon');

      assert.strictEqual(icons.length, 0);
    });

    await step('shows indicator after enabling override in Overrides tab', async () => {
      await click('aria/Sources');
      await click('aria/Select folder for overrides');
      await clickOnContextMenu(OVERRIDES_FILESYSTEM_SELECTOR, 'New file');
      await waitFor('[aria-label="NewFile, file"]');

      await openNetworkTab();
      const networkPanel = await waitFor('.tabbed-pane-header-tab.selected');
      const icons = await networkPanel.$$('.tabbed-pane-header-tab-icon');
      const iconTitleElement = await icons[0].$('aria/Requests may be rewritten by local overrides');

      assert.strictEqual(icons.length, 1);
      assert.isDefined(iconTitleElement);
    });
  });

  it('can show all overrides in the Sources panel', async () => {
    await step('when overrides setting is disabled', async () => {
      await goToResource('network/fetch-json.html');

      await openNetworkTab();
      await selectRequestByName('coffees.json', {button: 'right'});
      await click('aria/Show all overrides');

      // In the Sources panel
      await waitForAria('Select folder for overrides');

      const assertElements = await $$('Select folder for overrides', undefined, 'aria');
      assert.strictEqual(assertElements.length, 1);
    });

    await step('when overrides setting is enabled', async () => {
      // Set up & enable overrides in the Sources panel
      await click('aria/Select folder for overrides');
      await clickOnContextMenu(OVERRIDES_FILESYSTEM_SELECTOR, 'New file');

      await openNetworkTab();
      await selectRequestByName('coffees.json', {button: 'right'});
      await click('aria/Show all overrides');

      // In the Sources panel
      await waitForAria('Enable Local Overrides');

      const assertElements = await $$('Enable Local Overrides', undefined, 'aria');
      assert.strictEqual(assertElements.length, 1);
    });
  });

  it('has correct context menu for overrides files', async () => {
    await goToResource('network/fetch-json.html');
    await openNetworkTab();
    await selectRequestByName('coffees.json', {button: 'right'});
    await click('aria/Override content');

    // File permission pop up
    const infoBar = await waitForAria('Select a folder to store override files in.');
    await click('.infobar-main-row .infobar-button', {root: infoBar});

    // Open the file in the Sources panel
    const fileTab = await waitFor('[aria-label="coffees.json, file"]');
    await fileTab.click({button: 'right'});

    const assertShowAllElements = await $$('Show all overrides', undefined, 'aria');
    const assertAddFolderElements = await $$('Add folder to workspace', undefined, 'aria');
    const assertOverrideContentElements = await $$('Override content', undefined, 'aria');
    const assertOpenInElements = await $$('Open in containing folder', undefined, 'aria');

    assert.strictEqual(assertShowAllElements.length, 0);
    assert.strictEqual(assertAddFolderElements.length, 0);
    assert.strictEqual(assertOverrideContentElements.length, 0);
    assert.strictEqual(assertOpenInElements.length, 1);
  });

  it('has correct context menu for main overrides folder', async () => {
    await goToResource('network/fetch-json.html');
    await openNetworkTab();
    await selectRequestByName('coffees.json', {button: 'right'});
    await click('aria/Override content');

    // File permission pop up
    const infoBar = await waitForAria('Select a folder to store override files in.');
    await click('.infobar-main-row .infobar-button', {root: infoBar});

    // Open the main folder in the Sources panel
    await waitFor('[aria-label="coffees.json, file"]');
    const folderTab = await waitFor('.navigator-folder-tree-item');
    await folderTab.click({button: 'right'});

    const assertAddFolderElements = await $$('Add folder to workspace', undefined, 'aria');
    const assertRemoveFolderElements = await $$('Remove folder from workspace', undefined, 'aria');
    const assertDeleteElements = await $$('Delete', undefined, 'aria');

    assert.strictEqual(assertAddFolderElements.length, 0);
    assert.strictEqual(assertRemoveFolderElements.length, 0);
    assert.strictEqual(assertDeleteElements.length, 0);
  });

  it('has correct context menu for sub overrides folder', async () => {
    await goToResource('network/fetch-json.html');
    await openNetworkTab();
    await selectRequestByName('coffees.json', {button: 'right'});
    await click('aria/Override content');

    // File permission pop up
    const infoBar = await waitForAria('Select a folder to store override files in.');
    await click('.infobar-main-row .infobar-button', {root: infoBar});

    // Open the sub folder in the Sources panel
    await waitFor('[aria-label="coffees.json, file"]');
    const subfolderTab = await waitFor('[role="group"] > .navigator-folder-tree-item');
    await subfolderTab.click({button: 'right'});

    const assertAddFolderElements = await $$('Add folder to workspace', undefined, 'aria');
    const assertRemoveFolderElements = await $$('Remove folder from workspace', undefined, 'aria');
    const assertDeleteElements = await $$('Delete', undefined, 'aria');

    assert.strictEqual(assertAddFolderElements.length, 0);
    assert.strictEqual(assertRemoveFolderElements.length, 0);
    assert.strictEqual(assertDeleteElements.length, 1);
  });

  it('show redirect dialog when override content of source mapped js file', async () => {
    await goToResource('sources/sourcemap-origin.html');
    await openSourcesPanel();
    await enableLocalOverrides();

    await openNetworkTab();
    await waitForSomeRequestsToAppear(4);
    await selectRequestByName('sourcemap-origin.min.js', {button: 'right'});
    await click('aria/Open in Sources panel');

    // Actual file > Has override content
    const file = await waitFor('[aria-label="sourcemap-origin.min.js"]');
    await file.click({button: 'right'});
    await click('aria/Close');

    // Source mapped file > Show redirect confirmation dialog
    const mappedfile = await waitFor('[aria-label="sourcemap-origin.js, file"]');
    await mappedfile.click({button: 'right'});
    await click('aria/Override content');
    const p = await waitFor('.dimmed-pane');
    const dialog = await p.waitForSelector('>>>> [role="dialog"]');
    const okButton = await dialog?.waitForSelector('>>> .primary-button');
    await okButton?.click();
    await waitFor('[aria-label="Close sourcemap-origin.min.js"]');
  });

  it('show redirect dialog when override content of source mapped css file', async () => {
    await goToResource('sources/sourcemap-origin.html');
    await openSourcesPanel();
    await enableLocalOverrides();

    await openNetworkTab();
    await waitForSomeRequestsToAppear(4);
    await selectRequestByName('sourcemap-origin.css', {button: 'right'});
    await click('aria/Open in Sources panel');

    // // Actual file > Has override content
    const file = await waitFor('[aria-label="sourcemap-origin.css"]');
    await file.click({button: 'right'});
    await click('aria/Close');

    // // Source mapped file > Show redirect confirmation dialog
    const mappedfile = await waitFor('[aria-label="sourcemap-origin.scss, file"]');
    await mappedfile.click({button: 'right'});
    await click('aria/Override content');
    const p = await waitFor('.dimmed-pane');
    const dialog = await p.waitForSelector('>>>> [role="dialog"]');
    const okButton = await dialog?.waitForSelector('>>> .primary-button');
    await okButton?.click();
    await waitFor('[aria-label="Close sourcemap-origin.css"]');
  });
});

describe('Overrides panel', () => {
  it('appends correct overrides context menu for Sources > Page file', async () => {
    await goToResource('elements/elements-panel-styles.html');
    await openNetworkTab();
    await waitForSomeRequestsToAppear(2);
    await selectRequestByName('elements-panel-styles.css', {button: 'right'});
    await click('aria/Open in Sources panel');

    // Open the file in the Sources panel
    const file = await waitFor('[aria-label="elements-panel-styles.css, file"]');
    await file.click({button: 'right'});

    const assertShowAllElements = await $$('Show all overrides', undefined, 'aria');
    const assertOverridesContentElements = await $$('Override content', undefined, 'aria');

    assert.strictEqual(assertShowAllElements.length, 0);
    assert.strictEqual(assertOverridesContentElements.length, 1);
  });
});

describe('Overrides panel > Delete context menus', () => {
  beforeEach(async () => {
    // set up 3 overriden files - .header, json, custom js
    await enableExperiment('headerOverrides');
    await goToResource('network/fetch-json.html');
    await openSourcesPanel();
    await enableLocalOverrides();

    await step('add a content override file', async () => {
      await openNetworkTab();
      await selectRequestByName('coffees.json', {button: 'right'});
      await click('aria/Override content');
    });

    await step('add a custom override file', async () => {
      const subfolderTab = await waitFor('[role="group"] > .navigator-folder-tree-item');
      await subfolderTab.click({button: 'right'});
      await click('aria/New file');
      await waitFor('[aria-label="NewFile, file"]');
      await typeText('foo.js\n');
    });

    await step('add a header override file', async () => {
      await openNetworkTab();
      await selectRequestByName('coffees.json', {button: 'right'});
      await click('aria/Override headers');
      await waitFor('[title="Reveal header override definitions"]');
    });
  });

  afterEach(async () => {
    await click('[aria-label="Clear configuration"]');
    await waitFor(ENABLE_OVERRIDES_SELECTOR);
  });

  it('delete all files from sub folder', async () => {
    await step('files exist in Sources panel', async () => {
      await selectRequestByName('coffees.json', {button: 'right'});
      await click('aria/Show all overrides');

      await waitFor('[aria-label=".headers, file"]');
      await waitFor('[aria-label="coffees.json, file"]');
      await waitFor('[aria-label="foo.js, file"]');
    });

    await step('delete all files', async () => {
      const subfolderTab = await waitFor('[role="group"] > .navigator-folder-tree-item');
      await subfolderTab.click({button: 'right'});

      await click('aria/Delete');
      await waitFor('[role="dialog"]');
      await click('aria/OK');
      await waitForNone('[role="dialog"]');

      const treeItems = await $$('.navigator-file-tree-item');
      assert.strictEqual(treeItems.length, 0);
    });
  });
});
