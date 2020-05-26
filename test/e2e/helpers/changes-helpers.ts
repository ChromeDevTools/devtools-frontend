// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {$, $$, getBrowserAndPages, resourcesPath, waitFor, waitForFunction} from '../../shared/helper.js';

import {openCommandMenu} from '../helpers/quick_open-helpers.js';

const PANEL_ROOT_SELECTOR = 'div[aria-label="Changes panel"]';

export async function openChangesPanelAndNavigateTo(testName: string) {
  const {target, frontend} = getBrowserAndPages();

  await target.goto(`${resourcesPath}/changes/${testName}.html`);

  await openCommandMenu();
  await frontend.keyboard.type('changes');
  await frontend.keyboard.press('Enter');

  await waitFor(PANEL_ROOT_SELECTOR);
}

export async function getChangesList() {
  const root = await $(PANEL_ROOT_SELECTOR);
  const items = await $$('.tree-element-title', root);

  return items.evaluate((nodes: Element[]) => {
    return nodes.map(node => node.textContent || '');
  });
}

export async function waitForNewChanges(initialChanges: string[]) {
  let newChanges = [];

  await waitForFunction(async () => {
    newChanges = await getChangesList();
    return newChanges.length !== initialChanges.length;
  }, `Expected the list of changes length to change from ${initialChanges.length} to ${newChanges.length}.`);
}
