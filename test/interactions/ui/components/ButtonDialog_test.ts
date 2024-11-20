// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {loadComponentDocExample} from '../../../../test/interactions/helpers/shared.js';
import {waitFor} from '../../../../test/shared/helper.js';
import {
  assertElementScreenshotUnchanged,
  waitForDialogAnimationEnd,
} from '../../../shared/screenshots.js';

describe('ButtonDialog screenshot tests', () => {
  itScreenshot('renders the button dialog button', async () => {
    await loadComponentDocExample('dialog/button_dialog.html');
    const container = await waitFor('#container');
    await assertElementScreenshotUnchanged(container, 'dialog/button_dialog_closed.png');
  });

  itScreenshot('renders the button dialog', async () => {
    await loadComponentDocExample('dialog/button_dialog.html');
    const container = await waitFor('#container');
    const button = await waitFor('devtools-button', container);
    const animationEndPromise = waitForDialogAnimationEnd();
    await button.click();
    await animationEndPromise;
    // Have a larger threshold here: the font rendering is slightly different on CQ.
    await assertElementScreenshotUnchanged(container, 'dialog/button_dialog_open.png', 3);
  });

  itScreenshot('click the close button and close the button dialog', async () => {
    await loadComponentDocExample('dialog/button_dialog.html');
    const container = await waitFor('#container');

    const button = await waitFor('devtools-button', container);
    const animationEndPromise = waitForDialogAnimationEnd();
    await button.click();
    await animationEndPromise;

    const dialog = await waitFor('devtools-dialog');
    const closeButton = await waitFor('devtools-button', dialog);
    await closeButton.click();
    await assertElementScreenshotUnchanged(container, 'dialog/button_dialog_closed_after_open.png');
  });
});
