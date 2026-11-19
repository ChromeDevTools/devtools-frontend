// Copyright 2012 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as UI from '../../ui/legacy/legacy.js';
import { Directives, html, render } from '../../ui/lit/lit.js';
const { ref } = Directives;
export const DEFAULT_VIEW = (input, output, target) => {
    // clang-format off
    render(html `<iframe
    ${ref(element => {
        output.getContentWindow = element instanceof HTMLIFrameElement ? () => element.contentWindow : undefined;
    })}
    src=${input.src}
    allow="language-model; summarizer; translator; language-detector; writer; rewriter; proofreader; clipboard-write; autoplay"
    class=${input.className}
    @load=${input.onLoad}></iframe>`, target);
    // clang-format on
};
export class ExtensionView extends UI.Widget.Widget {
    #server;
    #id = '';
    #src = '';
    #className = '';
    #getContentWindow;
    #hasRendered = false;
    #frameIndex;
    #isNotifiedShown = false;
    #view;
    constructor(element, view = DEFAULT_VIEW) {
        super(element);
        this.#view = view;
        this.setHideOnDetach(); // Override
    }
    set data({ server, id, src, className }) {
        const targetChanged = server !== this.#server || id !== this.#id;
        const srcChanged = src !== this.#src;
        const classNameChanged = className !== this.#className;
        if (!targetChanged && !srcChanged && !classNameChanged) {
            return;
        }
        if ((targetChanged || srcChanged) && this.#isNotifiedShown && this.#server && this.#id) {
            this.#isNotifiedShown = false;
            this.#server.notifyViewHidden(this.#id);
        }
        this.#server = server;
        this.#id = id;
        this.#className = className;
        if (srcChanged) {
            this.#src = src;
            this.#frameIndex = undefined;
        }
        if (srcChanged || classNameChanged) {
            this.requestUpdate();
        }
        if (this.isShowing() && typeof this.#frameIndex === 'number' && !this.#isNotifiedShown && this.#server &&
            this.#id) {
            this.#isNotifiedShown = true;
            this.#server.notifyViewShown(this.#id, this.#frameIndex);
        }
    }
    performUpdate() {
        this.#hasRendered = true;
        const output = {};
        this.#view({
            src: this.#src,
            className: this.#className,
            onLoad: this.onLoad.bind(this),
        }, output, this.element);
        this.#getContentWindow = output.getContentWindow;
    }
    wasShown() {
        if (!this.#hasRendered) {
            this.requestUpdate();
        }
        super.wasShown();
        if (typeof this.#frameIndex === 'number' && !this.#isNotifiedShown && this.#server && this.#id) {
            this.#isNotifiedShown = true;
            this.#server.notifyViewShown(this.#id, this.#frameIndex);
        }
    }
    willHide() {
        super.willHide();
        if (typeof this.#frameIndex === 'number' && this.#isNotifiedShown && this.#server && this.#id) {
            this.#isNotifiedShown = false;
            this.#server.notifyViewHidden(this.#id);
        }
    }
    onLoad() {
        const contentWindow = this.#getContentWindow?.();
        if (!contentWindow) {
            return;
        }
        const frames = window.frames;
        this.#frameIndex = Array.prototype.indexOf.call(frames, contentWindow);
        if (this.isShowing() && !this.#isNotifiedShown && this.#server && this.#id) {
            this.#isNotifiedShown = true;
            this.#server.notifyViewShown(this.#id, this.#frameIndex);
        }
    }
}
export class ExtensionNotifierView extends UI.Widget.VBox {
    #server;
    #id = '';
    #isNotifiedShown = false;
    set data({ server, id }) {
        if (server === this.#server && id === this.#id) {
            return;
        }
        if (this.#isNotifiedShown && this.#server && this.#id) {
            this.#isNotifiedShown = false;
            this.#server.notifyViewHidden(this.#id);
        }
        this.#server = server;
        this.#id = id;
        if (this.isShowing() && !this.#isNotifiedShown && this.#server && this.#id) {
            this.#isNotifiedShown = true;
            this.#server.notifyViewShown(this.#id);
        }
    }
    wasShown() {
        super.wasShown();
        if (!this.#isNotifiedShown && this.#server && this.#id) {
            this.#isNotifiedShown = true;
            this.#server.notifyViewShown(this.#id);
        }
    }
    willHide() {
        super.willHide();
        if (this.#isNotifiedShown && this.#server && this.#id) {
            this.#isNotifiedShown = false;
            this.#server.notifyViewHidden(this.#id);
        }
    }
}
export class ExtensionIframe {
    #descriptor;
    #iframe;
    #isShowing = false;
    #isLoaded = false;
    constructor(descriptor) {
        this.#descriptor = descriptor;
        // We are creating a single iframe here.
        /* eslint-disable-next-line @devtools/no-imperative-dom-api */
        this.#iframe = document.createElement('iframe');
        this.#iframe.src = descriptor.pagePath;
        this.#iframe.onload = this.#onIframeLoad;
    }
    #onIframeLoad = () => {
        this.#isLoaded = true;
        if (this.#isShowing) {
            this.#descriptor.onShown();
        }
    };
    show() {
        if (this.#isShowing) {
            return;
        }
        this.#isShowing = true;
        if (this.#isLoaded) {
            this.#descriptor.onShown();
        }
    }
    hide() {
        if (!this.#isShowing) {
            return;
        }
        this.#isShowing = false;
        this.#isLoaded = false;
        this.#descriptor.onHidden();
    }
    frame() {
        return this.#iframe;
    }
}
//# sourceMappingURL=ExtensionView.js.map