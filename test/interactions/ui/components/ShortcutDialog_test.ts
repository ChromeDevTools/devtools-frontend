// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {loadComponentDocExample, preloadForCodeCoverage} from '../../../../test/interactions/helpers/shared.js';
import {waitFor} from '../../../../test/shared/helper.js';
import {describe, itScreenshot} from '../../../../test/shared/mocha-extensions.js';
import {
  assertElementScreenshotUnchanged,
  waitForDialogAnimationEnd,
} from '../../../shared/screenshots.js';

describe('Shortcut dialog screenshot tests', () => {
  preloadForCodeCoverage('shortcut_dialog/basic.html');

  itScreenshot('renders the shortcut dialog button', async () => {
    await loadComponentDocExample('shortcut_dialog/basic.html');
    const container = await waitFor('#container');
    await assertElementScreenshotUnchanged(container, 'shortcut_dialog/shortcut_dialog_closed.png');
  });

  itScreenshot('renders the shortcut dialog', async () => {
    await loadComponentDocExample('shortcut_dialog/basic.html');
    const container = await waitFor('#container');
    const showButton = await waitFor('devtools-button', container);
    const animationEndPromise = waitForDialogAnimationEnd();
    await showButton.click();
    await animationEndPromise;
    // Have a larger threshold here: the font rendering is slightly different on CQ.
    await assertElementScreenshotUnchanged(container, 'shortcut_dialog/shortcut_dialog_open.png', 3);
  });

  itScreenshot('click the close button and close the shortcut dialog', async () => {
    await loadComponentDocExample('shortcut_dialog/basic.html');
    const container = await waitFor('#container');

    const showButton = await waitFor('devtools-button', container);
    const animationEndPromise = waitForDialogAnimationEnd();
    await showButton.click();
    await animationEndPromise;

    const dialog = await waitFor('devtools-dialog');
    const closeButton = await waitFor('devtools-button', dialog);
    await closeButton.click();
    await assertElementScreenshotUnchanged(container, 'shortcut_dialog/shortcut_dialog_closed_after_open.png');
  });
});
