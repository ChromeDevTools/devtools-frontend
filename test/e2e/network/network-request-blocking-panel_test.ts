// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {expect} from 'chai';
import type {ElementHandle} from 'puppeteer-core';

import {
  waitFor,
  waitForAria,
  waitForAriaNone,
  waitForElementWithTextContent,
  waitForFunction,
} from '../../shared/helper.js';
import {openPanelViaMoreTools} from '../helpers/settings-helpers.js';

async function checkboxIsChecked(element: ElementHandle<HTMLInputElement>): Promise<boolean> {
  return await element.evaluate(node => node.checked);
}

async function isVisible(element: ElementHandle, container: ElementHandle): Promise<boolean> {
  const elementBox = JSON.parse(await element.evaluate(e => JSON.stringify(e.getBoundingClientRect())));
  const containerBox = JSON.parse(await container.evaluate(e => JSON.stringify(e.getBoundingClientRect())));

  return elementBox.top <= containerBox.top ? containerBox.top - elementBox.top <= elementBox.height :
                                              elementBox.bottom - containerBox.bottom <= elementBox.height;
}

describe('The Network request blocking panel', () => {
  beforeEach(async () => {
    await openPanelViaMoreTools('Network request blocking');

    for (let i = 0; i < 20; i++) {
      const plusButton = await waitForAria('Add network request blocking pattern');
      await plusButton.click();
      const inputField = await waitFor('.blocked-url-edit-value > input');
      await inputField.type(i.toString());
      const addButton = await waitForAria('Add');
      await addButton.click();
    }

    const networkRequestBlockingCheckbox =
        await (await waitForAria('Enable network request blocking')).toElement('input');
    expect(await checkboxIsChecked(networkRequestBlockingCheckbox)).to.equal(true);
    await networkRequestBlockingCheckbox.click();
    expect(await checkboxIsChecked(networkRequestBlockingCheckbox)).to.equal(false);
  });

  it('prohibits unchecking patterns when blocking is disabled', async () => {
    await waitForAriaNone('Edit');
    await waitForAriaNone('Remove');

    const firstListItem = await waitFor('.blocked-url');
    const firstCheckbox =
        await (await waitFor('.widget > .list > .list-item > .blocked-url > .blocked-url-checkbox')).toElement('input');
    expect(await checkboxIsChecked(firstCheckbox)).to.equal(true);
    await firstListItem.click();
    expect(await checkboxIsChecked(firstCheckbox)).to.equal(true);
  });

  it('allows scrolling the pattern list when blocking is disabled', async () => {
    const list = await waitFor('.list');
    const lastListItem = await waitForElementWithTextContent('19');
    // TODO: this is not completely fair way to scroll but mouseWheel does not
    // seem to work here in the new-headless on Windows and Linux.
    await lastListItem.scrollIntoView();
    await waitForFunction(() => isVisible(lastListItem, list));
  });
});
