// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */

import * as Platform from '../../../core/platform/platform.js';
import * as UIHelpers from '../../helpers/helpers.js';
import {html, render} from '../../lit/lit.js';
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
  readonly #shadow = this.attachShadow({mode: 'open'});

  static readonly observedAttributes = ['href', 'jslogcontext'];

  connectedCallback(): void {
    if (!this.hasAttribute('tabindex')) {
      this.setAttribute('tabindex', '0');
    }
    this.#setDefaultTitle();
    this.#onJslogContextChange();

    this.setAttribute('role', 'link');
    this.setAttribute('target', '_blank');

    this.addEventListener('click', this.#onClick);
    this.addEventListener('keydown', this.#onKeyDown);
    this.#render();
  }

  disconnectedCallback(): void {
    this.removeEventListener('click', this.#onClick);
    this.removeEventListener('keydown', this.#onKeyDown);
  }

  #handleOpeningLink(event: Event): void {
    const href = this.href as Platform.DevToolsPath.UrlString | undefined;
    if (!href) {
      return;
    }

    UIHelpers.openInNewTab(href);

    event.consume();
  }

  get href(): string|null {
    return this.getAttribute('href');
  }

  set href(href: Platform.DevToolsPath.UrlString) {
    this.setAttribute('href', href);
  }

  get jslogContext(): string|null {
    return this.getAttribute('jslogcontext');
  }

  set jslogContext(jslogContext: string) {
    this.setAttribute('jslogcontext', jslogContext);
  }

  #onJslogContextChange(): void {
    let jslogContext = this.jslogContext;
    if (!jslogContext) {
      try {
        if (!this.href) {
          return;
        }
        const urlForContext = new URL(this.href);
        urlForContext.search = '';
        jslogContext = Platform.StringUtilities.toKebabCase(urlForContext.toString());
      } catch {
        return;
      }
    }

    const jslog = VisualLogging.link().track({click: true, keydown: 'Enter|Space'}).context(jslogContext);
    this.setAttribute('jslog', jslog.toString());
  }

  #setDefaultTitle(): void {
    if (!this.hasAttribute('title') && this.href) {
      this.setAttribute('title', this.href);
    }
  }

  attributeChangedCallback(
      name: string,
      oldValue: string|null,
      newValue: string|null,
      ): void {
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

  #onClick = (event: Event): void => {
    this.#handleOpeningLink(event);
  };

  #onKeyDown = (event: KeyboardEvent): void => {
    if (Platform.KeyboardUtilities.isEnterOrSpaceKey(event)) {
      this.#handleOpeningLink(event);
    }
  };

  #render(): void {
    // clang-format off
    render(
      html`<style>
          ${linkStyles}
        </style><slot></slot>`,
      this.#shadow,
      { host: this },
    );
    // clang-format on
  }
}

customElements.define('devtools-link', Link);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-link': Link;
  }
}
