// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {assertScreenshot, raf, renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {
  setupLocaleHooks,
} from '../../../testing/LocaleHelpers.js';
import * as RenderCoordinator from '../render_coordinator/render_coordinator.js';

import * as Dialogs from './dialogs.js';

describe('ShortcutDialog', () => {
  setupLocaleHooks();
  async function getShortcutDialog(open?: boolean, prependedElement?: HTMLElement, buttonAlignRight = true) {
    const container = document.createElement('div');
    container.style.width = '600px';
    container.style.height = '600px';
    container.style.display = 'flex';
    container.style.padding = '2rem';
    container.style.justifyContent = buttonAlignRight ? 'flex-end' : 'flex-start';

    const shortcutDialog = new Dialogs.ShortcutDialog.ShortcutDialog();
    if (prependedElement) {
      shortcutDialog.prependElement(prependedElement);
    }
    shortcutDialog.data = {
      shortcuts: [
        {
          title: 'Shortcut Title',
          rows: [
            [{key: 'Cmd'}, {joinText: '+'}, {key: 'W'}],
            {footnote: 'close the window'},
          ],
        },
        {
          title: 'Second Shortcut Title',
          rows: [[{key: 'F8'}]],
        },
      ],
      open: false,
    };

    // Render the ShortcutDialog in order to create the shadow root.
    container.append(shortcutDialog);
    renderElementIntoDOM(container, {includeCommonStyles: true});
    await RenderCoordinator.done();
    await raf();

    // Set the dialog boundaries to match the container. Otherwise, the
    // boundaries match the view port and the dialog always renders to the right.
    const buttonDialog = getDialogFromShortcutDialog(shortcutDialog);
    const dialog = buttonDialog?.shadowRoot?.querySelector('devtools-dialog');
    dialog?.setBoundingElementForTesting(container);
    if (open) {
      shortcutDialog.data = {...shortcutDialog.data, open: true};
    }

    await RenderCoordinator.done();
    await raf();

    return shortcutDialog;
  }

  function getDialogFromShortcutDialog(shortcutDialog: Dialogs.ShortcutDialog.ShortcutDialog) {
    assert.isNotNull(shortcutDialog.shadowRoot);
    const dialog = shortcutDialog.shadowRoot.querySelector('devtools-button-dialog');
    assert.isOk(dialog, 'devtools-button-dialog not found');
    assert.instanceOf(dialog, HTMLElement);
    return dialog;
  }

  it('prepends provided element to the dialog content', async () => {
    const prependedElement = document.createElement('div');
    prependedElement.classList.add('prepended-element');

    const shortcutDialog = await getShortcutDialog(true, prependedElement);
    const dialog = getDialogFromShortcutDialog(shortcutDialog);
    const prependedElementInShortcutDialog = dialog.querySelector('div.prepended-element');

    assert.instanceOf(prependedElementInShortcutDialog, HTMLDivElement);
  });

  it('renders the shortcut dialog button', async () => {
    await getShortcutDialog();
    await assertScreenshot('dialog/shortcut_dialog_closed.png');
  });

  it('renders the shortcut dialog', async () => {
    await getShortcutDialog(true);
    await assertScreenshot('dialog/shortcut_dialog_open.png');
  });

  it('renders the shortcut dialog to the right when the button is on the left side', async () => {
    await getShortcutDialog(true, undefined, false);
    await assertScreenshot('dialog/shortcut_dialog_open_to_the_right.png');
  });
});
