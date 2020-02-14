// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describe, it} from 'mocha';
import {click, getBrowserAndPages, resetPages, resourcesPath} from '../../shared/helper.js';
import {assertScreenshotUnchanged} from '../../shared/screenshot.js';

describe('hello world', () => {
  beforeEach(async () => {
    await resetPages();
  });

  it('takes a screenshot', async () => {
    const {target, frontend} = getBrowserAndPages();
    await target.goto(`${resourcesPath}/console/big-int.html`);
    await click('#tab-console');
    await frontend.waitForSelector('.console-group-messages');

    await assertScreenshotUnchanged(frontend, 'hello-world.png');
  });
});
