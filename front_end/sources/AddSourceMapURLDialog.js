// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as UI from '../ui/ui.js';

/**
 * @unrestricted
 */
export class AddSourceMapURLDialog extends UI.Widget.HBox {
  /**
   * @param {function(string):void} callback
   */
  constructor(callback) {
    super(/* isWebComponent */ true);
    this.registerRequiredCSS('sources/dialog.css');
    this.contentElement.createChild('label').textContent = Common.UIString.UIString('Source map URL: ');

    this._input = UI.UIUtils.createInput('add-source-map', 'text');
    this._input.addEventListener('keydown', this._onKeyDown.bind(this), false);
    this.contentElement.appendChild(this._input);

    const addButton = UI.UIUtils.createTextButton(ls`Add`, this._apply.bind(this));
    this.contentElement.appendChild(addButton);

    this._dialog = new UI.Dialog.Dialog();
    this._dialog.setSizeBehavior(UI.GlassPane.SizeBehavior.MeasureContent);
    this._dialog.setDefaultFocusedElement(this._input);

    this._callback = callback;
  }

  /**
   * @override
   */
  show() {
    super.show(this._dialog.contentElement);
    // UI.Dialog extends GlassPane and overrides the `show` method with a wider
    // accepted type. However, TypeScript uses the supertype declaration to
    // determine the full type, which requires a `!Document`.
    // @ts-ignore
    this._dialog.show();
  }

  /**
   * @param {string} value
   */
  _done(value) {
    this._dialog.hide();
    this._callback(value);
  }

  _apply() {
    this._done(this._input.value);
  }

  /**
   * @param {!Event} event
   */
  _onKeyDown(event) {
    if (isEnterKey(event)) {
      event.consume(true);
      this._apply();
    }
  }
}
