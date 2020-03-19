// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as Host from '../host/host.js';  // eslint-disable-line no-unused-vars

/**
 * @type {!ZoomManager}
 */
let zoomManagerInstance;

/**
 * @unrestricted
 */
export class ZoomManager extends Common.ObjectWrapper.ObjectWrapper {
  /**
   * @private
   * @param {!Window} window
   * @param {!Host.InspectorFrontendHostAPI.InspectorFrontendHostAPI} frontendHost
   */
  constructor(window, frontendHost) {
    super();
    this._frontendHost = frontendHost;
    this._zoomFactor = this._frontendHost.zoomFactor();
    window.addEventListener('resize', this._onWindowResize.bind(this), true);
  }

  /**
   * @param {{forceNew: ?boolean, win: ?Window, frontendHost: ?Host.InspectorFrontendHostAPI.InspectorFrontendHostAPI}} opts
   */
  static instance(opts = {forceNew: null, win: null, frontendHost: null}) {
    const {forceNew, win, frontendHost} = opts;
    if (!zoomManagerInstance || forceNew) {
      if (!win || !frontendHost) {
        throw new Error(
            `Unable to create zoom manager: window and frontendHost must be provided: ${new Error().stack}`);
      }

      zoomManagerInstance = new ZoomManager(win, frontendHost);
    }

    return zoomManagerInstance;
  }

  /**
   * @return {number}
   */
  zoomFactor() {
    return this._zoomFactor;
  }

  /**
   * @param {number} value
   * @return {number}
   */
  cssToDIP(value) {
    return value * this._zoomFactor;
  }

  /**
   * @param {number} valueDIP
   * @return {number}
   */
  dipToCSS(valueDIP) {
    return valueDIP / this._zoomFactor;
  }

  _onWindowResize() {
    const oldZoomFactor = this._zoomFactor;
    this._zoomFactor = this._frontendHost.zoomFactor();
    if (oldZoomFactor !== this._zoomFactor) {
      this.dispatchEventToListeners(Events.ZoomChanged, {from: oldZoomFactor, to: this._zoomFactor});
    }
  }
}

/** @enum {symbol} */
export const Events = {
  ZoomChanged: Symbol('ZoomChanged')
};
