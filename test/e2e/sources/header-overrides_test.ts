// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  activeElement,
  activeElementTextContent,
  click,
  enableExperiment,
  goToResource,
  pasteText,
  pressKey,
  typeText,
  waitFor,
  waitForFunction,
} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {
  getTextFromHeadersRow,
  navigateToNetworkTab,
  selectRequestByName,
  waitForSomeRequestsToAppear,
} from '../helpers/network-helpers.js';
import {
  clickOnContextMenu,
  enableLocalOverrides,
  openOverridesSubPane,
  openSourcesPanel,
} from '../helpers/sources-helpers.js';

const ENABLE_OVERRIDES_SELECTOR = '[aria-label="Select folder for overrides"]';
const OVERRIDES_FILESYSTEM_SELECTOR = '[aria-label="overrides, fs"]';
const FILE_TREE_HEADERS_FILE_SELECTOR = '[aria-label=".headers, file"] .tree-element-title';
const NETWORK_VIEW_SELECTOR = '.network-item-view';
const HEADERS_TAB_SELECTOR = '[aria-label=Headers][role="tab"]';
const ACTIVE_HEADERS_TAB_SELECTOR = '[aria-label=Headers][role=tab][aria-selected=true]';
const RESPONSE_HEADERS_SELECTOR = '[aria-label="Response Headers"]';
const HEADER_ROW_SELECTOR = '.row';

async function createHeaderOverride() {
  await clickOnContextMenu(OVERRIDES_FILESYSTEM_SELECTOR, 'New file');
  await waitFor('.being-edited');
  await typeText('.headers\n');
  await click('.add-block');
  await waitFor('.editable.apply-to');
  await typeText('*.html\n');
  await typeText('aaa\n');
  await typeText('bbb');
  const title = await waitFor(FILE_TREE_HEADERS_FILE_SELECTOR);
  let labelText = await title?.evaluate(el => el.textContent);
  assert.strictEqual(labelText, '*.headers');
  await pressKey('s', {control: true});
  await waitForFunction(async () => {
    labelText = await title?.evaluate(el => el.textContent);
    return labelText === '.headers';
  });
}

async function openHeadersTab() {
  const networkView = await waitFor(NETWORK_VIEW_SELECTOR);
  await click(HEADERS_TAB_SELECTOR, {
    root: networkView,
  });
  await waitFor(ACTIVE_HEADERS_TAB_SELECTOR, networkView);
}

async function editorTabHasPurpleDot(): Promise<boolean> {
  const tabHeaderIcon = await waitFor('.tabbed-pane-header-tab-icon .spritesheet-mediumicons');
  return await tabHeaderIcon?.evaluate(node => node.classList.contains('purple-dot'));
}

async function correspondingFileTreeEntryIconHasPurpleDot(): Promise<boolean> {
  await clickOnContextMenu('.tabbed-pane-header-tab[aria-label=".headers"]', 'Reveal in sidebar');
  const fileTreeIcon = await waitFor('.icon', await activeElement());
  return await fileTreeIcon?.evaluate(node => node.classList.contains('largeicon-navigator-file-sync'));
}

async function editHeaderItem(newValue: string, previousValue: string): Promise<void> {
  let focusedTextContent = await activeElementTextContent();
  assert.strictEqual(focusedTextContent, previousValue);
  await pasteText(newValue);
  focusedTextContent = await activeElementTextContent();
  assert.strictEqual(focusedTextContent, newValue);
  await pressKey('Tab');
}

describe('The Overrides Panel', async function() {
  this.timeout(10000);

  afterEach(async () => {
    await openSourcesPanel();
    await openOverridesSubPane();
    await click('[aria-label="Clear configuration"]');
    await waitFor(ENABLE_OVERRIDES_SELECTOR);
  });

  it('can create header overrides', async () => {
    await enableExperiment('headerOverrides');
    await goToResource('empty.html');
    await openSourcesPanel();
    await enableLocalOverrides();
    await createHeaderOverride();
    await navigateToNetworkTab('hello.html');
    await waitForSomeRequestsToAppear(1);
    await selectRequestByName('hello.html');
    await openHeadersTab();

    const responseHeaderSection = await waitFor(RESPONSE_HEADERS_SELECTOR);
    const row = await waitFor(HEADER_ROW_SELECTOR, responseHeaderSection);
    assert.deepStrictEqual(await getTextFromHeadersRow(row), ['aaa:', 'bbb']);
  });

  it('can override headers via network panel', async () => {
    await enableExperiment('headerOverrides');
    await navigateToNetworkTab('hello.html');
    await waitForSomeRequestsToAppear(1);
    await selectRequestByName('hello.html');
    await openHeadersTab();

    await click('.enable-editing');
    await click('[aria-label="Select a folder to store override files in."] button');
    await click('.add-header-button');

    await waitFor('.row.header-overridden.header-editable');
    await editHeaderItem('foo', 'header-name');
    await editHeaderItem('bar', 'header value');

    await waitFor('[title="Refresh the page/request for these changes to take effect"]');
    await click('[title="Reveal header override definitions"]');
    assert.isTrue(await editorTabHasPurpleDot());
    assert.isTrue(await correspondingFileTreeEntryIconHasPurpleDot());

    await navigateToNetworkTab('hello.html');
    await waitForSomeRequestsToAppear(1);
    await selectRequestByName('hello.html');
    await openHeadersTab();

    const responseHeaderSection = await waitFor(RESPONSE_HEADERS_SELECTOR);
    const row = await waitFor('.row.header-overridden.header-editable', responseHeaderSection);
    assert.deepStrictEqual(await getTextFromHeadersRow(row), ['foo:', 'bar']);
    await click('[title="Reveal header override definitions"]');
    assert.isTrue(await editorTabHasPurpleDot());
    assert.isTrue(await correspondingFileTreeEntryIconHasPurpleDot());

    await goToResource('pages/hello-world.html');
    await waitForFunction(async () => {
      return (await editorTabHasPurpleDot()) === false &&
          (await correspondingFileTreeEntryIconHasPurpleDot()) === false;
    });
  });
});
