// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import * as Platform from '../../../core/platform/platform.js';
import * as Lit from '../../lit/lit.js';
import * as RenderCoordinator from '../render_coordinator/render_coordinator.js';
import linkifierImplStyles from './linkifierImpl.css.js';
import * as LinkifierUtils from './LinkifierUtils.js';
const { html } = Lit;
export class LinkifierClick extends Event {
    data;
    static eventName = 'linkifieractivated';
    constructor(data) {
        super(LinkifierClick.eventName, {
            bubbles: true,
            composed: true,
        });
        this.data = data;
        this.data = data;
    }
}
export class Linkifier extends HTMLElement {
    #shadow = this.attachShadow({ mode: 'open' });
    #url = Platform.DevToolsPath.EmptyUrlString;
    #lineNumber;
    #columnNumber;
    #linkText;
    #title;
    set data(data) {
        this.#url = data.url;
        this.#lineNumber = data.lineNumber;
        this.#columnNumber = data.columnNumber;
        this.#linkText = data.linkText;
        this.#title = data.title;
        if (!this.#url) {
            throw new Error('Cannot construct a Linkifier without providing a valid string URL.');
        }
        void this.#render();
    }
    cloneNode(deep) {
        const node = super.cloneNode(deep);
        node.data = {
            url: this.#url,
            lineNumber: this.#lineNumber,
            columnNumber: this.#columnNumber,
            linkText: this.#linkText,
            title: this.#title
        };
        return node;
    }
    #onLinkActivation(event) {
        event.preventDefault();
        const linkifierClickEvent = new LinkifierClick({
            url: this.#url,
            lineNumber: this.#lineNumber,
            columnNumber: this.#columnNumber,
        });
        this.dispatchEvent(linkifierClickEvent);
    }
    async #render() {
        const linkText = this.#linkText ?? LinkifierUtils.linkText(this.#url, this.#lineNumber);
        // Disabled until https://crbug.com/1079231 is fixed.
        await RenderCoordinator.write(() => {
            // clang-format off
            // eslint-disable-next-line @devtools/no-a-tags-in-lit
            Lit.render(html `
        <style>${linkifierImplStyles}</style>
        <a class="link" href=${this.#url} @click=${this.#onLinkActivation} title=${Lit.Directives.ifDefined(this.#title)}>
          <slot>${linkText}</slot>
        </a>`, this.#shadow, { host: this });
            // clang-format on
        });
    }
}
customElements.define('devtools-linkifier', Linkifier);
//# sourceMappingURL=LinkifierImpl.js.map