// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import type * as Host from '../../core/host/host.js';

let zoomManagerInstance: ZoomManager|undefined;

export class ZoomManager extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  private frontendHost: Host.InspectorFrontendHostAPI.InspectorFrontendHostAPI;
  private zoomFactorInternal: number;

  private constructor(window: Window, frontendHost: Host.InspectorFrontendHostAPI.InspectorFrontendHostAPI) {
    super();
    this.frontendHost = frontendHost;
    this.zoomFactorInternal = this.frontendHost.zoomFactor();
    window.addEventListener('resize', this.onWindowResize.bind(this), true);
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
    return this.zoomFactorInternal;
  }

  cssToDIP(value: number): number {
    return value * this.zoomFactorInternal;
  }

  dipToCSS(valueDIP: number): number {
    return valueDIP / this.zoomFactorInternal;
  }

  private onWindowResize(): void {
    const oldZoomFactor = this.zoomFactorInternal;
    this.zoomFactorInternal = this.frontendHost.zoomFactor();
    if (oldZoomFactor !== this.zoomFactorInternal) {
      this.dispatchEventToListeners(Events.ZoomChanged, {from: oldZoomFactor, to: this.zoomFactorInternal});
    }
  }
}

export const enum Events {
  ZoomChanged = 'ZoomChanged',
}

export interface ZoomChangedEvent {
  from: number;
  to: number;
}

export type EventTypes = {
  [Events.ZoomChanged]: ZoomChangedEvent,
};
