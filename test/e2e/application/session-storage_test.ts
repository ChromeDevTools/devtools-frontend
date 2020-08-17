// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {getBrowserAndPages, getHostedModeServerPort, step} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {doubleClickSourceTreeItem, getDataGridData, navigateToApplicationTab} from '../helpers/application-helpers.js';

const SESSION_STORAGE_SELECTOR = '[aria-label="Session Storage"]';
let DOMAIN_SELECTOR: string;

describe('The Application Tab', async () => {
  before(async () => {
    DOMAIN_SELECTOR = `${SESSION_STORAGE_SELECTOR} + ol > [aria-label="http://localhost:${getHostedModeServerPort()}"]`;
  });

  it('shows Session Storage keys and values', async () => {
    const {target} = getBrowserAndPages();

    await step('navigate to session-storage resource and open Application tab', async () => {
      await navigateToApplicationTab(target, 'session-storage');
    });

    await step('open the domain storage', async () => {
      await doubleClickSourceTreeItem(SESSION_STORAGE_SELECTOR);
      await doubleClickSourceTreeItem(DOMAIN_SELECTOR);
    });

    await step('check that storage data values are correct', async () => {
      const dataGridRowValues = await getDataGridData('.storage-view table', ['key', 'value']);
      assert.deepEqual(dataGridRowValues, [
        {
          key: 'firstKey',
          value: 'firstValue',
        },
        {
          key: 'secondKey',
          value: '{"field":"complexValue","primitive":2}',
        },
        {
          key: '',
          value: '',
        },
      ]);
    });
  });
});
