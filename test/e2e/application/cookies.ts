// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import {getBrowserAndPages, resetPages, resourcesPath} from '../../shared/helper.js';

import {doubleClickSourceTreeItem, getDataGridData, navigateToApplicationTab} from '../helpers/application-helpers.js';

const COOKIES_SELECTOR = '[aria-label="Cookies"]';
const DOMAIN_SELECTOR = `${COOKIES_SELECTOR} + ol > [aria-label="http://localhost:8090"]`;

describe('The Application Tab', async () => {
  beforeEach(async () => {
    await resetPages();
  });

  afterEach(async () => {
    const {target} = getBrowserAndPages();
    await target.deleteCookie({name: 'foo'});
  });

  it('[crbug.com/1047348] shows cookies even when navigating to an unreachable page', async () => {
    const {target} = getBrowserAndPages();
    // This sets a new cookie foo=bar
    await navigateToApplicationTab(target, 'cookies');

    await target.goto(`${resourcesPath}/unreachable.rawresponse`);

    await doubleClickSourceTreeItem(COOKIES_SELECTOR);
    await doubleClickSourceTreeItem(DOMAIN_SELECTOR);

    const dataGridRowValues = await getDataGridData('.storage-view table', ['name', 'value']);
    assert.deepEqual(dataGridRowValues, [
      {
        name: 'foo',
        value: 'bar',
      },
      {
        name: '',
        value: '',
      },
    ]);
  });
});
