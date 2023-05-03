// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as Helpers from '../../../../../test/unittests/front_end/helpers/DOMHelpers.js';  // eslint-disable-line rulesdir/es_modules_import
import * as Coordinator from '../../../../../front_end/ui/components/render_coordinator/render_coordinator.js';
import * as Dialogs from '../../../../../front_end/ui/components/dialogs/dialogs.js';

import {
  describeWithLocale,
} from '../../../../../test/unittests/front_end/helpers/EnvironmentHelpers.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

describeWithLocale('ShortcutDialog', () => {
  async function getShortcutDialog(open?: boolean) {
    const shortcutDialog = new Dialogs.ShortcutDialog.ShortcutDialog();
    shortcutDialog.data = {shortcuts: [{title: 'Shortcut Title', bindings: ['Ctrl+E']}], open};
    Helpers.renderElementIntoDOM(shortcutDialog);
    await coordinator.done();

    return shortcutDialog;
  }

  function getDialogFromShortcutDialog(shortcutDialog: Dialogs.ShortcutDialog.ShortcutDialog) {
    Helpers.assertShadowRoot(shortcutDialog.shadowRoot);
    const dialog = shortcutDialog.shadowRoot.querySelector('devtools-dialog');
    if (!dialog) {
      assert.fail('devtools-dialog not found');
    }
    Helpers.assertElement(dialog, HTMLElement);
    return dialog;
  }

  it('should display dialog on initial render when provided prop', async () => {
    const shortcutDialog = await getShortcutDialog(true);
    const dialog = getDialogFromShortcutDialog(shortcutDialog);

    assert.isTrue(dialog.hasAttribute('open'));
  });

  it('should not display dialog on initial render by default', async () => {
    const shortcutDialog = await getShortcutDialog();
    const dialog = getDialogFromShortcutDialog(shortcutDialog);

    assert.isFalse(dialog.hasAttribute('open'));
  });
});
