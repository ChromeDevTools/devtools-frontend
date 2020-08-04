// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {$$, getBrowserAndPages, goToResource, waitFor, waitForFunction} from '../../shared/helper.js';

import {openCommandMenu} from '../helpers/quick_open-helpers.js';

const PANEL_ROOT_SELECTOR = 'div[aria-label="Changes panel"]';

export async function openChangesPanelAndNavigateTo(testName: string) {
  const {frontend} = getBrowserAndPages();

  await goToResource(`changes/${testName}.html`);

  await openCommandMenu();
  await frontend.keyboard.type('changes');
  await frontend.keyboard.press('Enter');

  await waitFor(PANEL_ROOT_SELECTOR);
}

export async function getChangesList() {
  const root = await waitFor(PANEL_ROOT_SELECTOR);
  const items = await $$('.tree-element-title', root);

  return Promise.all(items.map(node => {
    return node.evaluate(node => node.textContent as string);
  }));
}

export async function waitForNewChanges(initialChanges: string[]) {
  let newChanges = [];

  return waitForFunction(async () => {
    newChanges = await getChangesList();
    return newChanges.length !== initialChanges.length;
  });
}
