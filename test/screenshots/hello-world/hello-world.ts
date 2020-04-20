// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describe, it} from 'mocha';

import {click, getBrowserAndPages, resourcesPath} from '../../shared/helper.js';
import {assertElementScreenshotUnchanged, assertPageScreenshotUnchanged} from '../../shared/screenshot.js';

describe('hello world', () => {
  it('takes a screenshot', async () => {
    const {target, frontend} = getBrowserAndPages();
    await target.goto(`${resourcesPath}/console/built-ins.html`);
    await click('#tab-console');
    await frontend.waitForSelector('.console-group-messages');

    await assertPageScreenshotUnchanged(frontend, 'hello-world.png');
  });

  it('can take a screenshot of a single element', async () => {
    const {target, frontend} = getBrowserAndPages();
    await target.goto(`${resourcesPath}/console/dom-interactions.html`);
    await click('#tab-console');
    await frontend.waitForSelector('.console-group-messages');
    const selectElem = await target.$('select[name="sel"]');

    await assertElementScreenshotUnchanged(selectElem, 'select-elem.png');
  });
});
