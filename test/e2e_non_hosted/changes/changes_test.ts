// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {veImpressionForChangesPanel} from '../../e2e/helpers/changes-helpers.js';
import {editCSSProperty} from '../../e2e/helpers/elements-helpers.js';
import {openCommandMenu} from '../../e2e/helpers/quick_open-helpers.js';
import {expectVeEvents, veImpressionsUnder} from '../../e2e/helpers/visual-logging-helpers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';
import type {InspectedPage} from '../shared/target-helper.js';

describe('The Changes Panel', () => {
  const PANEL_ROOT_SELECTOR = 'div[aria-label="Changes panel"]';

  async function openChangesPanelAndNavigateTo(
      testName: string, devToolsPage: DevToolsPage, inspectedPage: InspectedPage) {
    await inspectedPage.goToResource(`changes/${testName}.html`);

    await openCommandMenu(devToolsPage);
    await devToolsPage.page.keyboard.type('changes');
    // TODO: it should actually wait for rendering to finish.
    await devToolsPage.drainTaskQueue();
    await devToolsPage.page.keyboard.press('Enter');
    // TODO: it should actually wait for rendering to finish.
    await devToolsPage.drainTaskQueue();

    await devToolsPage.waitFor(PANEL_ROOT_SELECTOR);
  }

  async function getChangesList(devToolsPage: DevToolsPage) {
    const root = await devToolsPage.waitFor(PANEL_ROOT_SELECTOR);
    const items = await devToolsPage.$$('.tree-element-title', root);

    return await Promise.all(items.map(node => {
      return node.evaluate(node => node.textContent as string);
    }));
  }

  async function waitForNewChanges(initialChanges: string[], devToolsPage: DevToolsPage) {
    let newChanges = [];

    return await devToolsPage.waitForFunction(async () => {
      newChanges = await getChangesList(devToolsPage);
      return newChanges.length !== initialChanges.length;
    });
  }

  it('Shows changes made in the Styles pane', async ({devToolsPage, inspectedPage}) => {
    const TEST_PAGE = 'styled-page';

    await openChangesPanelAndNavigateTo(TEST_PAGE, devToolsPage, inspectedPage);

    let changes = await getChangesList(devToolsPage);
    assert.lengthOf(changes, 0, 'There should be no changes by default');

    await editCSSProperty('html, body', 'background', 'red', devToolsPage);
    await waitForNewChanges(changes, devToolsPage);

    changes = await getChangesList(devToolsPage);
    assert.lengthOf(changes, 1, 'There should now be 1 change in the list');
    assert.strictEqual(changes[0], `${TEST_PAGE}.html`);

    await expectVeEvents(
        [
          veImpressionsUnder('Drawer', [veImpressionForChangesPanel()]),
        ],
        undefined, devToolsPage);
  });
});
