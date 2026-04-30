// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Bindings from '../../models/bindings/bindings.js';
import * as UI from '../../ui/legacy/legacy.js';
const DEFAULT_VIEW = (_input, _output, _target) => { };
export class SymbolizedErrorWidget extends UI.Widget.Widget {
    #error;
    #view;
    #ignoreListManager;
    constructor(element, view = DEFAULT_VIEW) {
        super(element);
        this.#view = view;
    }
    set ignoreListManager(ignoreListManager) {
        this.#ignoreListManager = ignoreListManager;
        this.requestUpdate();
    }
    get ignoreListManager() {
        return this.#ignoreListManager;
    }
    set error(error) {
        this.#error?.removeEventListener("UPDATED" /* Bindings.SymbolizedError.Events.UPDATED */, this.requestUpdate, this);
        this.#error = error;
        if (this.isShowing()) {
            this.#error?.addEventListener("UPDATED" /* Bindings.SymbolizedError.Events.UPDATED */, this.requestUpdate, this);
        }
        this.requestUpdate();
    }
    get error() {
        return this.#error;
    }
    wasShown() {
        super.wasShown();
        this.#error?.addEventListener("UPDATED" /* Bindings.SymbolizedError.Events.UPDATED */, this.requestUpdate, this);
        this.requestUpdate();
    }
    willHide() {
        super.willHide();
        this.#error?.removeEventListener("UPDATED" /* Bindings.SymbolizedError.Events.UPDATED */, this.requestUpdate, this);
    }
    performUpdate() {
        if (!this.#error) {
            return;
        }
        const input = {
            error: this.#error,
            ignoreListManager: this.#ignoreListManager,
        };
        this.#view(input, {}, this.contentElement);
    }
}
//# sourceMappingURL=SymbolizedErrorWidget.js.map