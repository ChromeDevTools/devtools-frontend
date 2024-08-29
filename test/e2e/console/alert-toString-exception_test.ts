// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  getBrowserAndPages,
} from '../../shared/helper.js';

import {getConsoleMessages, navigateToConsoleTab} from '../helpers/console-helpers.js';

describe('The Console Tab', () => {
  it('Does not crash if it fails to convert alert() argument to string', async () => {
    await navigateToConsoleTab();
    const {target} = getBrowserAndPages();

    target.reload();

    const result = (await getConsoleMessages('alert-toString-exception'))[0];
    assert.strictEqual(result, 'Uncaught Exception in toString().');
  });
});
