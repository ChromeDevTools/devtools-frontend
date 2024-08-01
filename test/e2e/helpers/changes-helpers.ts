// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {$$, getBrowserAndPages, goToResource, waitFor, waitForFunction} from '../../shared/helper.js';

import {openCommandMenu} from './quick_open-helpers.js';
import {
  expectVeEvents,
  veImpression,
  veImpressionsUnder,
} from './visual-logging-helpers.js';

const PANEL_ROOT_SELECTOR = 'div[aria-label="Changes panel"]';
const COPY_CHANGES_SELECTOR = '[aria-label="Copy all changes from current file"]';

export async function openChangesPanelAndNavigateTo(testName: string) {
  const {frontend} = getBrowserAndPages();

  await goToResource(`changes/${testName}.html`);

  await openCommandMenu();
  await frontend.keyboard.type('changes');
  await frontend.keyboard.press('Enter');

  await waitFor(COPY_CHANGES_SELECTOR);
  await expectVeEvents([
    veImpressionsUnder('Drawer', [veImpressionForChangesPanel()]),

  ]);
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

export function veImpressionForChangesPanel() {
  return veImpression('Panel', 'changes', [
    veImpression('Pane', 'sidebar'),
    veImpression('Section', 'empty-view'),
    veImpression(
        'Toolbar', undefined, [veImpression('Action', 'changes.copy'), veImpression('Action', 'changes.revert')]),
  ]);
}
