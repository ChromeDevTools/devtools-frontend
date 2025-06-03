// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import {assert} from 'chai';
import type {ElementHandle} from 'puppeteer-core';

import {openPanelViaMoreTools} from '../../e2e/helpers/settings-helpers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';

async function checkboxIsChecked(element: ElementHandle<HTMLInputElement>): Promise<boolean> {
  return await element.evaluate(node => node.checked);
}

async function isVisible(element: ElementHandle, container: ElementHandle): Promise<boolean> {
  const elementBox = JSON.parse(await element.evaluate(e => JSON.stringify(e.getBoundingClientRect())));
  const containerBox = JSON.parse(await container.evaluate(e => JSON.stringify(e.getBoundingClientRect())));

  return elementBox.top <= containerBox.top ? containerBox.top - elementBox.top <= elementBox.height :
                                              elementBox.bottom - containerBox.bottom <= elementBox.height;
}

async function setupRequestBlocking(devToolsPage: DevToolsPage): Promise<void> {
  await openPanelViaMoreTools('Network request blocking', devToolsPage);

  for (let i = 0; i < 10; i++) {
    await devToolsPage.click('aria/Add network request blocking pattern');
    await devToolsPage.click('.blocked-url-edit-value > input');
    await devToolsPage.typeText(i.toString());
    await devToolsPage.click('aria/Add');
  }

  const networkRequestBlockingCheckbox =
      await (await devToolsPage.waitForAria('Enable network request blocking')).toElement('input');
  assert.isTrue(await checkboxIsChecked(networkRequestBlockingCheckbox));
  await networkRequestBlockingCheckbox.click();
  assert.isFalse(await checkboxIsChecked(networkRequestBlockingCheckbox));
}

describe('The Network request blocking panel', () => {
  it('prohibits unchecking patterns when blocking is disabled', async ({devToolsPage}) => {
    await setupRequestBlocking(devToolsPage);
    await devToolsPage.waitForAriaNone('Edit');
    await devToolsPage.waitForAriaNone('Remove');

    const firstListItem = await devToolsPage.waitFor('.blocked-url');
    const firstCheckbox =
        await (await devToolsPage.waitFor('.widget > .list > .list-item > .blocked-url > .blocked-url-checkbox'))
            .toElement('input');
    assert.isTrue(await checkboxIsChecked(firstCheckbox));
    await firstListItem.click();
    assert.isTrue(await checkboxIsChecked(firstCheckbox));
  });

  it('allows scrolling the pattern list when blocking is disabled', async ({devToolsPage}) => {
    await setupRequestBlocking(devToolsPage);
    const list = await devToolsPage.waitFor('.list');
    const lastListItem = await devToolsPage.waitForElementWithTextContent('9');
    // TODO: this is not completely fair way to scroll but mouseWheel does not
    // seem to work here in the new-headless on Windows and Linux.
    await lastListItem.scrollIntoView();
    await devToolsPage.waitForFunction(() => isVisible(lastListItem, list));
  });
});
