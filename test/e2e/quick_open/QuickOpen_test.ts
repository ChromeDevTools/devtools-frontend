// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {goToResource} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {getMenuItemTitleAtPosition, openFileQuickOpen} from '../helpers/quick_open-helpers.js';

describe('Quick Open menu', () => {
  it('lists available files', async () => {
    await goToResource('pages/hello-world.html');
    await openFileQuickOpen();
    const firstItemTitle = await getMenuItemTitleAtPosition(0);
    assert.strictEqual(firstItemTitle, 'hello-world.html');
  });
});
