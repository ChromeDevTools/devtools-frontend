// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {html} from '../../ui/lit/lit.js';

import * as UI from './legacy.js';

describeWithEnvironment('Dialog', () => {
  describe('Dialog stacking', () => {
    it('should hide an existing dialog when a new one is shown without stacking', () => {
      const dialog1 = new UI.Dialog.Dialog();
      dialog1.show();
      assert.isTrue(dialog1.isShowing(), 'dialog1 should be showing');

      const dialog2 = new UI.Dialog.Dialog();
      dialog2.show();
      assert.isTrue(dialog2.isShowing(), 'dialog2 should be showing');
      assert.isFalse(dialog1.isShowing(), 'dialog1 should be hidden');
      assert.strictEqual(UI.Dialog.Dialog.getInstance(), dialog2, 'dialog2 should be the current instance');
    });

    it('should keep the first dialog visible when a second one is stacked on top', () => {
      const dialog1 = new UI.Dialog.Dialog();
      dialog1.show();
      assert.isTrue(dialog1.isShowing(), 'dialog1 should be showing');

      const dialog2 = new UI.Dialog.Dialog();
      // Show the second dialog stacked on top of the first one.
      dialog2.show(undefined, /* stack */ true);
      assert.isTrue(dialog1.isShowing(), 'dialog1 should still be showing');
      assert.isTrue(dialog2.isShowing(), 'dialog2 should be showing');
      assert.strictEqual(UI.Dialog.Dialog.getInstance(), dialog2, 'dialog2 should be the current instance');
    });

    it('should only hide the top-most dialog on an outside click when stacked', () => {
      const dialog1 = new UI.Dialog.Dialog();
      dialog1.show();

      const dialog2 = new UI.Dialog.Dialog();
      dialog2.show(undefined, /* stack */ true);

      // We are clicking on the document body, which should be considered
      // an outside click for the top-most dialog.
      dialog2.element.ownerDocument.body.dispatchEvent(new MouseEvent('mousedown', {bubbles: true, cancelable: true}));

      assert.isFalse(dialog2.isShowing(), 'dialog2 should be hidden after outside click');
      assert.isTrue(dialog1.isShowing(), 'dialog1 should still be showing');
      assert.strictEqual(UI.Dialog.Dialog.getInstance(), dialog1, 'dialog1 should now be the current instance');
    });

    it('should only hide the top-most dialog on Escape key press when stacked', () => {
      const dialog1 = new UI.Dialog.Dialog();
      dialog1.show();

      const dialog2 = new UI.Dialog.Dialog();
      dialog2.show(undefined, /* stack */ true);

      // The keydown handler is on the document.
      dialog2.contentElement.ownerDocument.dispatchEvent(
          new KeyboardEvent('keydown', {keyCode: UI.KeyboardShortcut.Keys.Esc.code}));

      assert.isFalse(dialog2.isShowing(), 'dialog2 should be hidden after Escape key');
      assert.isTrue(dialog1.isShowing(), 'dialog1 should still be showing');
      assert.strictEqual(UI.Dialog.Dialog.getInstance(), dialog1, 'dialog1 should now be the current instance');
    });
  });

  describe('DialogWidget', () => {
    it('shows and hides the underlying dialog when open property changes', async () => {
      const widget = new UI.Dialog.DialogWidget();
      renderElementIntoDOM(widget);
      await widget.updateComplete;

      assert.isFalse(UI.Dialog.Dialog.hasInstance(), 'Underlying dialog should not be shown initially');

      widget.open = true;
      await widget.updateComplete;
      assert.isTrue(UI.Dialog.Dialog.hasInstance(), 'Underlying dialog should be shown when open is true');

      widget.open = false;
      await widget.updateComplete;
      assert.isFalse(UI.Dialog.Dialog.hasInstance(), 'Underlying dialog should be hidden when open is false');
    });

    it('updates open property and dispatches HIDDEN event via ObjectWrapper when dialog is closed', async () => {
      let hiddenDispatched = false;
      const widget = new UI.Dialog.DialogWidget();
      widget.addEventListener(UI.Dialog.Events.HIDDEN, () => {
        hiddenDispatched = true;
      });
      renderElementIntoDOM(widget);
      await widget.updateComplete;

      widget.open = true;
      await widget.updateComplete;
      assert.isTrue(UI.Dialog.Dialog.hasInstance());

      const dialogInstance = UI.Dialog.Dialog.getInstance();
      assert.exists(dialogInstance);
      dialogInstance.hide();
      await widget.updateComplete;

      assert.isFalse(widget.open, 'open property should be false when dialog is hidden');
      assert.isTrue(hiddenDispatched, 'HIDDEN event should be dispatched via ObjectWrapper on widget');
    });

    it('renders content directly into the dialog contentElement when shown', async () => {
      const widget = new UI.Dialog.DialogWidget();
      renderElementIntoDOM(widget);

      widget.content = html`<div id="test-div">hello world</div>`;
      widget.open = true;
      await widget.updateComplete;

      const dialogInstance = UI.Dialog.Dialog.getInstance();
      assert.exists(dialogInstance);
      const renderedElement = dialogInstance.contentElement.querySelector('#test-div');
      assert.exists(renderedElement);
      assert.strictEqual(renderedElement.textContent, 'hello world');
    });
  });
});
