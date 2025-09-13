// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {openSoftContextMenuAndClickOnItem} from '../../e2e/helpers/context-menu-helpers.js';
import {
  openNetworkTab,
  selectRequestByName,
  setCacheDisabled,
  waitForSomeRequestsToAppear,
} from '../../e2e/helpers/network-helpers.js';
import {
  readQuickOpenResults,
  typeIntoQuickOpen,
} from '../../e2e/helpers/quick_open-helpers.js';
import {
  enableLocalOverrides,
  openSourcesPanel,
} from '../../e2e/helpers/sources-helpers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';
import type {InspectedPage} from '../shared/target-helper.js';

const OVERRIDES_FILESYSTEM_SELECTOR = '[aria-label="overrides, fs"]';

async function waitForOverrideContentMenuItemIsEnabled(requestName: string, devToolsPage: DevToolsPage) {
  await devToolsPage.waitForFunction(async () => {
    await selectRequestByName(requestName, {button: 'right', devToolsPage});
    const menuItem = await devToolsPage.waitForAria('Override content');
    const isDisabled = await devToolsPage.hasClass(menuItem, 'soft-context-menu-disabled');
    if (!isDisabled) {
      return true;
    }
    await devToolsPage.pressKey('Escape');
    return false;
  });
}

describe('Overrides panel', function() {
  it('can create multiple new files', async ({devToolsPage, inspectedPage}) => {
    await devToolsPage.setupOverridesFSMocks();
    await devToolsPage.useSoftMenu();
    await inspectedPage.goToResource('empty.html');

    await openSourcesPanel(devToolsPage);
    await enableLocalOverrides(devToolsPage);
    await openSoftContextMenuAndClickOnItem(OVERRIDES_FILESYSTEM_SELECTOR, 'New file', devToolsPage);
    await devToolsPage.waitFor('[aria-label="NewFile, file"]');
    await devToolsPage.typeText('foo\n');

    await openSoftContextMenuAndClickOnItem(OVERRIDES_FILESYSTEM_SELECTOR, 'New file', devToolsPage);
    await devToolsPage.waitFor('[aria-label="NewFile, file"]');
    await devToolsPage.typeText('bar\n');
    await devToolsPage.waitFor('[aria-label="bar, file"]');

    const treeItems = await devToolsPage.$$('.navigator-file-tree-item');
    const treeItemNames = await Promise.all(treeItems.map(x => x.evaluate(y => y.textContent)));
    assert.deepEqual(treeItemNames, ['bar', 'foo']);
  });

  it('can save fetch request for overrides via network panel', async ({devToolsPage, inspectedPage}) => {
    await devToolsPage.setupOverridesFSMocks();
    await devToolsPage.useSoftMenu();
    await inspectedPage.goToResource('network/fetch-json.html');
    await openSourcesPanel(devToolsPage);
    await enableLocalOverrides(devToolsPage);

    await openNetworkTab(devToolsPage);
    await waitForOverrideContentMenuItemIsEnabled('coffees.json', devToolsPage);
    await devToolsPage.click('aria/Override content');
    await devToolsPage.waitFor('[aria-label="coffees.json, file"]');

    const pageTree = await devToolsPage.waitForAria('Page');
    await pageTree.click();

    const treeItems = await devToolsPage.$$('.navigator-file-tree-item');
    const treeItemNames = (await Promise.all(treeItems.map(x => x.evaluate(y => y.textContent))));
    assert.isFalse(treeItemNames?.includes('coffees.json'));

    await typeIntoQuickOpen('coffees.json', undefined, devToolsPage);
    const list = await readQuickOpenResults(devToolsPage);
    assert.deepEqual(list, ['coffees.json']);
  });

  it('can save XHR request for overrides via network panel', async ({devToolsPage, inspectedPage}) => {
    await devToolsPage.setupOverridesFSMocks();
    await devToolsPage.useSoftMenu();
    await inspectedPage.goToResource('network/xhr-json.html');
    await openSourcesPanel(devToolsPage);
    await enableLocalOverrides(devToolsPage);

    await openNetworkTab(devToolsPage);
    await waitForOverrideContentMenuItemIsEnabled('coffees.json', devToolsPage);
    await devToolsPage.click('aria/Override content');
    await devToolsPage.waitFor('[aria-label="coffees.json, file"]');

    const pageTree = await devToolsPage.waitForAria('Page');
    await pageTree.click();

    const treeItems = await devToolsPage.$$('.navigator-file-tree-item');
    const treeItemNames = (await Promise.all(treeItems.map(x => x.evaluate(y => y.textContent))));
    assert.isFalse(treeItemNames?.includes('coffees.json'));

    await typeIntoQuickOpen('coffees.json', undefined, devToolsPage);
    const list = await readQuickOpenResults(devToolsPage);
    assert.deepEqual(list, ['coffees.json']);
  });

  it('can always override content via the Network panel', async ({devToolsPage, inspectedPage}) => {
    await devToolsPage.setupOverridesFSMocks();
    await devToolsPage.useSoftMenu();
    await inspectedPage.goToResource('network/fetch-json.html');
    await openNetworkTab(devToolsPage);
    await waitForOverrideContentMenuItemIsEnabled('coffees.json', devToolsPage);
    await devToolsPage.click('aria/Override content');

    // File permission pop up
    const infoBar = await devToolsPage.waitForAria('Select a folder to store override files in');
    // Allow time for infobar to animate in before clicking the button
    await new Promise<void>(resolve => setTimeout(resolve, 550));
    await devToolsPage.click('.infobar-main-row .infobar-button', {root: infoBar});

    // Open & close the file in the Sources panel
    let fileTab = await devToolsPage.waitFor('[aria-label="coffees.json, file"]');
    assert.isNotNull(fileTab);

    await devToolsPage.click('aria/Close coffees.json');

    await openNetworkTab(devToolsPage);
    await waitForOverrideContentMenuItemIsEnabled('coffees.json', devToolsPage);
    await devToolsPage.click('aria/Override content');

    // No file permission pop up
    let popups = await devToolsPage.$$('aria/Select a folder to store override files in', undefined, 'aria');
    assert.lengthOf(popups, 0);

    // Open & close the file in the Sources panel
    fileTab = await devToolsPage.waitFor('[aria-label="coffees.json, file"]');
    assert.isNotNull(fileTab);

    await devToolsPage.click('aria/Close coffees.json');

    // Disable Local overrides
    await devToolsPage.click('aria/Enable Local Overrides');

    // Navigate to files
    await openNetworkTab(devToolsPage);
    await waitForOverrideContentMenuItemIsEnabled('coffees.json', devToolsPage);
    await devToolsPage.click('aria/Override content');

    // No file permission pop up
    popups = await devToolsPage.$$('aria/Select a folder to store override files in', undefined, 'aria');
    assert.lengthOf(popups, 0);

    // Open & close the file in the Sources panel
    fileTab = await devToolsPage.waitFor('[aria-label="coffees.json, file"]');
    assert.isNotNull(fileTab);

    await devToolsPage.click('aria/Close coffees.json');
  });

  it('overrides indicator on the Network panel title', async ({devToolsPage, inspectedPage}) => {
    await devToolsPage.setupOverridesFSMocks();
    await devToolsPage.useSoftMenu();
    await inspectedPage.goToResource('network/fetch-json.html');

    await openNetworkTab(devToolsPage);
    let networkPanel = await devToolsPage.waitFor('.tabbed-pane-header-tab.selected');
    let icons = await networkPanel.$$('devtools-icon.warning');

    assert.lengthOf(icons, 0);

    // Set up & enable overrides
    await waitForOverrideContentMenuItemIsEnabled('coffees.json', devToolsPage);
    await devToolsPage.click('aria/Override content');

    // File permission pop up
    const infoBar = await devToolsPage.waitForAria('Select a folder to store override files in');
    // Allow time for infobar to animate in before clicking the button
    await new Promise<void>(resolve => setTimeout(resolve, 550));
    await devToolsPage.click('.infobar-main-row .infobar-button', {root: infoBar});
    await devToolsPage.waitFor('[aria-label="coffees.json, file"]');

    await openNetworkTab(devToolsPage);
    await setCacheDisabled(false, devToolsPage);
    networkPanel = await devToolsPage.waitFor('.tabbed-pane-header-tab.selected');
    icons = await networkPanel.$$('devtools-icon.warning');

    assert.lengthOf(icons, 1);
    assert.strictEqual(
        'Requests may be overridden locally, see the Sources panel', await icons[0].evaluate(icon => icon.title));

    await waitForOverrideContentMenuItemIsEnabled('coffees.json', devToolsPage);
    await devToolsPage.click('aria/Override content');
    await devToolsPage.click('aria/Clear configuration');

    await openNetworkTab(devToolsPage);
    await setCacheDisabled(false, devToolsPage);
    networkPanel = await devToolsPage.waitFor('.tabbed-pane-header-tab.selected');
    icons = await networkPanel.$$('devtools-icon.warning');

    assert.lengthOf(icons, 0);

    await devToolsPage.click('aria/Sources');
    await devToolsPage.click('aria/Select folder for overrides');
    await openSoftContextMenuAndClickOnItem(OVERRIDES_FILESYSTEM_SELECTOR, 'New file', devToolsPage);
    await devToolsPage.waitFor('[aria-label="NewFile, file"]');

    await openNetworkTab(devToolsPage);
    await setCacheDisabled(false, devToolsPage);
    networkPanel = await devToolsPage.waitFor('.tabbed-pane-header-tab.selected');
    icons = await networkPanel.$$('devtools-icon.warning');

    assert.lengthOf(icons, 1);
    assert.strictEqual(
        'Requests may be overridden locally, see the Sources panel', await icons[0].evaluate(icon => icon.title));
  });

  it('can show all overrides in the Sources panel', async ({devToolsPage, inspectedPage}) => {
    await devToolsPage.setupOverridesFSMocks();
    await devToolsPage.useSoftMenu();
    await inspectedPage.goToResource('network/fetch-json.html');

    await openNetworkTab(devToolsPage);
    await waitForOverrideContentMenuItemIsEnabled('coffees.json', devToolsPage);
    await devToolsPage.click('aria/Show all overrides');

    // In the Sources panel
    await devToolsPage.waitForAria('Select folder for overrides');

    let assertElements = await devToolsPage.$$('Select folder for overrides', undefined, 'aria');
    assert.lengthOf(assertElements, 2);

    // Set up & enable overrides in the Sources panel
    await devToolsPage.click('aria/Select folder for overrides');
    await openSoftContextMenuAndClickOnItem(OVERRIDES_FILESYSTEM_SELECTOR, 'New file', devToolsPage);

    await openNetworkTab(devToolsPage);
    await selectRequestByName('coffees.json', {button: 'right', devToolsPage});
    await devToolsPage.click('aria/Show all overrides');

    // In the Sources panel
    await devToolsPage.waitForAria('Enable Local Overrides');

    assertElements = await devToolsPage.$$('Enable Local Overrides', undefined, 'aria');
    assert.lengthOf(assertElements, 1);
  });

  it('has correct context menu for overrides files', async ({devToolsPage, inspectedPage}) => {
    await devToolsPage.setupOverridesFSMocks();
    await devToolsPage.useSoftMenu();
    await inspectedPage.goToResource('network/fetch-json.html');
    await openNetworkTab(devToolsPage);
    await waitForOverrideContentMenuItemIsEnabled('coffees.json', devToolsPage);
    await devToolsPage.click('aria/Override content');

    // File permission pop up
    const infoBar = await devToolsPage.waitForAria('Select a folder to store override files in');
    await new Promise<void>(resolve => setTimeout(resolve, 550));
    await devToolsPage.click('.infobar-main-row .infobar-button', {root: infoBar});

    // Open the file in the Sources panel
    const fileTab = await devToolsPage.waitFor('[aria-label="coffees.json, file"]');
    await fileTab.click({button: 'right'});

    const assertShowAllElements = await devToolsPage.$$('Show all overrides', undefined, 'aria');
    const assertAddFolderElements = await devToolsPage.$$('Add folder to workspace', undefined, 'aria');
    const assertOverrideContentElements = await devToolsPage.$$('Override content', undefined, 'aria');
    const assertOpenInElements = await devToolsPage.$$('Open in containing folder', undefined, 'aria');

    assert.lengthOf(assertShowAllElements, 0);
    assert.lengthOf(assertAddFolderElements, 0);
    assert.lengthOf(assertOverrideContentElements, 0);
    assert.lengthOf(assertOpenInElements, 1);
  });

  it('has correct context menu for main overrides folder', async ({devToolsPage, inspectedPage}) => {
    await devToolsPage.setupOverridesFSMocks();
    await devToolsPage.useSoftMenu();
    await inspectedPage.goToResource('network/fetch-json.html');
    await openNetworkTab(devToolsPage);
    await waitForOverrideContentMenuItemIsEnabled('coffees.json', devToolsPage);
    await devToolsPage.click('aria/Override content');

    // File permission pop up
    const infoBar = await devToolsPage.waitForAria('Select a folder to store override files in');
    // Allow time for infobar to animate in before clicking the button
    await new Promise<void>(resolve => setTimeout(resolve, 550));
    await devToolsPage.click('.infobar-main-row .infobar-button', {root: infoBar});

    // Open the main folder in the Sources panel
    await devToolsPage.waitFor('[aria-label="coffees.json, file"]');
    const folderTab = await devToolsPage.waitFor('.navigator-folder-tree-item');
    await folderTab.click({button: 'right'});

    const assertAddFolderElements = await devToolsPage.$$('Add folder to workspace', undefined, 'aria');
    const assertRemoveFolderElements = await devToolsPage.$$('Remove folder from workspace', undefined, 'aria');
    const assertDeleteElements = await devToolsPage.$$('Delete', undefined, 'aria');

    assert.lengthOf(assertAddFolderElements, 0);
    assert.lengthOf(assertRemoveFolderElements, 0);
    assert.lengthOf(assertDeleteElements, 0);
  });

  it('has correct context menu for sub overrides folder', async ({devToolsPage, inspectedPage}) => {
    await devToolsPage.setupOverridesFSMocks();
    await devToolsPage.useSoftMenu();
    await inspectedPage.goToResource('network/fetch-json.html');
    await openNetworkTab(devToolsPage);
    await waitForOverrideContentMenuItemIsEnabled('coffees.json', devToolsPage);
    await devToolsPage.click('aria/Override content');

    // File permission pop up
    const infoBar = await devToolsPage.waitForAria('Select a folder to store override files in');
    // Allow time for infobar to animate in before clicking the button
    await new Promise<void>(resolve => setTimeout(resolve, 550));
    await devToolsPage.click('.infobar-main-row .infobar-button', {root: infoBar});

    // Open the sub folder in the Sources panel
    await devToolsPage.waitFor('[aria-label="coffees.json, file"]');
    const subfolderTab = await devToolsPage.waitFor('[role="group"] > .navigator-folder-tree-item');
    await subfolderTab.click({button: 'right'});

    const assertAddFolderElements = await devToolsPage.$$('Add folder to workspace', undefined, 'aria');
    const assertRemoveFolderElements = await devToolsPage.$$('Remove folder from workspace', undefined, 'aria');
    const assertDeleteElements = await devToolsPage.$$('Delete', undefined, 'aria');

    assert.lengthOf(assertAddFolderElements, 0);
    assert.lengthOf(assertRemoveFolderElements, 0);
    assert.lengthOf(assertDeleteElements, 1);
  });

  it('show redirect dialog when override content of source mapped js file', async ({devToolsPage, inspectedPage}) => {
    await devToolsPage.setupOverridesFSMocks();
    await devToolsPage.useSoftMenu();
    await inspectedPage.goToResource('sources/sourcemap-origin.html');
    await openSourcesPanel(devToolsPage);
    await enableLocalOverrides(devToolsPage);

    await openNetworkTab(devToolsPage);
    await waitForSomeRequestsToAppear(4, devToolsPage);
    await waitForOverrideContentMenuItemIsEnabled('sourcemap-origin.min.js', devToolsPage);
    await devToolsPage.click('aria/Open in Sources panel');

    // Actual file > Has override content
    const file = await devToolsPage.waitFor('[aria-label="sourcemap-origin.min.js"]');
    await file.click({button: 'right'});
    await devToolsPage.click('aria/Close');

    // Source mapped file > Show redirect confirmation dialog
    const mappedfile = await devToolsPage.waitFor('[aria-label="sourcemap-origin.js, file"]');
    await mappedfile.click({button: 'right'});
    await devToolsPage.click('aria/Override content');
    const p = await devToolsPage.waitFor('.dimmed-pane');
    const dialog = await p.waitForSelector('>>>> [role="dialog"]');
    const okButton = await dialog?.waitForSelector('>>> devtools-button');
    const okButtonTextContent = await okButton?.evaluate(e => e.textContent);
    assert.deepEqual(okButtonTextContent, 'OK');
    await okButton?.click();
    await devToolsPage.waitFor('[aria-label="Close sourcemap-origin.min.js"]');
  });

  it('show redirect dialog when override content of source mapped css file', async ({devToolsPage, inspectedPage}) => {
    await devToolsPage.setupOverridesFSMocks();
    await devToolsPage.useSoftMenu();
    await inspectedPage.goToResource('sources/sourcemap-origin.html');
    await openSourcesPanel(devToolsPage);
    await enableLocalOverrides(devToolsPage);

    await openNetworkTab(devToolsPage);
    await waitForSomeRequestsToAppear(4, devToolsPage);
    await waitForOverrideContentMenuItemIsEnabled('sourcemap-origin.css', devToolsPage);
    await devToolsPage.click('aria/Open in Sources panel');

    // Actual file > Has override content
    const file = await devToolsPage.waitFor('[aria-label="sourcemap-origin.css"]');
    await file.click({button: 'right'});
    await devToolsPage.click('aria/Close');

    // Source mapped file > Show redirect confirmation dialog
    const mappedfile = await devToolsPage.waitFor('[aria-label="sourcemap-origin.scss, file"]');
    await mappedfile.click({button: 'right'});
    await devToolsPage.click('aria/Override content');
    const p = await devToolsPage.waitFor('.dimmed-pane');
    const dialog = await p.waitForSelector('>>>> [role="dialog"]');
    const okButton = await dialog?.waitForSelector('>>> devtools-button');
    const okButtonTextContent = await okButton?.evaluate(e => e.textContent);
    assert.deepEqual(okButtonTextContent, 'OK');
    await okButton?.click();
    await devToolsPage.waitFor('[aria-label="Close sourcemap-origin.css"]');
  });
});

describe('Overrides panel', () => {
  it('appends correct overrides context menu for Sources > Page file', async ({devToolsPage, inspectedPage}) => {
    await devToolsPage.setupOverridesFSMocks();
    await devToolsPage.useSoftMenu();
    await inspectedPage.goToResource('elements/elements-panel-styles.html');
    await openNetworkTab(devToolsPage);
    await waitForSomeRequestsToAppear(2, devToolsPage);
    await waitForOverrideContentMenuItemIsEnabled('elements-panel-styles.css', devToolsPage);
    await devToolsPage.click('aria/Open in Sources panel');

    // Open the file in the Sources panel
    const file = await devToolsPage.waitFor('[aria-label="elements-panel-styles.css, file"]');
    await file.click({button: 'right'});

    const assertShowAllElements = await devToolsPage.$$('Show all overrides', undefined, 'aria');
    const assertOverridesContentElements = await devToolsPage.$$('Override content', undefined, 'aria');

    assert.lengthOf(assertShowAllElements, 0);
    assert.lengthOf(assertOverridesContentElements, 1);
  });
});

describe('Network panel', () => {
  it('context menu "override" items are disabled for forbidden URLs', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goTo('chrome://terms');
    await openNetworkTab(devToolsPage);
    await selectRequestByName('terms', {button: 'right', devToolsPage});

    const menuItem1 = await devToolsPage.waitForAria('Override content');
    const isDisabled1 = await menuItem1.evaluate(el => el.classList.contains('soft-context-menu-disabled'));
    assert.isTrue(isDisabled1, '"Override content" menu item is enabled');

    const menuItem2 = await devToolsPage.waitForAria('Override headers');
    const isDisabled2 = await menuItem2.evaluate(el => el.classList.contains('soft-context-menu-disabled'));
    assert.isTrue(isDisabled2, '"Override headers" menu item is enabled');
  });
});

describe('Overrides panel > Delete context menus', () => {
  async function prepare(devToolsPage: DevToolsPage, inspectedPage: InspectedPage) {
    // set up 3 overriden files - .header, json, custom js
    await inspectedPage.goToResource('network/fetch-json.html');
    await openSourcesPanel(devToolsPage);
    await enableLocalOverrides(devToolsPage);

    await openNetworkTab(devToolsPage);
    await waitForOverrideContentMenuItemIsEnabled('coffees.json', devToolsPage);
    await devToolsPage.click('aria/Override content');

    const subfolderTab = await devToolsPage.waitFor('[role="group"] > .navigator-folder-tree-item');
    await subfolderTab.click({button: 'right'});
    await devToolsPage.click('aria/New file');
    await devToolsPage.waitFor('[aria-label="NewFile, file"]');
    await devToolsPage.typeText('foo.js\n');

    await openNetworkTab(devToolsPage);
    await selectRequestByName('coffees.json', {button: 'right', devToolsPage});
    await devToolsPage.click('aria/Override headers');
    await devToolsPage.waitFor('[title="Reveal header override definitions"]');
  }

  it('delete all files from sub folder', async ({devToolsPage, inspectedPage}) => {
    await devToolsPage.setupOverridesFSMocks();
    await devToolsPage.useSoftMenu();
    await prepare(devToolsPage, inspectedPage);
    await selectRequestByName('coffees.json', {button: 'right', devToolsPage});
    await devToolsPage.click('aria/Show all overrides');

    await devToolsPage.waitFor('[aria-label=".headers, file"]');
    await devToolsPage.waitFor('[aria-label="coffees.json, file"]');
    await devToolsPage.waitFor('[aria-label="foo.js, file"]');

    const subfolderTab = await devToolsPage.waitFor('[role="group"] > .navigator-folder-tree-item');
    await subfolderTab.click({button: 'right'});

    await devToolsPage.click('aria/Delete');
    await devToolsPage.waitFor('[role="dialog"]');
    await devToolsPage.click('aria/OK');
    await devToolsPage.waitForNone('[role="dialog"]');

    const treeItems = await devToolsPage.$$('.navigator-file-tree-item');
    assert.lengthOf(treeItems, 0);
  });
});
