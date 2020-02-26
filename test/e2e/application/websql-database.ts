// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';
import * as puppeteer from 'puppeteer';

import {$, click, getBrowserAndPages, resetPages, resourcesPath, waitFor, debuggerStatement} from '../../shared/helper.js';

const WEB_SQL_SELECTOR = `[aria-label="Web SQL"]`;
const DATABASES_SELECTOR = `${WEB_SQL_SELECTOR} + ol`;

async function navigateToApplicationTab(target: puppeteer.Page, testName: string) {
  await target.goto(`${resourcesPath}/application/${testName}.html`);
  await click('#tab-resources');
  // Make sure the application navigation list is shown
  await waitFor('.storage-group-list-item');
}

async function doubleClickSourceTreeItem(selector: string) {
  await waitFor(selector);
  await click(selector, {clickOptions: {clickCount: 2}});
}

describe('The Application Tab', async () => {
  beforeEach(async () => {
    await resetPages();
  });

  it('shows WebSQL database', async () => {
    const {target, frontend} = getBrowserAndPages();
    await navigateToApplicationTab(target, 'websql-database');

    await doubleClickSourceTreeItem(WEB_SQL_SELECTOR);
    await debuggerStatement(frontend);

    await waitFor(DATABASES_SELECTOR);
    const databaseList = await $(DATABASES_SELECTOR);

    const databaseNames = await databaseList.evaluate((list: Element) => {
      return Array.from(list.querySelectorAll('li')).map(node => node.textContent);
    });
    assert.deepEqual(databaseNames, ['InspectorDatabaseTest', 'InspectorDatabaseTest2']);
  });
});
