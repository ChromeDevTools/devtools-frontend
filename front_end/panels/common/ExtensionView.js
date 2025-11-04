// Copyright 2012 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
const { render, html, Directives: { ref } } = Lit;
const DEFAULT_VIEW = (input, output, target) => {
    // clang-format off
    render(html `<iframe
    ${ref(element => { output.iframe = element; })}
    src=${input.src}
    class=${input.className}
    @load=${input.onLoad}></iframe>`, target);
    // clang-format on
};
export class ExtensionView extends UI.Widget.Widget {
    #server;
    #id;
    #src;
    #className;
    #iframe;
    #frameIndex;
    #view;
    constructor(server, id, src, className, view = DEFAULT_VIEW) {
        super();
        this.#view = view;
        this.#server = server;
        this.#src = src;
        this.#className = className;
        this.#id = id;
        this.setHideOnDetach(); // Override
        void this.performUpdate();
    }
    performUpdate() {
        const output = {};
        this.#view({
            src: this.#src,
            className: this.#className,
            onLoad: this.onLoad.bind(this),
        }, output, this.element);
        if (output.iframe) {
            this.#iframe = output.iframe;
        }
    }
    wasShown() {
        super.wasShown();
        if (typeof this.#frameIndex === 'number') {
            this.#server.notifyViewShown(this.#id, this.#frameIndex);
        }
    }
    willHide() {
        super.willHide();
        if (typeof this.#frameIndex === 'number') {
            this.#server.notifyViewHidden(this.#id);
        }
    }
    onLoad() {
        if (!this.#iframe) {
            return;
        }
        const frames = window.frames;
        this.#frameIndex = Array.prototype.indexOf.call(frames, this.#iframe.contentWindow);
        if (this.isShowing()) {
            this.#server.notifyViewShown(this.#id, this.#frameIndex);
        }
    }
}
export class ExtensionNotifierView extends UI.Widget.VBox {
    server;
    id;
    constructor(server, id) {
        super();
        this.server = server;
        this.id = id;
    }
    wasShown() {
        super.wasShown();
        this.server.notifyViewShown(this.id);
    }
    willHide() {
        super.willHide();
        this.server.notifyViewHidden(this.id);
    }
}
//# sourceMappingURL=ExtensionView.js.map