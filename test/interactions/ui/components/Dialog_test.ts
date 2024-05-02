// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Dialogs from '../../../../front_end/ui/components/dialogs/dialogs.js';
import {loadComponentDocExample, preloadForCodeCoverage} from '../../../../test/interactions/helpers/shared.js';
import {getBrowserAndPages, waitFor} from '../../../../test/shared/helper.js';
import {describe, itScreenshot} from '../../../../test/shared/mocha-extensions.js';
import {
  assertElementScreenshotUnchanged,
  waitForDialogAnimationEnd,
} from '../../../shared/screenshots.js';

async function openDialog(dialogNumber: number) {
  await loadComponentDocExample('dialog/basic.html');
  const dialog = await waitFor(`#dialog-${dialogNumber}`);
  const animationEndPromise = waitForDialogAnimationEnd();
  await dialog.evaluate((element: Element) => {
    const dialog = element as Dialogs.Dialog.Dialog;
    void dialog.setDialogVisible(true);
  });
  await animationEndPromise;
  return await waitFor('dialog', dialog);
}

describe('dialog screenshots test', () => {
  preloadForCodeCoverage('dialog/basic.html');

  describe('dialog is positioned properly', () => {
    itScreenshot('renders the dialog at the top left properly', async () => {
      await openDialog(1);
      const container = await waitFor('#container-1');
      await assertElementScreenshotUnchanged(container, 'dialog/top-left-open.png');
    });

    itScreenshot('renders a dialog at the bottom with automatic horizontal alignment properly', async () => {
      await openDialog(5);
      const container = await waitFor('#container-5');
      await assertElementScreenshotUnchanged(container, 'dialog/bottom-auto-open.png');
    });

    itScreenshot('renders the dialog at the bottom center properly', async () => {
      await openDialog(7);
      const container = await waitFor('#container-7');
      await assertElementScreenshotUnchanged(container, 'dialog/bottom-center-open.png');
    });

    itScreenshot(
        'renders a dialog for super narrow origin at the top with automatic horizontal alignment properly',
        async () => {
          await openDialog(20);
          const container = await waitFor('#container-20');
          await assertElementScreenshotUnchanged(container, 'dialog/narrow-top-auto-open.png');
        });
  });
});

describe('dialog interactions test', () => {
  preloadForCodeCoverage('dialog/basic.html');

  it('keeps the dialog open when moving the cursor is moved inside the hitarea', async () => {
    const {frontend} = getBrowserAndPages();
    await openDialog(2);
    const container = await waitFor('#dialog-2');
    const hitArea = await container.evaluate((element: Element) => {
      const dialog = element as Dialogs.Dialog.Dialog;

      const bounds = dialog.getBoundingClientRect();
      // Values need to be extracted here as the bounding rect itself
      // can't be transferred from the page side to the test runner side.
      return {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
      };
    });
    if (!hitArea) {
      throw new Error('Unable to locate dialog');
    }
    // Make sure moving the mouse to a position inside the boundaries of the hit area doesn't
    // close the dialog.
    await frontend.mouse.move(hitArea.x + hitArea.width / 2, hitArea.y + hitArea.height / 2);

    await waitFor('devtools-dialog[open]');
  });

  it('closes the dialog when moving the cursor outside its boundaries', async () => {
    const {frontend} = getBrowserAndPages();
    const dialog = await openDialog(2);

    const dialogPosition = await dialog.boundingBox();
    if (!dialogPosition) {
      throw new Error('Unable to locate dialog');
    }
    // Make sure moving the mouse to a position inside the boundaries doesn't
    // close the dialog.
    await frontend.mouse.move(
        dialogPosition.x + dialogPosition.width / 2, dialogPosition.y + dialogPosition.height / 2);

    await waitFor('devtools-dialog[open]');
    // Move the mouse outside the dialog's boundaries.
    await frontend.mouse.move(0, 0);
    await waitFor('devtools-dialog:not([open])');
  });
});
