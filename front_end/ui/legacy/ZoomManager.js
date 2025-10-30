// Copyright 2014 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
let zoomManagerInstance;
export class ZoomManager extends Common.ObjectWrapper.ObjectWrapper {
    frontendHost;
    #zoomFactor;
    constructor(window, frontendHost) {
        super();
        this.frontendHost = frontendHost;
        this.#zoomFactor = this.frontendHost.zoomFactor();
        window.addEventListener('resize', this.onWindowResize.bind(this), true);
    }
    static instance(opts = { forceNew: null, win: null, frontendHost: null }) {
        const { forceNew, win, frontendHost } = opts;
        if (!zoomManagerInstance || forceNew) {
            if (!win || !frontendHost) {
                throw new Error(`Unable to create zoom manager: window and frontendHost must be provided: ${new Error().stack}`);
            }
            zoomManagerInstance = new ZoomManager(win, frontendHost);
        }
        return zoomManagerInstance;
    }
    static removeInstance() {
        zoomManagerInstance = undefined;
    }
    zoomFactor() {
        return this.#zoomFactor;
    }
    cssToDIP(value) {
        return value * this.#zoomFactor;
    }
    dipToCSS(valueDIP) {
        return valueDIP / this.#zoomFactor;
    }
    onWindowResize() {
        const oldZoomFactor = this.#zoomFactor;
        this.#zoomFactor = this.frontendHost.zoomFactor();
        if (oldZoomFactor !== this.#zoomFactor) {
            this.dispatchEventToListeners("ZoomChanged" /* Events.ZOOM_CHANGED */, { from: oldZoomFactor, to: this.#zoomFactor });
        }
    }
}
//# sourceMappingURL=ZoomManager.js.map