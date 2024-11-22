// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Helpers from '../../../testing/DOMHelpers.js';  // eslint-disable-line rulesdir/es_modules_import
import {
  describeWithLocale,
} from '../../../testing/EnvironmentHelpers.js';
import * as Coordinator from '../render_coordinator/render_coordinator.js';

import * as Dialogs from './dialogs.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

describeWithLocale('ShortcutDialog', () => {
  async function getShortcutDialog(open?: boolean, prependedElement?: HTMLElement) {
    const shortcutDialog = new Dialogs.ShortcutDialog.ShortcutDialog();
    if (prependedElement) {
      shortcutDialog.prependElement(prependedElement);
    }
    shortcutDialog.data = {shortcuts: [{title: 'Shortcut Title', bindings: ['Ctrl+E']}], open};
    Helpers.renderElementIntoDOM(shortcutDialog);
    await coordinator.done();

    return shortcutDialog;
  }

  function getDialogFromShortcutDialog(shortcutDialog: Dialogs.ShortcutDialog.ShortcutDialog) {
    assert.isNotNull(shortcutDialog.shadowRoot);
    const dialog = shortcutDialog.shadowRoot.querySelector('devtools-button-dialog');
    if (!dialog) {
      assert.fail('devtools-button-dialog not found');
    }
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
});
