// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {openSoftContextMenuAndClickOnItem} from '../../e2e/helpers/context-menu-helpers.js';
import {
  clickInfobarButton,
  getTextFromHeadersRow,
  navigateToNetworkTab,
  selectRequestByName,
  waitForSomeRequestsToAppear,
} from '../../e2e/helpers/network-helpers.js';
import {
  enableLocalOverrides,
  openOverridesSubPane,
  openSourcesPanel,
} from '../../e2e/helpers/sources-helpers.js';
import type {DevToolsPage} from '../../e2e_non_hosted/shared/frontend-helper.js';

const ENABLE_OVERRIDES_SELECTOR = '[aria-label="Select folder for overrides"]';
const OVERRIDES_FILESYSTEM_SELECTOR = '[aria-label="overrides, fs"]';
const FILE_TREE_HEADERS_FILE_SELECTOR = '[aria-label=".headers, file"] .tree-element-title';
const NETWORK_VIEW_SELECTOR = '.network-item-view';
const HEADERS_TAB_SELECTOR = '[aria-label=Headers][role="tab"]';
const ACTIVE_HEADERS_TAB_SELECTOR = '[aria-label=Headers][role=tab][aria-selected=true]';
const RESPONSE_HEADERS_SELECTOR = '[aria-label="Response Headers"]';
const HEADER_ROW_SELECTOR = '.row';

async function createHeaderOverride(devToolsPage: DevToolsPage) {
  await openSoftContextMenuAndClickOnItem(OVERRIDES_FILESYSTEM_SELECTOR, 'New file', devToolsPage);
  await devToolsPage.waitFor('.being-edited');
  await devToolsPage.typeText('.headers\n');
  await devToolsPage.click('.add-block');
  await devToolsPage.waitFor('.editable.apply-to');
  await devToolsPage.typeText('*.html\n');
  await devToolsPage.typeText('aaa\n');
  await devToolsPage.typeText('bbb');
  const title = await devToolsPage.waitFor(FILE_TREE_HEADERS_FILE_SELECTOR);
  let labelText = await title?.evaluate(el => el.textContent);
  assert.strictEqual(labelText, '*.headers');
  await devToolsPage.page.keyboard.press('Tab');
  await devToolsPage.waitForFunction(async () => {
    labelText = await title?.evaluate(el => el.textContent);
    return labelText === '.headers';
  });
}

async function openHeadersTab(devToolsPage: DevToolsPage) {
  const networkView = await devToolsPage.waitFor(NETWORK_VIEW_SELECTOR);
  await devToolsPage.click(HEADERS_TAB_SELECTOR, {
    root: networkView,
  });
  await devToolsPage.waitFor(ACTIVE_HEADERS_TAB_SELECTOR, networkView);
}

async function editorTabHasPurpleDot(devToolsPage: DevToolsPage): Promise<boolean> {
  const tabHeaderIcon = await devToolsPage.waitFor('[aria-label=".headers"] devtools-icon');
  return await tabHeaderIcon?.evaluate(node => node.classList.contains('dot') && node.classList.contains('purple'));
}

async function fileTreeEntryIsSelectedAndHasPurpleDot(devToolsPage: DevToolsPage): Promise<boolean> {
  const element = await devToolsPage.activeElement();
  const title = await element.evaluate(e => e.getAttribute('title')) || '';
  assert.match(title, /\/test\/e2e\/resources\/network\/\.headers$/);
  const fileTreeIcon = await element.waitForSelector(
      '.navigator-file-tree-item .leading-icons devtools-file-source-icon >>> devtools-icon');
  if (!fileTreeIcon) {
    return false;
  }
  return await fileTreeIcon.evaluate(node => node.classList.contains('dot') && node.classList.contains('purple'));
}

async function editHeaderItem(devToolsPage: DevToolsPage, newValue: string, previousValue: string): Promise<void> {
  let focusedTextContent = await devToolsPage.activeElementTextContent();
  assert.strictEqual(focusedTextContent, previousValue);
  const element = await devToolsPage.activeElement();
  await element.evaluate((e, value) => {
    e.textContent = value;
  }, newValue);
  focusedTextContent = await devToolsPage.activeElementTextContent();
  assert.strictEqual(focusedTextContent, newValue);
  await devToolsPage.page.keyboard.press('Tab');
}

async function cleanup(devToolsPage: DevToolsPage) {
  await openSourcesPanel(devToolsPage);
  await openOverridesSubPane(devToolsPage);
  await devToolsPage.click('[aria-label="Clear configuration"]');
  await devToolsPage.waitFor(ENABLE_OVERRIDES_SELECTOR);
}

describe('The Overrides Panel', function() {
  it('can create header overrides', async ({devToolsPage, inspectedPage}) => {
    await devToolsPage.setupOverridesFSMocks();
    await devToolsPage.useSoftMenu();
    await inspectedPage.goToResource('empty.html');
    await openSourcesPanel(devToolsPage);
    await enableLocalOverrides(devToolsPage);
    await createHeaderOverride(devToolsPage);

    await devToolsPage.click('#tab-network');
    await devToolsPage.waitFor('.network-log-grid');
    await inspectedPage.goToResource('network/hello.html');

    await waitForSomeRequestsToAppear(1, devToolsPage);
    await selectRequestByName('hello.html', {devToolsPage});
    await openHeadersTab(devToolsPage);

    const responseHeaderSection = await devToolsPage.waitFor(RESPONSE_HEADERS_SELECTOR);
    const row = await devToolsPage.waitFor(HEADER_ROW_SELECTOR, responseHeaderSection);
    assert.isOk(row);
    assert.deepEqual(await getTextFromHeadersRow(row, devToolsPage), ['aaa', 'bbb']);
    await cleanup(devToolsPage);
  });

  it('can override headers via network panel', async ({devToolsPage, inspectedPage}) => {
    await devToolsPage.setupOverridesFSMocks();
    await devToolsPage.useSoftMenu();
    await devToolsPage.page.emulateMediaFeatures([
      {name: 'prefers-reduced-motion', value: 'reduce'},
    ]);

    await navigateToNetworkTab('hello.html', devToolsPage, inspectedPage);
    await waitForSomeRequestsToAppear(1, devToolsPage);
    await selectRequestByName('hello.html', {devToolsPage});
    await openHeadersTab(devToolsPage);

    await devToolsPage.click('.enable-editing');
    await clickInfobarButton(devToolsPage);
    await devToolsPage.waitFor('.add-header-button');
    await devToolsPage.click('.add-header-button');

    await devToolsPage.waitFor('.row.header-overridden.header-editable');
    await devToolsPage.click('.header-name devtools-editable-span');
    await editHeaderItem(devToolsPage, 'foo', 'header-name');
    await editHeaderItem(devToolsPage, 'bar', 'header value');

    await devToolsPage.waitFor('[title="Refresh the page/request for these changes to take effect"]');
    await devToolsPage.click('[title="Reveal header override definitions"]');
    assert.isTrue(await editorTabHasPurpleDot(devToolsPage));
    assert.isTrue(await fileTreeEntryIsSelectedAndHasPurpleDot(devToolsPage));

    await navigateToNetworkTab('hello.html', devToolsPage, inspectedPage);
    await waitForSomeRequestsToAppear(1, devToolsPage);
    await selectRequestByName('hello.html', {devToolsPage});
    await openHeadersTab(devToolsPage);

    const responseHeaderSection = await devToolsPage.waitFor(RESPONSE_HEADERS_SELECTOR);
    const row = await devToolsPage.waitFor('.row.header-overridden.header-editable', responseHeaderSection);
    assert.isOk(row);
    assert.deepEqual(await getTextFromHeadersRow(row, devToolsPage), ['foo', 'bar']);
    await devToolsPage.click('[title="Reveal header override definitions"]');
    assert.isTrue(await editorTabHasPurpleDot(devToolsPage));
    assert.isTrue(await fileTreeEntryIsSelectedAndHasPurpleDot(devToolsPage));

    await inspectedPage.goToResource('pages/hello-world.html');
    await devToolsPage.waitForFunction(async () => {
      return (await editorTabHasPurpleDot(devToolsPage)) === false &&
          (await fileTreeEntryIsSelectedAndHasPurpleDot(devToolsPage)) === false;
    });
    await cleanup(devToolsPage);
  });
});
