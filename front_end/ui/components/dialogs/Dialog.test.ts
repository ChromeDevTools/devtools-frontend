// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../core/platform/platform.js';
import type * as WindowBoundsService from '../../../services/window_bounds/window_bounds.js';
import * as Helpers from '../../../testing/DOMHelpers.js';  // eslint-disable-line rulesdir/es-modules-import
import {assertScreenshot} from '../../../testing/DOMHelpers.js';
import {describeWithLocale} from '../../../testing/EnvironmentHelpers.js';
import * as RenderCoordinator from '../render_coordinator/render_coordinator.js';

import * as Dialogs from './dialogs.js';

class DialogExampleWindowBoundsServiceFactory implements WindowBoundsService.WindowBoundsService.WindowBoundsService {
  constructor(private boundingElement: HTMLElement) {
  }
  getDevToolsBoundingElement(): HTMLElement {
    return this.boundingElement;
  }
}

describe('Dialog', () => {
  describe('positioning', () => {
    let dialog: Dialogs.Dialog.Dialog;
    let container: HTMLDivElement;
    let host: HTMLDivElement;
    beforeEach(() => {
      dialog = new Dialogs.Dialog.Dialog();
      container = document.createElement('div');
      container.style.width = '500px';
      container.style.height = '500px';
      container.style.display = 'flex';
      container.style.alignItems = 'center';
      container.style.justifyContent = 'center';

      host = document.createElement('div');
      host.textContent = 'Hover me';
      host.style.width = '100px';
      host.style.height = '100px';

      dialog.position = Dialogs.Dialog.DialogVerticalPosition.TOP;
      dialog.origin = host;
    });
    it('places the Dialog hit area correctly', async () => {
      host.addEventListener('click', () => dialog.setDialogVisible(true));
      dialog.addEventListener('clickoutsidedialog', () => dialog.setDialogVisible(false));

      container.appendChild(host);
      container.appendChild(dialog);
      Helpers.renderElementIntoDOM(container);
      await RenderCoordinator.done();

      Helpers.dispatchClickEvent(host);
      await RenderCoordinator.done();

      const hostBounds = host.getBoundingClientRect();
      const hitAreaBounds = dialog.getHitArea();

      // Make sure the hit area contains the host fully.
      assert.isAtMost(hitAreaBounds.top, hostBounds.top);
      assert.isAtLeast(hitAreaBounds.bottom, hostBounds.top + hostBounds.height);

      assert.isAtMost(hitAreaBounds.left, hostBounds.left);
      assert.isAtLeast(hitAreaBounds.right, hostBounds.left + hostBounds.width);
    });
    it('sets the automatic horizontal alignment correctly', async () => {
      // Create the container for the dialog and its origin (host).
      // This container will be set as the dialog's "window".
      // With the host in the left border of the window, the Dialog
      // should deploy from left to right (left horizontal alignment).
      container.style.display = 'block';
      host.style.position = 'relative';
      host.style.left = '0';

      const content = document.createElement('div');
      content.classList.add('dialog-content');
      content.style.padding = '0 1em';
      content.innerHTML = 'Hi';

      dialog.horizontalAlignment = Dialogs.Dialog.DialogHorizontalAlignment.AUTO;
      dialog.origin = host;

      // Set the dialog's "window" to be the container element we just created.
      dialog.windowBoundsService = new DialogExampleWindowBoundsServiceFactory(container);

      host.addEventListener('click', () => dialog.setDialogVisible(true));
      dialog.addEventListener('clickoutsidedialog', () => dialog.setDialogVisible(false));

      dialog.appendChild(content);
      container.appendChild(host);
      container.appendChild(dialog);
      Helpers.renderElementIntoDOM(container);
      await RenderCoordinator.done();

      // Open the dialog and check its position.
      Helpers.dispatchClickEvent(host);
      await RenderCoordinator.done();

      // Test the dialog is deployed left to right, since this way there is more space.
      assert.strictEqual(dialog.bestHorizontalAlignment, Dialogs.Dialog.DialogHorizontalAlignment.LEFT);

      // Close the dialog
      Helpers.dispatchKeyDownEvent(dialog, {key: Platform.KeyboardUtilities.ESCAPE_KEY, bubbles: true, composed: true});
      await RenderCoordinator.done();

      // With the host in the right border of the window, the Dialog
      // should deploy from right to left (left horizontal alignment).
      host.style.position = 'relative';
      host.style.left = '450px';
      await RenderCoordinator.done();

      // Open the dialog and check its position.
      Helpers.dispatchClickEvent(host);
      await RenderCoordinator.done();

      // Test the dialog is deployed right to left.
      assert.strictEqual(dialog.bestHorizontalAlignment, Dialogs.Dialog.DialogHorizontalAlignment.RIGHT);
    });

    it('sets the automatic vertical position correctly when it fits on top', async () => {
      // Create the container for the dialog and its origin (host), aligning
      // items to the bottom of the container. This container will be set as the
      // dialog's "window".
      // By default the dialog is placed at the bottom of its origin, but doing
      // so means it wouldn't fit in its window. Because if shown on top would
      // fit in its window it should be automatically positioned there.
      container.style.width = '150px';
      container.style.height = '300px';
      container.style.display = 'flex';
      container.style.alignItems = 'end';
      container.style.justifyContent = 'center';

      // The dialogs content dimensions exceed the viewport's
      const content = document.createElement('div');
      content.classList.add('dialog-content');
      content.style.padding = '0 1em';
      content.innerHTML = 'Hello, World<br/> I am <br/> a Dialog!';

      dialog.position = Dialogs.Dialog.DialogVerticalPosition.AUTO;
      dialog.origin = host;

      // Set the dialog's "window" to be the container element we just created.
      dialog.windowBoundsService = new DialogExampleWindowBoundsServiceFactory(container);

      host.addEventListener('click', () => dialog.setDialogVisible(true));
      dialog.addEventListener('clickoutsidedialog', () => dialog.setDialogVisible(false));

      dialog.appendChild(content);
      container.appendChild(host);
      container.appendChild(dialog);
      Helpers.renderElementIntoDOM(container);
      await RenderCoordinator.done();

      // Open the dialog and check its position.
      Helpers.dispatchClickEvent(host);
      await RenderCoordinator.done();

      // Test the capped dimensions
      assert.strictEqual(dialog.bestVerticalPosition, Dialogs.Dialog.DialogVerticalPosition.TOP);
    });

    it('sets the automatic vertical position correctly when it does not fit on top', async () => {
      // Create the container for the dialog and its origin (host), aligning
      // items to the bottom of the container. This container will be set as the
      // dialog's "window".
      // Because the dialog's full height cannot be fully fit at the
      // bottom or at the top it is positioned at the bottom and the
      // overflow made visible by scrolling.
      container.style.width = '150px';
      container.style.height = '80px';
      container.style.display = 'flex';
      container.style.alignItems = 'end';
      container.style.justifyContent = 'center';

      // The dialogs content dimensions exceed the viewport's
      const content = document.createElement('div');
      content.classList.add('dialog-content');
      content.style.padding = '0 1em';
      content.innerHTML = 'Hello, World<br/> I am <br/> a Dialog!';

      dialog.position = Dialogs.Dialog.DialogVerticalPosition.AUTO;
      dialog.origin = host;

      // Set the dialog's "window" to be the container element we just created.
      dialog.windowBoundsService = new DialogExampleWindowBoundsServiceFactory(container);

      host.addEventListener('click', () => dialog.setDialogVisible(true));
      dialog.addEventListener('clickoutsidedialog', () => dialog.setDialogVisible(false));

      dialog.appendChild(content);
      container.appendChild(host);
      container.appendChild(dialog);
      Helpers.renderElementIntoDOM(container);
      await RenderCoordinator.done();

      // Open the dialog and check its position.
      Helpers.dispatchClickEvent(host);
      await RenderCoordinator.done();

      // Test the capped dimensions
      assert.strictEqual(dialog.bestVerticalPosition, Dialogs.Dialog.DialogVerticalPosition.BOTTOM);
    });
    it('sets the max width and height correctly when the dialog\'s content dimensions exceed the viewport and the dialog is displayed as a modal',
       async () => {
         const devtoolsDialog = new Dialogs.Dialog.Dialog();
         const WINDOW_WIDTH = 300;
         // This container will be set as the dialog's "window", or the representation
         // of DevTools bounding element.
         container.style.width = `${WINDOW_WIDTH}px`;
         container.style.height = `${WINDOW_WIDTH}px`;
         const host = document.createElement('div');
         host.textContent = 'Hover me';
         host.style.width = '100px';

         const content = document.createElement('div');
         content.classList.add('dialog-content');
         content.style.width = '400px';
         content.style.height = '400px';
         content.innerHTML = 'Hello, World<br/> I am <br/> a Dialog!';

         devtoolsDialog.origin = Dialogs.Dialog.MODAL;

         // Set the dialog's "window" to be the container element we just created.
         devtoolsDialog.windowBoundsService = new DialogExampleWindowBoundsServiceFactory(container);

         host.addEventListener('click', () => devtoolsDialog.setDialogVisible(true));
         devtoolsDialog.addEventListener('clickoutsidedialog', () => devtoolsDialog.setDialogVisible(false));

         container.appendChild(host);
         container.appendChild(devtoolsDialog);
         Helpers.renderElementIntoDOM(container);
         await RenderCoordinator.done();
         devtoolsDialog.appendChild(content);

         // Open the dialog and check its position.
         Helpers.dispatchClickEvent(host);
         await RenderCoordinator.done();
         const dialog = devtoolsDialog.shadowRoot?.querySelector('dialog');
         if (!dialog) {
           assert.fail('Dialog not found');
           return;
         }
         assert.strictEqual(
             dialog.clientWidth,
             WINDOW_WIDTH - Dialogs.Dialog.DIALOG_PADDING_FROM_WINDOW + 2 * Dialogs.Dialog.DIALOG_SIDE_PADDING);
         assert.strictEqual(
             dialog.clientHeight,
             WINDOW_WIDTH - Dialogs.Dialog.DIALOG_PADDING_FROM_WINDOW + 2 * Dialogs.Dialog.DIALOG_VERTICAL_PADDING);
       });
    describe('with an anchor and possible overflow', () => {
      const CONTAINER_WIDTH = 500;
      const CONTAINER_HEIGHT = 500;
      const HOST_OFFSET = 100;
      const HOST_HEIGHT = 100;
      const devtoolsDialog = new Dialogs.Dialog.Dialog();
      let host: HTMLElement;
      let container: HTMLElement;
      beforeEach(async () => {
        // This container will be set as the dialog's "window", or the representation
        // of DevTools bounding element.
        container = document.createElement('div');
        container.style.width = `${CONTAINER_WIDTH}px`;
        container.style.height = `${CONTAINER_HEIGHT}px`;
        container.style.position = 'fixed';
        container.style.top = '0';
        container.style.left = '0';

        host = document.createElement('div');
        host.textContent = 'Click me';
        host.style.width = `${HOST_HEIGHT}px`;
        host.style.height = `${HOST_HEIGHT}px`;
        host.style.position = 'absolute';
        host.style.top = `${HOST_OFFSET}px`;
        host.style.left = `${HOST_OFFSET}px`;

        // The dialogs content dimensions exceed the container's
        const content = document.createElement('div');
        content.classList.add('dialog-content');
        content.style.width = '600px';
        content.style.height = '600px';
        content.innerHTML = 'Hello, World<br/> I am <br/> a Dialog!';

        devtoolsDialog.origin = host;
        devtoolsDialog.horizontalAlignment = Dialogs.Dialog.DialogHorizontalAlignment.CENTER;

        // Set the dialog's "window" to be the container element we just created.
        devtoolsDialog.windowBoundsService = new DialogExampleWindowBoundsServiceFactory(container);

        host.addEventListener('click', () => devtoolsDialog.setDialogVisible(true));
        devtoolsDialog.addEventListener('clickoutsidedialog', () => devtoolsDialog.setDialogVisible(false));

        container.appendChild(host);
        container.appendChild(devtoolsDialog);
        Helpers.renderElementIntoDOM(container);
        await RenderCoordinator.done();
        devtoolsDialog.appendChild(content);
      });
      it('sets the max width and height correctly when the dialog\'s content dimensions exceed the viewport and the dialog is anchored to the left',
         async () => {
           devtoolsDialog.horizontalAlignment = Dialogs.Dialog.DialogHorizontalAlignment.LEFT;
           // Open the dialog and check its position.
           Helpers.dispatchClickEvent(host);
           await RenderCoordinator.done();
           const dialog = devtoolsDialog.shadowRoot?.querySelector('dialog');
           if (!dialog) {
             assert.fail('Dialog not found');
             return;
           }
           // Test the capped dimensions
           const {left: dialogLeft, width: dialogWidth} = dialog.getBoundingClientRect();
           const dialogLeftBorderLimitPosition = dialogWidth + dialogLeft + Dialogs.Dialog.DIALOG_PADDING_FROM_WINDOW -
               2 * Dialogs.Dialog.DIALOG_SIDE_PADDING;
           assert.strictEqual(dialogLeftBorderLimitPosition, CONTAINER_WIDTH);
           assert.strictEqual(
               dialog.clientHeight,
               CONTAINER_HEIGHT - Dialogs.Dialog.DIALOG_PADDING_FROM_WINDOW - HOST_HEIGHT - HOST_OFFSET +
                   2 * Dialogs.Dialog.DIALOG_VERTICAL_PADDING);
         });
      it('sets the max width and height correctly when the dialog\'s content dimensions exceed the viewport and the dialog is anchored to the right',
         async () => {
           devtoolsDialog.horizontalAlignment = Dialogs.Dialog.DialogHorizontalAlignment.RIGHT;
           await RenderCoordinator.done();
           // Open the dialog and check its position.
           Helpers.dispatchClickEvent(host);
           await RenderCoordinator.done();
           const dialog = devtoolsDialog.shadowRoot?.querySelector('dialog');
           if (!dialog) {
             assert.fail('Dialog not found');
             return;
           }
           // Test the capped dimensions
           const dialogRight = host.getBoundingClientRect().right;
           const containerLeft = container.getBoundingClientRect().left;
           assert.strictEqual(
               dialog.clientWidth,
               (dialogRight - containerLeft) - Dialogs.Dialog.DIALOG_PADDING_FROM_WINDOW +
                   2 * Dialogs.Dialog.DIALOG_SIDE_PADDING);
         });
      it('sets the dialog\'s horizontal position correctly to prevent overlap with DevTools when alinged to the left.',
         async () => {
           devtoolsDialog.horizontalAlignment = Dialogs.Dialog.DialogHorizontalAlignment.LEFT;
           host.style.left = '-10px';

           await RenderCoordinator.done();
           // Open the dialog and check its position.
           Helpers.dispatchClickEvent(host);
           await RenderCoordinator.done();
           const dialog = devtoolsDialog.shadowRoot?.querySelector('dialog');
           if (!dialog) {
             assert.fail('Dialog not found');
             return;
           }
           // Test the capped dimensions
           const dialogLeft = dialog.getBoundingClientRect().left;
           const containerLeft = container.getBoundingClientRect().left;
           assert.isAtLeast(dialogLeft, containerLeft);
         });
      it('sets the dialog\'s horizontal position correctly to prevent overlap with DevTools when alinged to the right.',
         async () => {
           devtoolsDialog.horizontalAlignment = Dialogs.Dialog.DialogHorizontalAlignment.RIGHT;
           const containerWidth = container.clientWidth;
           host.style.left = `${containerWidth + 10}px`;

           await RenderCoordinator.done();
           // Open the dialog and check its position.
           Helpers.dispatchClickEvent(host);
           await RenderCoordinator.done();
           const dialog = devtoolsDialog.shadowRoot?.querySelector('dialog');
           if (!dialog) {
             assert.fail('Dialog not found');
             return;
           }
           // Test the capped dimensions
           const dialogRight = dialog.getBoundingClientRect().right;
           const dialogRightEdgePosition =
               dialogRight - 2 * Dialogs.Dialog.DIALOG_SIDE_PADDING - Dialogs.Dialog.DIALOG_PADDING_FROM_WINDOW / 2;
           assert.isAtMost(dialogRightEdgePosition, containerWidth);
         });
      it('sets the dialog\'s horizontal position correctly to prevent overlapping with DevTools on the right when alinged to the center.',
         async () => {
           const containerWidth = container.clientWidth;
           host.style.left = `${containerWidth + 260}px`;

           await RenderCoordinator.done();
           // Open the dialog and check its position.
           Helpers.dispatchClickEvent(host);
           await RenderCoordinator.done();
           const dialog = devtoolsDialog.shadowRoot?.querySelector('dialog');
           if (!dialog) {
             assert.fail('Dialog not found');
             return;
           }
           // Test the capped dimensions
           const dialogRight = dialog.getBoundingClientRect().right;
           const dialogRightEdgePosition =
               dialogRight - 2 * Dialogs.Dialog.DIALOG_SIDE_PADDING - Dialogs.Dialog.DIALOG_PADDING_FROM_WINDOW / 2;

           assert.isAtMost(dialogRightEdgePosition, containerWidth);
         });
      it('sets the dialog\'s horizontal position correctly to prevent overlapping with DevTools on the left when alinged to the center.',
         async () => {
           host.style.left = '-260px';

           await RenderCoordinator.done();
           // Open the dialog and check its position.
           Helpers.dispatchClickEvent(host);
           await RenderCoordinator.done();
           const dialog = devtoolsDialog.shadowRoot?.querySelector('dialog');
           if (!dialog) {
             assert.fail('Dialog not found');
             return;
           }
           // Test the capped dimensions
           const containerLeft = container.getBoundingClientRect().left;
           const dialogLeft = dialog.getBoundingClientRect().left;

           assert.isAtLeast(dialogLeft, containerLeft);
         });
    });

    // Fails on Windows only after the window-size was increased.
    it.skip(
        '[crbug.com/420924642]: updates the dialog client rect automatically when its dimensions change',
        async function() {
          host.addEventListener('click', () => dialog.setDialogVisible(true));
          const dialogContent = document.createElement('div');
          dialogContent.style.display = 'block';
          dialogContent.style.minWidth = '10px';
          dialogContent.style.minHeight = '10px';
          dialogContent.style.fontSize = '10px';
          dialogContent.innerText = 'Hello';

          dialog.append(dialogContent);
          container.appendChild(host);
          container.appendChild(dialog);
          Helpers.renderElementIntoDOM(container);
          await RenderCoordinator.done();

          Helpers.dispatchClickEvent(host);
          await RenderCoordinator.done();

          const initialWidth = dialog.getDialogBounds().width;
          const initialHeight = dialog.getDialogBounds().height;

          // Increase the font size to increase the dialog's dimensions
          dialogContent.style.fontSize = '1000px';

          // Wait for the resize handling to take effect.
          await new Promise(res => setTimeout(res, 200));

          const finalWidth = dialog.getDialogBounds().width;
          const finalHeight = dialog.getDialogBounds().height;

          assert.isAbove(finalWidth, initialWidth);
          assert.isAbove(finalHeight, initialHeight);
        });
  });

  describe('closing the dialog with the ESC key', () => {
    let devtoolsDialog: Dialogs.Dialog.Dialog;
    beforeEach(async () => {
      devtoolsDialog = new Dialogs.Dialog.Dialog();
      const container = document.createElement('div');

      const host = document.createElement('div');

      const content = document.createElement('div');
      content.innerHTML = 'Hello, World<br/> I am <br/> a Dialog!';

      devtoolsDialog.origin = host;

      host.addEventListener('click', () => devtoolsDialog.setDialogVisible(true));
      devtoolsDialog.addEventListener('clickoutsidedialog', () => devtoolsDialog.setDialogVisible(false));

      container.appendChild(host);
      container.appendChild(devtoolsDialog);
      Helpers.renderElementIntoDOM(container);
      await RenderCoordinator.done();
      devtoolsDialog.appendChild(content);

      // Open the dialog.
      Helpers.dispatchClickEvent(host);
      await RenderCoordinator.done();
    });

    it('closes the dialog by default when the ESC key is pressed', async () => {
      let dialog = devtoolsDialog.shadowRoot?.querySelector('dialog[open]');
      if (!dialog) {
        assert.fail('Dialog not found');
        return;
      }

      Helpers.dispatchKeyDownEvent(dialog, {key: Platform.KeyboardUtilities.ESCAPE_KEY, bubbles: true, composed: true});
      await RenderCoordinator.done();
      dialog = devtoolsDialog.shadowRoot?.querySelector('dialog[open]');
      if (dialog) {
        assert.fail('Dialog did not close');
        return;
      }
    });

    it('closes the dialog by default when the ESC key is pressed from document.body', async () => {
      let dialog = devtoolsDialog.shadowRoot?.querySelector('dialog[open]');
      if (!dialog) {
        assert.fail('Dialog not found');
        return;
      }
      Helpers.dispatchKeyDownEvent(
          document.body, {key: Platform.KeyboardUtilities.ESCAPE_KEY, bubbles: true, composed: true});
      await RenderCoordinator.done();
      dialog = devtoolsDialog.shadowRoot?.querySelector('dialog[open]');
      if (dialog) {
        assert.fail('Dialog did not close');
        return;
      }
    });

    it('closes the dialog by default when the ESC key is pressed anywhere within the devtools bounding element',
       async () => {
         let dialog = devtoolsDialog.shadowRoot?.querySelector('dialog[open]');
         if (!dialog) {
           assert.fail('Dialog not found');
           return;
         }

         const boundingElement = devtoolsDialog.windowBoundsService.getDevToolsBoundingElement();
         Helpers.dispatchKeyDownEvent(
             boundingElement, {key: Platform.KeyboardUtilities.ESCAPE_KEY, bubbles: true, composed: true});
         await RenderCoordinator.done();
         dialog = devtoolsDialog.shadowRoot?.querySelector('dialog[open]');
         if (dialog) {
           assert.fail('Dialog did not close');
           return;
         }
       });

    it('does not close the dialog when the ESC key is pressed if the closeOnESC prop is set to false', async () => {
      let dialog = devtoolsDialog.shadowRoot?.querySelector('dialog[open]');
      devtoolsDialog.closeOnESC = false;
      if (!dialog) {
        assert.fail('Dialog not found');
        return;
      }

      Helpers.dispatchKeyDownEvent(dialog, {key: Platform.KeyboardUtilities.ESCAPE_KEY});
      await RenderCoordinator.done();
      dialog = devtoolsDialog.shadowRoot?.querySelector('dialog[open]');
      if (!dialog) {
        assert.fail('Dialog was closed');
        return;
      }
    });
  });

  describeWithLocale('rendering', () => {
    it('do not render dialog header line if title is empty and there is no close button', async () => {
      const dialog = new Dialogs.Dialog.Dialog();
      dialog.closeButton = false;
      dialog.dialogTitle = '';
      Helpers.renderElementIntoDOM(dialog);
      await RenderCoordinator.done();

      assert.isNotNull(dialog.shadowRoot);
      const dialogHeader = dialog.shadowRoot.querySelector('.dialog-header');
      assert.exists(dialogHeader);
      assert.isEmpty(dialogHeader.children);
    });

    it('should render a close button in the dialog if closeButton is true', async () => {
      const dialog = new Dialogs.Dialog.Dialog();
      dialog.closeButton = true;
      Helpers.renderElementIntoDOM(dialog);
      await RenderCoordinator.done();

      assert.isNotNull(dialog.shadowRoot);
      const dialogHeader = dialog.shadowRoot.querySelector('.dialog-header');
      assert.exists(dialogHeader);
      const closeButton = dialogHeader.querySelector('devtools-button');
      assert.exists(closeButton);
    });

    it('should render dialog title if it is not empty', async () => {
      const dialogTitle = 'Button dialog example';
      const dialog = new Dialogs.Dialog.Dialog();
      dialog.dialogTitle = dialogTitle;
      Helpers.renderElementIntoDOM(dialog);
      await RenderCoordinator.done();

      assert.isNotNull(dialog.shadowRoot);
      const dialogHeader = dialog.shadowRoot.querySelector('.dialog-header');
      assert.exists(dialogHeader);
      const dialogTitleElement = dialogHeader.querySelector('.dialog-header-text');
      assert.exists(dialogTitleElement);
      assert.strictEqual(dialogTitleElement.textContent, dialogTitle);
    });
  });
});

describe('closing the dialog with click', () => {
  let devtoolsDialog: Dialogs.Dialog.Dialog;
  beforeEach(async () => {
    devtoolsDialog = new Dialogs.Dialog.Dialog();
    const container = document.createElement('div');

    const host = document.createElement('div');

    const content = document.createElement('div');
    content.innerHTML = 'Hello, World<br/> I am <br/> a Dialog!';

    devtoolsDialog.origin = Dialogs.Dialog.MODAL;

    host.addEventListener('click', () => devtoolsDialog.setDialogVisible(true));
    devtoolsDialog.addEventListener('clickoutsidedialog', () => devtoolsDialog.setDialogVisible(false));

    container.appendChild(host);
    container.appendChild(devtoolsDialog);
    Helpers.renderElementIntoDOM(container);
    await RenderCoordinator.done();
    devtoolsDialog.appendChild(content);

    // Open the dialog.
    Helpers.dispatchClickEvent(host);
    await RenderCoordinator.done();
  });

  it('Only closes the dialog if the click falls outside its content', async () => {
    let dialog = devtoolsDialog.shadowRoot?.querySelector('dialog[open]');
    if (!dialog) {
      assert.fail('Dialog not found');
      return;
    }
    const {x, width, bottom} = dialog.getBoundingClientRect();

    // Click just inside must not close the dialog.
    Helpers.dispatchClickEvent(dialog, {clientX: x + width / 2, clientY: bottom - 1});
    await RenderCoordinator.done();
    dialog = devtoolsDialog.shadowRoot?.querySelector('dialog[open]');
    if (!dialog) {
      assert.fail('Dialog closed when it should not');
      return;
    }
    Helpers.dispatchClickEvent(dialog, {clientX: x + width / 2, clientY: bottom + 1});
    await RenderCoordinator.done();

    // Click just outside must close the dialog.
    dialog = devtoolsDialog.shadowRoot?.querySelector('dialog[open]');
    if (dialog) {
      assert.fail('Dialog did not close');
      return;
    }
  });
});

describeWithLocale('visual appearance', () => {
  // FIXME: clean up and modularize these test helpers.
  async function renderDialogs() {
    const verticalPositions = [Dialogs.Dialog.DialogVerticalPosition.TOP, Dialogs.Dialog.DialogVerticalPosition.BOTTOM];
    const horizontalAlignments = [
      Dialogs.Dialog.DialogHorizontalAlignment.AUTO,
      Dialogs.Dialog.DialogHorizontalAlignment.LEFT,
      Dialogs.Dialog.DialogHorizontalAlignment.CENTER,
      Dialogs.Dialog.DialogHorizontalAlignment.RIGHT,
      Dialogs.Dialog.DialogHorizontalAlignment.AUTO,
    ];

    const root = document.createElement('div');
    root.id = 'root';
    const style = document.createElement('style');

    style.innerHTML = `#root {
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: stretch;
  flex-direction: column;
}

.dialog-host {
  border: 1px solid black;
  padding: 5px;
  border-radius: 3px;
  width: 70px;
}

.dialog-host-narrow {
  border: 1px solid black;
  width: 10px;
}

.row {
  display: flex;
  justify-content: space-between;
  margin: 2em 0;
}
.container {
  width: 150px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
}`;
    root.append(style);

    let i = 0;
    for (const verticalPosition of verticalPositions) {
      const row = document.createElement('div');
      row.classList.add('row');
      root.appendChild(row);
      for (const horizontalAlignment of horizontalAlignments) {
        const dialog = new Dialogs.Dialog.Dialog();

        const container = document.createElement('div');
        container.classList.add('container');
        container.id = `container-${i}`;

        const host = document.createElement('div');
        host.classList.add('dialog-host');
        host.id = `host-${i}`;
        host.textContent = 'Hover me';

        container.appendChild(host);
        row.appendChild(container);

        dialog.position = verticalPosition;
        dialog.horizontalAlignment = horizontalAlignment;
        dialog.origin = host;
        dialog.id = `dialog-${i}`;

        host.addEventListener('mouseover', () => {
          void dialog.setDialogVisible(true);
        });
        dialog.addEventListener('clickoutsidedialog', () => {
          void dialog.setDialogVisible(false);
        });

        const div = document.createElement('div');
        div.classList.add('dialog-content');
        div.style.padding = '0 1em';
        div.innerHTML =
            `Hello, World<br/>Vertical position: ${verticalPosition}<br/>Horizontal alignment: ${horizontalAlignment}`;
        dialog.appendChild(div);
        root.appendChild(dialog);
        i++;
      }
    }

    for (const verticalPosition of verticalPositions) {
      const row = document.createElement('div');
      row.classList.add('row');
      root.appendChild(row);
      for (const horizontalAlignment of horizontalAlignments) {
        const dialog = new Dialogs.Dialog.Dialog();

        const container = document.createElement('div');
        container.classList.add('container');
        container.id = `container-${i}`;

        const host = document.createElement('div');
        host.classList.add('dialog-host-narrow');
        host.id = `host-${i}`;
        host.textContent = 'H';

        container.appendChild(host);
        row.appendChild(container);

        dialog.position = verticalPosition;
        dialog.horizontalAlignment = horizontalAlignment;
        dialog.origin = host;
        dialog.id = `dialog-${i}`;

        host.addEventListener('mouseover', () => {
          void dialog.setDialogVisible(true);
        });
        dialog.addEventListener('clickoutsidedialog', () => {
          void dialog.setDialogVisible(false);
        });

        const div = document.createElement('div');
        div.classList.add('dialog-content');
        div.style.padding = '0 1em';
        div.innerHTML = `Hello, World<br/>Show connector: true<br/>Vertical position: ${
            verticalPosition}<br/>Horizontal alignment: ${horizontalAlignment}`;
        dialog.appendChild(div);
        root.appendChild(dialog);
        i++;
      }
    }

    renderDifferentModeExample();

    function renderDifferentModeExample() {
      const row = document.createElement('div');
      row.classList.add('row');
      root.appendChild(row);
      renderDialogWithTitle();
      renderDialogWithTitleAndCloseButton();
      renderDialogWithoutTitleOrCloseButton();

      function renderDialog(): Dialogs.Dialog.Dialog {
        const dialog = new Dialogs.Dialog.Dialog();

        const container = document.createElement('div');
        container.classList.add('container');
        container.id = `container-${i}`;

        const host = document.createElement('div');
        host.classList.add('dialog-host-narrow');
        host.id = `host-${i}`;
        host.textContent = 'H';

        container.appendChild(host);
        row.appendChild(container);

        dialog.position = Dialogs.Dialog.DialogVerticalPosition.BOTTOM;
        dialog.horizontalAlignment = Dialogs.Dialog.DialogHorizontalAlignment.AUTO;
        dialog.origin = host;
        dialog.id = `dialog-${i}`;

        host.addEventListener('mouseover', () => {
          void dialog.setDialogVisible(true);
        });
        dialog.addEventListener('clickoutsidedialog', () => {
          void dialog.setDialogVisible(false);
        });
        const div = document.createElement('div');
        div.classList.add('dialog-content');
        div.style.padding = '0 var(--sys-size-8)';

        div.innerHTML = 'Hello, World';
        dialog.appendChild(div);
        root.appendChild(dialog);
        i++;

        return dialog;
      }

      function renderDialogWithTitle() {
        const dialog = renderDialog();
        dialog.dialogTitle = 'title';
      }

      function renderDialogWithTitleAndCloseButton() {
        const dialog = renderDialog();
        dialog.dialogTitle = 'title';
        dialog.closeButton = true;
      }

      function renderDialogWithoutTitleOrCloseButton() {
        renderDialog();
      }
    }

    Helpers.renderElementIntoDOM(root);

    return root;
  }

  async function openDialog(dialogNumber: number) {
    const dialog = document.querySelector(`#dialog-${dialogNumber}`);
    await (dialog as Dialogs.Dialog.Dialog).setDialogVisible(true);
    await Helpers.raf();
    return dialog as Dialogs.Dialog.Dialog;
  }

  it('renders the dialog at the top left properly', async () => {
    await renderDialogs();
    await openDialog(1);
    await assertScreenshot('dialog/top-left-open.png');
  });

  it('renders a dialog at the bottom with automatic horizontal alignment properly', async () => {
    await renderDialogs();
    await openDialog(5);
    await assertScreenshot('dialog/bottom-auto-open.png');
  });

  it('renders the dialog at the bottom center properly', async () => {
    await renderDialogs();
    await openDialog(7);
    await assertScreenshot('dialog/bottom-center-open.png');
  });

  it('renders a dialog for super narrow origin at the top with automatic horizontal alignment properly', async () => {
    await renderDialogs();
    await openDialog(20);
    await assertScreenshot('dialog/narrow-top-auto-open.png');
  });

  it('sets open attribute when the dialog is opened', async () => {
    await renderDialogs();
    const dialog = await openDialog(2);
    assert.isTrue(dialog.hasAttribute('open'));
  });

  it('removed open attribute when the dialog is hidden', async () => {
    await renderDialogs();
    const dialog = await openDialog(2);
    assert.isTrue(dialog.hasAttribute('open'));
    await dialog.setDialogVisible(false);
    await RenderCoordinator.done();
    assert.isFalse(dialog.hasAttribute('open'));
  });
});
