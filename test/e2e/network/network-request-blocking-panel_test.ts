// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {expect} from 'chai';
import {type ElementHandle} from 'puppeteer-core';

import {
  waitFor,
  waitForAria,
  waitForAriaNone,
  waitForElementWithTextContent,
  waitForFunction,
} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {openPanelViaMoreTools} from '../helpers/settings-helpers.js';

async function navigateToNetworkRequestBlockingTab() {
  await openPanelViaMoreTools('Network request blocking');
}

async function checkboxIsChecked(element: ElementHandle<HTMLInputElement>): Promise<boolean> {
  return await element.evaluate(node => node.checked);
}

async function isVisible(element: ElementHandle, container: ElementHandle): Promise<boolean> {
  const elementBox = JSON.parse(await element.evaluate(e => JSON.stringify(e.getBoundingClientRect())));
  const containerBox = JSON.parse(await container.evaluate(e => JSON.stringify(e.getBoundingClientRect())));

  return elementBox.top <= containerBox.top ? containerBox.top - elementBox.top <= elementBox.height :
                                              elementBox.bottom - containerBox.bottom <= elementBox.height;
}

async function disableNetworkRequestBlocking() {
  const networkRequestBlockingCheckbox =
      await (await waitForAria('Enable network request blocking')).toElement('input');
  expect(await checkboxIsChecked(networkRequestBlockingCheckbox)).to.equal(true);
  await networkRequestBlockingCheckbox.click();
  expect(await checkboxIsChecked(networkRequestBlockingCheckbox)).to.equal(false);
}

describe('Network request blocking panel', async () => {
  async function setup() {
    await navigateToNetworkRequestBlockingTab();
    for (let i = 0; i < 20; i++) {
      const plusButton = await waitForAria('Add pattern');
      await plusButton.click();
      const inputField = await waitFor('.blocked-url-edit-value > input');
      await inputField.type(i.toString());
      const addButton = await waitForAria('Add');
      await addButton.click();
    }
  }

  it('pattern list inactive when blocking disabled', async () => {
    await setup();
    await disableNetworkRequestBlocking();

    await waitForAriaNone('Edit');
    await waitForAriaNone('Remove');

    const firstListItem = await waitFor('.blocked-url');
    const firstCheckbox =
        await (await waitFor('.widget > .list > .list-item > .blocked-url > .blocked-url-checkbox')).toElement('input');
    expect(await checkboxIsChecked(firstCheckbox)).to.equal(true);
    await firstListItem.click();
    expect(await checkboxIsChecked(firstCheckbox)).to.equal(true);
  });

  it('pattern scrollable when blocking disabled', async () => {
    await setup();
    await disableNetworkRequestBlocking();

    const list = await waitFor('.list');
    const lastListItem = await waitForElementWithTextContent('19');
    // TODO: this is not completely fair way to scroll but mouseWheel does not
    // seem to work here in the new-headless on Windows and Linux.
    await lastListItem.scrollIntoView();
    await waitForFunction(() => isVisible(lastListItem, list));
  });
});
