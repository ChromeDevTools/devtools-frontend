// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
Emulation.InspectedPagePlaceholder = class extends UI.Widget {
  constructor() {
    super(true);
    this.registerRequiredCSS('emulation/inspectedPagePlaceholder.css');
    UI.zoomManager.addEventListener(UI.ZoomManager.Events.ZoomChanged, this.onResize, this);
    this.restoreMinimumSize();
  }

  /**
   * @override
   */
  onResize() {
    if (this._updateId)
      this.element.window().cancelAnimationFrame(this._updateId);
    this._updateId = this.element.window().requestAnimationFrame(this.update.bind(this));
  }

  restoreMinimumSize() {
    this.setMinimumSize(150, 150);
  }

  clearMinimumSize() {
    this.setMinimumSize(1, 1);
  }

  _dipPageRect() {
    var zoomFactor = UI.zoomManager.zoomFactor();
    var rect = this.element.getBoundingClientRect();
    var bodyRect = this.element.ownerDocument.body.getBoundingClientRect();

    var left = Math.max(rect.left * zoomFactor, bodyRect.left * zoomFactor);
    var top = Math.max(rect.top * zoomFactor, bodyRect.top * zoomFactor);
    var bottom = Math.min(rect.bottom * zoomFactor, bodyRect.bottom * zoomFactor);
    var right = Math.min(rect.right * zoomFactor, bodyRect.right * zoomFactor);

    return {x: left, y: top, width: right - left, height: bottom - top};
  }

  update() {
    delete this._updateId;
    var rect = this._dipPageRect();
    var bounds = {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      height: Math.max(1, Math.round(rect.height)),
      width: Math.max(1, Math.round(rect.width))
    };
    this.dispatchEventToListeners(Emulation.InspectedPagePlaceholder.Events.Update, bounds);
  }
};

/** @enum {symbol} */
Emulation.InspectedPagePlaceholder.Events = {
  Update: Symbol('Update')
};
