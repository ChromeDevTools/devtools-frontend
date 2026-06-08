// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Bindings from '../../models/bindings/bindings.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
const { html, render } = Lit;
function renderHeader(content, isCause) {
    if (isCause) {
        return html `<div class="symbolized-error-header"><span>Caused by: </span><span class="error-message-text">${content}</span></div>`;
    }
    return html `<span class="error-message-text">${content}</span>`;
}
function renderFramePrefix(frame, _options) {
    const asyncPrefix = frame.isAsync ? 'async ' : '';
    if (frame.promiseIndex !== undefined) {
        const name = frame.name || 'Promise.all';
        return html `${asyncPrefix}${name} (index ${frame.promiseIndex})`;
    }
    const constructorPrefix = frame.isConstructor ? 'new ' : '';
    let name = frame.name || '';
    const isInline = Boolean(frame.rawName) && frame.name !== frame.rawName;
    if (!isInline && frame.methodName && name && name !== frame.methodName && !name.endsWith('.' + frame.methodName) &&
        !name.endsWith(' ' + frame.methodName)) {
        name += ` [as ${frame.methodName}]`;
    }
    if (name) {
        return html `${asyncPrefix}${constructorPrefix}${name} (`;
    }
    return html `${asyncPrefix}${constructorPrefix}`;
}
function renderFrameSuffix(frame) {
    if (frame.promiseIndex !== undefined) {
        return Lit.nothing;
    }
    if (frame.name) {
        return html `)`;
    }
    return Lit.nothing;
}
const DEFAULT_VIEW = (input, _output, target) => {
    const renderError = (error, isCause) => {
        if (!(error instanceof Bindings.SymbolizedError.SymbolizedErrorObject)) {
            console.error('SymbolizedErrorWidget received an unsupported error type:', error);
            return Lit.nothing;
        }
        const linkOptions = {
            showColumnNumber: true,
            inlineFrameIndex: 0,
            maxLength: UI.UIUtils.MaxLengthForDisplayedURLsInConsole,
            ignoreListManager: input.ignoreListManager,
        };
        const headerContent = html `${error.message}`;
        const header = renderHeader(headerContent, isCause);
        const syncFrames = error.stackTrace.syncFragment.frames;
        // clang-format off
        return html `
      <span class=${isCause ? 'console-message-stack-trace-wrapper' : ''}
      >${header}${syncFrames.length > 0 ? '\n' : ''}${syncFrames.map((frame, i) => {
            let linkElement = Lit.nothing;
            let isBuiltin = false;
            if (frame.promiseIndex !== undefined) {
                // Promise.all doesn't have a linkable location.
                isBuiltin = true;
            }
            else if (frame.url || frame.uiSourceCode) {
                const link = Components.Linkifier.Linkifier.linkifyStackTraceFrame(frame, linkOptions);
                link.tabIndex = -1;
                linkElement = link;
            }
            else {
                linkElement = html `<span>&lt;anonymous&gt;</span>`;
                isBuiltin = true;
            }
            const newline = i < error.stackTrace.syncFragment.frames.length - 1 ? '\n' : '';
            const frameClass = isBuiltin ? 'formatted-builtin-stack-frame' : 'formatted-stack-frame';
            return html `
            <span class=${frameClass}>${'    at '}${renderFramePrefix(frame, linkOptions)}${linkElement}${renderFrameSuffix(frame)}${newline}</span>
          `;
        })}
      </span>
      ${error.cause ? renderError(error.cause, true) : Lit.nothing}
    `;
        // clang-format on
    };
    // clang-format off
    render(html `<span class="symbolized-error-widget">${renderError(input.error, false)}</span>`, target);
    // clang-format on
};
export class SymbolizedErrorWidget extends UI.Widget.Widget {
    #error;
    #view;
    #ignoreListManager;
    constructor(element, view = DEFAULT_VIEW) {
        const host = element || document.createElement('span');
        super(host, { classes: ['symbolized-error-widget-host'] });
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