// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
WebInspector.ThrottledWidget = class extends WebInspector.VBox {
  /**
   * @param {boolean=} isWebComponent
   */
  constructor(isWebComponent) {
    super(isWebComponent);
    this._updateThrottler = new WebInspector.Throttler(100);
    this._updateWhenVisible = false;
  }

  /**
   * @protected
   * @return {!Promise<?>}
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
     * @this {WebInspector.ThrottledWidget}
     * @return {!Promise<?>}
     */
    function innerUpdate() {
      if (this.isShowing())
        return this.doUpdate();
      this._updateWhenVisible = true;
      return Promise.resolve();
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
};
