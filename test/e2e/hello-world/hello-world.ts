// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import {getBrowserAndPages, getElementPosition, resetPages, resourcesPath} from '../helper.js';

describe('The Console Tab', async () => {
  beforeEach(async () => {
    await resetPages();
  });

  it('shows console messages', async () => {
    const {target, frontend} = getBrowserAndPages();

    // Have the target load the page.
    await target.goto(`${resourcesPath}/pages/hello-world.html`);

    // Locate the button for switching to the console tab.
    const consoleTabButtonLocation = await getElementPosition({id: 'tab-console'});
    if (!consoleTabButtonLocation) {
      assert.fail('Unable to locate console tab button.');
    }

    // Click on the button and wait for the console to load. The reason we use this method
    // rather than elementHandle.click() is because the frontend attaches the behavior to
    // a 'mousedown' event (not the 'click' event). To avoid attaching the test behavior
    // to a specific event we instead locate the button in question and ask Puppeteer to
    // click on it instead.
    await frontend.mouse.click(consoleTabButtonLocation.x, consoleTabButtonLocation.y);
    await frontend.waitForSelector('.console-group-messages');

    // Get the first message from the console.
    const msg = await frontend.evaluate(() => {
      const message = document.querySelector('.console-group-messages .source-code');
      return message.textContent;
    });

    assert.equal(msg, 'hello-world.html:11 Hello, World!');
  });
});
