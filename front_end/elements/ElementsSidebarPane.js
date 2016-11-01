// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
WebInspector.ElementsSidebarPane = class extends WebInspector.VBox {
  constructor() {
    super();
    this.element.classList.add('flex-none');
    this._computedStyleModel = new WebInspector.ComputedStyleModel();
    this._computedStyleModel.addEventListener(
        WebInspector.ComputedStyleModel.Events.ComputedStyleChanged, this.onCSSModelChanged, this);

    this._updateThrottler = new WebInspector.Throttler(100);
    this._updateWhenVisible = false;
  }

  /**
   * @return {?WebInspector.DOMNode}
   */
  node() {
    return this._computedStyleModel.node();
  }

  /**
   * @return {?WebInspector.CSSModel}
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
    if (this._updateWhenVisible)
      return;
    this._updateThrottler.schedule(innerUpdate.bind(this));

    /**
     * @return {!Promise.<?>}
     * @this {WebInspector.ElementsSidebarPane}
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
    if (this._updateWhenVisible)
      this.update();
  }

  /**
   * @param {!WebInspector.Event} event
   */
  onCSSModelChanged(event) {
  }
};
