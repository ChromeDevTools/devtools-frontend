// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Helpers from '../../../testing/DOMHelpers.js';  // eslint-disable-line rulesdir/es-modules-import
import {assertScreenshot, raf} from '../../../testing/DOMHelpers.js';
import {
  describeWithLocale,
} from '../../../testing/EnvironmentHelpers.js';
import * as RenderCoordinator from '../render_coordinator/render_coordinator.js';

import * as Dialogs from './dialogs.js';

describeWithLocale('ShortcutDialog', () => {
  async function getShortcutDialog(open?: boolean, prependedElement?: HTMLElement) {
    const container = document.createElement('div');
    container.style.width = '600px';
    container.style.height = '600px';
    container.style.display = 'flex';
    container.style.padding = '2rem';
    container.style.justifyContent = 'flex-end';

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
          ]
        },
        {
          title: 'Second Shortcut Title',
          rows: [[{key: 'F8'}]],
        }
      ],
      open
    };
    container.append(shortcutDialog);
    Helpers.renderElementIntoDOM(container);
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
});
