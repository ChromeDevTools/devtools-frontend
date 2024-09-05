// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {loadComponentDocExample} from '../../../../test/interactions/helpers/shared.js';
import {waitFor} from '../../../../test/shared/helper.js';
import {
  assertElementScreenshotUnchanged,
  waitForDialogAnimationEnd,
} from '../../../shared/screenshots.js';

describe('IconDialog screenshot tests', () => {
  itScreenshot('renders the icon dialog button', async () => {
    await loadComponentDocExample('icon_dialog/basic.html');
    const container = await waitFor('#container');
    await assertElementScreenshotUnchanged(container, 'icon_dialog/icon_dialog_closed.png');
  });

  itScreenshot('renders the icon dialog', async () => {
    await loadComponentDocExample('icon_dialog/basic.html');
    const container = await waitFor('#container');
    const icon = await waitFor('devtools-icon', container);
    const animationEndPromise = waitForDialogAnimationEnd();
    await icon.click();
    await animationEndPromise;
    // Have a larger threshold here: the font rendering is slightly different on CQ.
    await assertElementScreenshotUnchanged(container, 'icon_dialog/icon_dialog_open.png', 3);
  });

  itScreenshot('click the close button and close the icon dialog', async () => {
    await loadComponentDocExample('icon_dialog/basic.html');
    const container = await waitFor('#container');

    const icon = await waitFor('devtools-icon', container);
    const animationEndPromise = waitForDialogAnimationEnd();
    await icon.click();
    await animationEndPromise;

    const dialog = await waitFor('devtools-dialog');
    const closeButton = await waitFor('devtools-icon', dialog);
    await closeButton.click();
    await assertElementScreenshotUnchanged(container, 'icon_dialog/icon_dialog_closed_after_open.png');
  });
});
