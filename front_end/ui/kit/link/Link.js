// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import * as Platform from '../../../core/platform/platform.js';
import * as UIHelpers from '../../helpers/helpers.js';
import { html, render } from '../../lit/lit.js';
import * as VisualLogging from '../../visual_logging/visual_logging.js';
import linkStyles from './link.css.js';
/**
 * A simple icon component to handle external links.
 * Handles both normal links `https://example.com`
 * and chrome links `chrome://flags`.
 *
 * html`
 *   <devtools-link href=""></devtools-link>
 * `;
 * ```
 *
 * @property href - The href to the place the link wants to navigate
 * @property jslogContext - The `"jslogcontext"` attribute is reflected as a property.
 *
 * @attribute href - The href to the place the link wants to navigate
 * @attribute jslogcontext -
 * The context for the `jslog` attribute. A `jslog`
 * attribute is generated automatically with the
 * provided context.
 */
export class Link extends HTMLElement {
    #shadow = this.attachShadow({ mode: 'open' });
    static observedAttributes = ['href', 'jslogcontext'];
    connectedCallback() {
        if (!this.hasAttribute('tabindex')) {
            this.setAttribute('tabindex', '0');
        }
        this.#setDefaultTitle();
        this.setAttribute('role', 'link');
        this.setAttribute('target', '_blank');
        this.addEventListener('click', this.#onClick);
        this.addEventListener('keydown', this.#onKeyDown);
        this.#render();
    }
    disconnectedCallback() {
        this.removeEventListener('click', this.#onClick);
        this.removeEventListener('keydown', this.#onKeyDown);
    }
    #handleOpeningLink(event) {
        const href = this.href;
        if (!href) {
            return;
        }
        UIHelpers.openInNewTab(href);
        event.consume();
    }
    get href() {
        return this.getAttribute('href');
    }
    set href(href) {
        this.setAttribute('href', href);
    }
    get jslogContext() {
        return this.getAttribute('jslogcontext');
    }
    set jslogContext(jslogContext) {
        this.setAttribute('jslogcontext', jslogContext);
    }
    #onJslogContextChange() {
        const href = this.href;
        if (!href) {
            throw new Error('`href` is a required attribute.');
        }
        const urlForContext = new URL(href);
        urlForContext.search = '';
        const jslogContext = Platform.StringUtilities.toKebabCase(this.jslogContext ?? urlForContext.toString());
        const jslog = VisualLogging.link().track({ click: true, keydown: 'Enter|Space' }).context(jslogContext);
        this.setAttribute('jslog', jslog.toString());
    }
    #setDefaultTitle() {
        if (!this.hasAttribute('title') && this.href) {
            this.setAttribute('title', this.href);
        }
    }
    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            return;
        }
        if (name === 'jslogcontext') {
            return this.#onJslogContextChange();
        }
        if (name === 'href') {
            this.#setDefaultTitle();
        }
        this.#render();
    }
    #onClick = (event) => {
        this.#handleOpeningLink(event);
    };
    #onKeyDown = (event) => {
        if (Platform.KeyboardUtilities.isEnterOrSpaceKey(event)) {
            this.#handleOpeningLink(event);
        }
    };
    #render() {
        // clang-format off
        render(html `<style>
          ${linkStyles}
        </style><slot></slot>`, this.#shadow, { host: this });
        // clang-format on
    }
}
customElements.define('devtools-link', Link);
//# sourceMappingURL=Link.js.map