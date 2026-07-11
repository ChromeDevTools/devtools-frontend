// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Bindings from '../../models/bindings/bindings.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import { ConsoleViewMessage } from './ConsoleViewMessage.js';
const { html, render } = Lit;
function renderHeader(content, isCause) {
    if (isCause) {
        return html `<div class="symbolized-error-header"><span>Caused by: </span><span class="error-message-text">${content}</span></div>`;
    }
    return html `<span class="error-message-text">${content}</span>`;
}
function formatName(frame) {
    const isInline = frame.isInline;
    let name = isInline ? (frame.name || '') : (frame.rawName || frame.name || '');
    const shouldAppendMethodAlias = !isInline && frame.methodName && name && name !== frame.methodName &&
        !name.endsWith('.' + frame.methodName) && !name.endsWith(' ' + frame.methodName);
    if (shouldAppendMethodAlias) {
        name += ` [as ${frame.methodName}]`;
    }
    return name;
}
function renderLinkElement(frame, options) {
    if (frame.url || frame.uiSourceCode) {
        const link = Components.Linkifier.Linkifier.linkifyStackTraceFrame(frame, options);
        link.tabIndex = -1;
        return link;
    }
    return html `<span>&lt;anonymous&gt;</span>`;
}
function renderEvalOrigin(frame, options) {
    const name = formatName(frame);
    const linkElement = renderLinkElement(frame, options);
    const asyncPrefix = frame.isAsync ? 'async ' : '';
    const constructorPrefix = frame.isConstructor ? 'new ' : '';
    if (frame.isEval) {
        const evalOrigin = frame.evalOrigin ? renderEvalOrigin(frame.evalOrigin, options) : '<anonymous>';
        if (name) {
            return html `${asyncPrefix}${constructorPrefix}eval at ${name} (${evalOrigin})`;
        }
        return html `${asyncPrefix}${constructorPrefix}eval at ${evalOrigin}`;
    }
    if (name) {
        return html `${asyncPrefix}${constructorPrefix}eval at ${name} (${linkElement})`;
    }
    return html `${asyncPrefix}${constructorPrefix}eval at ${linkElement}`;
}
function renderFramePrefix(frame, options) {
    const asyncPrefix = frame.isAsync ? 'async ' : '';
    if (frame.promiseIndex !== undefined) {
        const name = frame.name || 'Promise.all';
        return html `${asyncPrefix}${name} (index ${frame.promiseIndex})`;
    }
    const constructorPrefix = frame.isConstructor ? 'new ' : '';
    const name = formatName(frame);
    if (frame.isEval) {
        const evalOrigin = frame.evalOrigin ? renderEvalOrigin(frame.evalOrigin, options) : '<anonymous>';
        if (name) {
            return html `${asyncPrefix}${constructorPrefix}${name} (${evalOrigin}, `;
        }
        return html `${asyncPrefix}${constructorPrefix}${evalOrigin}, `;
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
    const name = formatName(frame);
    if (name) {
        return html `)`;
    }
    return Lit.nothing;
}
const DEFAULT_VIEW = (input, _output, target) => {
    const renderError = (error, isCause) => {
        if (error instanceof Bindings.SymbolizedError.UnparsableError) {
            const fragment = ConsoleViewMessage.linkifyWithCustomLinkifier(error.errorStack, (text, url, lineNumber, columnNumber) => {
                const options = { text, lineNumber, columnNumber, ignoreListManager: input.ignoreListManager };
                const linkElement = Components.Linkifier.Linkifier.linkifyURL(url, options);
                linkElement.tabIndex = -1;
                return linkElement;
            });
            const header = renderHeader(fragment, isCause);
            return html `
        <span class=${isCause ? 'console-message-stack-trace-wrapper' : ''}>${header}</span>
      `;
        }
        const linkOptions = {
            showColumnNumber: true,
            maxLength: UI.UIUtils.MaxLengthForDisplayedURLsInConsole,
            ignoreListManager: input.ignoreListManager,
        };
        let headerContent = html `${error.message}`;
        if (error.syntaxErrorLocation) {
            const linkElement = Components.Linkifier.Linkifier.linkifyUILocation(error.syntaxErrorLocation, linkOptions);
            linkElement.tabIndex = -1;
            headerContent = html `${error.message} (at ${linkElement})`;
        }
        const header = renderHeader(headerContent, isCause);
        const syncFrames = error.stackTrace.syncFragment.frames;
        // clang-format off
        return html `
      <span class=${isCause ? 'console-message-stack-trace-wrapper' : ''}
      >${header}${syncFrames.length > 0 ? '\n' : ''}${syncFrames.map((frame, i) => {
            const isBuiltin = frame.promiseIndex !== undefined || (!frame.url && !frame.uiSourceCode);
            const linkElement = frame.promiseIndex !== undefined ? Lit.nothing : renderLinkElement(frame, linkOptions);
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
    get linkElements() {
        return [...this.contentElement.querySelectorAll('.devtools-link')];
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