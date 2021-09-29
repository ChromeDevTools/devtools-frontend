// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {goToResource} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {clickOnContextMenu} from '../helpers/sources-helpers.js';

describe('The Elements panel', async () => {
  it('has a context menu item to enter Isolation Mode', async () => {
    await goToResource('elements/css-container-queries.html');
    await clickOnContextMenu('[aria-label="</body>"]', 'Enter Isolation Mode');
    await clickOnContextMenu('[aria-label="</body>"]', 'Exit Isolation Mode');
  });
});
