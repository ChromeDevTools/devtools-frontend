// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {debuggerStatement, getBrowserAndPages, waitFor} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {doubleClickSourceTreeItem, navigateToApplicationTab} from '../helpers/application-helpers.js';

const WEB_SQL_SELECTOR = '[aria-label="Web SQL"]';
const DATABASES_SELECTOR = `${WEB_SQL_SELECTOR} + ol`;

describe('The Application Tab', async () => {
  // WebSQL has been disabled by default in Chrome. We need to drop
  // support for it in devtools.
  it.skip('[crbug.com/1482175] shows WebSQL database', async () => {
    const {target, frontend} = getBrowserAndPages();
    await navigateToApplicationTab(target, 'websql-database');

    await doubleClickSourceTreeItem(WEB_SQL_SELECTOR);
    await debuggerStatement(frontend);

    const databaseList = await waitFor(DATABASES_SELECTOR);

    const databaseNames = await databaseList.evaluate((list: Element) => {
      return Array.from(list.querySelectorAll('li')).map(node => node.textContent);
    });
    assert.deepEqual(databaseNames, ['InspectorDatabaseTest', 'InspectorDatabaseTest2']);
  });
});
