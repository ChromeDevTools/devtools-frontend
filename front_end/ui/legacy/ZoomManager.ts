// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../../core/common/common.js';
import type * as Host from '../../core/host/host.js'; // eslint-disable-line no-unused-vars

let zoomManagerInstance: ZoomManager|undefined;

export class ZoomManager extends Common.ObjectWrapper.ObjectWrapper {
  _frontendHost: Host.InspectorFrontendHostAPI.InspectorFrontendHostAPI;
  _zoomFactor: number;

  private constructor(window: Window, frontendHost: Host.InspectorFrontendHostAPI.InspectorFrontendHostAPI) {
    super();
    this._frontendHost = frontendHost;
    this._zoomFactor = this._frontendHost.zoomFactor();
    window.addEventListener('resize', this._onWindowResize.bind(this), true);
  }

  static instance(opts: {
    forceNew: boolean|null,
    win: Window|null,
    frontendHost: Host.InspectorFrontendHostAPI.InspectorFrontendHostAPI|null,
  } = {forceNew: null, win: null, frontendHost: null}): ZoomManager {
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

  static removeInstance(): void {
    zoomManagerInstance = undefined;
  }

  zoomFactor(): number {
    return this._zoomFactor;
  }

  cssToDIP(value: number): number {
    return value * this._zoomFactor;
  }

  dipToCSS(valueDIP: number): number {
    return valueDIP / this._zoomFactor;
  }

  _onWindowResize(): void {
    const oldZoomFactor = this._zoomFactor;
    this._zoomFactor = this._frontendHost.zoomFactor();
    if (oldZoomFactor !== this._zoomFactor) {
      this.dispatchEventToListeners(Events.ZoomChanged, {from: oldZoomFactor, to: this._zoomFactor});
    }
  }
}

export const enum Events {
  ZoomChanged = 'ZoomChanged',
}
