// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertScreenshot, renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import * as Buttons from '../buttons/buttons.js';
import * as RenderCoordinator from '../render_coordinator/render_coordinator.js';

import * as Dialogs from './dialogs.js';

describeWithEnvironment('ButtonDialog', () => {
  const containerCss = `
    width: 800px;
    height: 400px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
  `;

  async function getButtonDialog(fieldToTest?: Partial<Dialogs.ButtonDialog.ButtonDialogData>) {
    const defaultMinimumButtonDialogData: Dialogs.ButtonDialog.ButtonDialogData = {
      openOnRender: false,
      iconName: 'help',
      variant: Buttons.Button.Variant.TOOLBAR,
      dialogTitle: '',
    };
    const buttonDialog = new Dialogs.ButtonDialog.ButtonDialog();
    buttonDialog.data = Object.assign(defaultMinimumButtonDialogData, fieldToTest);

    return buttonDialog;
  }

  function getButtonFromButtonDialog(buttonDialog: Dialogs.ButtonDialog.ButtonDialog): Buttons.Button.Button {
    assert.isNotNull(buttonDialog.shadowRoot);
    const button = buttonDialog.shadowRoot.querySelector('devtools-button');
    assert.isOk(button, 'devtools-button not found');
    assert.instanceOf(button, HTMLElement);
    return button;
  }

  function getDialogFromButtonDialog(buttonDialog: Dialogs.ButtonDialog.ButtonDialog): Dialogs.Dialog.Dialog {
    assert.isNotNull(buttonDialog.shadowRoot);
    const dialog = buttonDialog.shadowRoot.querySelector('devtools-dialog');
    assert.isOk(dialog, 'devtools-dialog not found');
    assert.instanceOf(dialog, HTMLElement);
    return dialog;
  }

  it('should display dialog on initial render when provided prop', async () => {
    const buttonDialog = await getButtonDialog({
      openOnRender: true,
    });
    renderElementIntoDOM(buttonDialog);
    await RenderCoordinator.done();
    const dialog = getDialogFromButtonDialog(buttonDialog);

    assert.isTrue(dialog.hasAttribute('open'));
  });

  it('should not display dialog on initial render by default', async () => {
    const buttonDialog = await getButtonDialog({
      openOnRender: false,
    });
    renderElementIntoDOM(buttonDialog);
    await RenderCoordinator.done();
    const dialog = getDialogFromButtonDialog(buttonDialog);

    assert.isFalse(dialog.hasAttribute('open'));
  });

  it('Opens if button is clicked', async () => {
    const buttonDialog = await getButtonDialog({});
    renderElementIntoDOM(buttonDialog);
    await RenderCoordinator.done();
    const dialog = getDialogFromButtonDialog(buttonDialog);
    assert.isFalse(dialog.hasAttribute('open'));

    const button = getButtonFromButtonDialog(buttonDialog);
    button.click();
    await RenderCoordinator.done();
    assert.isTrue(dialog.hasAttribute('open'));
  });

  function prepareButtonDialogForScreenshot(): {
    buttonDialog: Dialogs.ButtonDialog.ButtonDialog,
    container: HTMLDivElement,
  } {
    const buttonDialog = new Dialogs.ButtonDialog.ButtonDialog();
    buttonDialog.data = {
      openOnRender: false,
      variant: Buttons.Button.Variant.TOOLBAR,
      iconName: 'help',
      position: Dialogs.Dialog.DialogVerticalPosition.AUTO,
      horizontalAlignment: Dialogs.Dialog.DialogHorizontalAlignment.AUTO,
      closeOnESC: true,
      closeOnScroll: false,
      closeButton: true,
      dialogTitle: 'Button dialog example',
    };

    const div = document.createElement('div');
    div.style.padding = '0 var(--sys-size-8)';
    div.createChild('div').innerText = 'Hello, World';
    div.createChild('div').innerText = 'This is a super long content. This is a super long content';
    buttonDialog.appendChild(div);

    const container = document.createElement('div');
    container.style.cssText = containerCss;
    container.appendChild(buttonDialog);

    return {buttonDialog, container};
  }

  it('renders the dialog button (with the dialog closed)', async () => {
    const {container} = prepareButtonDialogForScreenshot();

    renderElementIntoDOM(container);
    await RenderCoordinator.done();
    await assertScreenshot('dialog/button_dialog_closed.png');
  });

  it('renders the button dialog', async () => {
    const {buttonDialog, container} = prepareButtonDialogForScreenshot();

    renderElementIntoDOM(container);
    await RenderCoordinator.done();

    const dialog = getDialogFromButtonDialog(buttonDialog);
    const animated = new Promise(resolve => {
      dialog.addEventListener(Dialogs.Dialog.AnimationEndedEvent.eventName, resolve, {
        once: true,
      });
    });

    const button = getButtonFromButtonDialog(buttonDialog);
    button.click();
    await animated;
    await RenderCoordinator.done();

    await assertScreenshot('dialog/button_dialog_open.png');
  });

  it('click the close button and close the button dialog', async () => {
    const {buttonDialog, container} = prepareButtonDialogForScreenshot();

    renderElementIntoDOM(container);
    await RenderCoordinator.done();

    const dialog = getDialogFromButtonDialog(buttonDialog);
    const animated = new Promise(resolve => {
      dialog.addEventListener(Dialogs.Dialog.AnimationEndedEvent.eventName, resolve, {
        once: true,
      });
    });

    const button = getButtonFromButtonDialog(buttonDialog);
    button.click();
    await animated;
    await RenderCoordinator.done();

    const closeButton = dialog.shadowRoot?.querySelector('devtools-button');
    assert.isOk(closeButton);
    closeButton.click();
    await RenderCoordinator.done();

    await assertScreenshot('dialog/button_dialog_closed_after_open.png');
  });
});
