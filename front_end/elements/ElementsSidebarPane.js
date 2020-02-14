// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as SDK from '../sdk/sdk.js';  // eslint-disable-line no-unused-vars
import * as UI from '../ui/ui.js';

import {ComputedStyleModel, Events} from './ComputedStyleModel.js';

/**
 * @unrestricted
 */
export class ElementsSidebarPane extends UI.Widget.VBox {
  /**
   * @param {boolean=} delegatesFocus
   */
  constructor(delegatesFocus) {
    super(true, delegatesFocus);
    this.element.classList.add('flex-none');
    this._computedStyleModel = new ComputedStyleModel();
    this._computedStyleModel.addEventListener(Events.ComputedStyleChanged, this.onCSSModelChanged, this);

    this._updateThrottler = new Common.Throttler.Throttler(100);
    this._updateWhenVisible = false;
  }

  /**
   * @return {?SDK.DOMModel.DOMNode}
   */
  node() {
    return this._computedStyleModel.node();
  }

  /**
   * @return {?SDK.CSSModel.CSSModel}
   */
  cssModel() {
    return this._computedStyleModel.cssModel();
  }

  /**
   * @protected
   * @return {!Promise.<?>}
   */
  doUpdate() {
    return Promise.resolve();
  }

  update() {
    this._updateWhenVisible = !this.isShowing();
    if (this._updateWhenVisible) {
      return;
    }
    this._updateThrottler.schedule(innerUpdate.bind(this));

    /**
     * @return {!Promise.<?>}
     * @this {ElementsSidebarPane}
     */
    function innerUpdate() {
      return this.isShowing() ? this.doUpdate() : Promise.resolve();
    }
  }

  /**
   * @override
   */
  wasShown() {
    super.wasShown();
    if (this._updateWhenVisible) {
      this.update();
    }
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  onCSSModelChanged(event) {
  }
}
