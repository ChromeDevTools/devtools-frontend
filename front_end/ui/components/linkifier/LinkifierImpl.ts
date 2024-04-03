// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../core/platform/platform.js';
import * as LitHtml from '../../lit-html/lit-html.js';
import * as Coordinator from '../render_coordinator/render_coordinator.js';

import linkifierImplStyles from './linkifierImpl.css.js';
import * as LinkifierUtils from './LinkifierUtils.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

export interface LinkifierData {
  url: Platform.DevToolsPath.UrlString;
  lineNumber?: number;
  columnNumber?: number;
  linkText?: string;
}

export class LinkifierClick extends Event {
  static readonly eventName = 'linkifieractivated';
  constructor(public data: LinkifierData) {
    super(LinkifierClick.eventName, {
      bubbles: true,
      composed: true,
    });
    this.data = data;
  }
}

export class Linkifier extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-linkifier`;

  readonly #shadow = this.attachShadow({mode: 'open'});
  #url: Platform.DevToolsPath.UrlString = Platform.DevToolsPath.EmptyUrlString;
  #lineNumber?: number;
  #columnNumber?: number;
  #linkText?: string;

  set data(data: LinkifierData) {
    this.#url = data.url;
    this.#lineNumber = data.lineNumber;
    this.#columnNumber = data.columnNumber;
    this.#linkText = data.linkText;

    if (!this.#url) {
      throw new Error('Cannot construct a Linkifier without providing a valid string URL.');
    }

    void this.#render();
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [linkifierImplStyles];
  }

  #onLinkActivation(event: Event): void {
    event.preventDefault();
    const linkifierClickEvent = new LinkifierClick({
      url: this.#url,
      lineNumber: this.#lineNumber,
      columnNumber: this.#columnNumber,
    });
    this.dispatchEvent(linkifierClickEvent);
  }

  async #render(): Promise<void> {
    const linkText = this.#linkText ?? LinkifierUtils.linkText(this.#url, this.#lineNumber);
    // Disabled until https://crbug.com/1079231 is fixed.
    await coordinator.write(() => {
      // clang-format off
      // eslint-disable-next-line rulesdir/ban_a_tags_in_lit_html
      LitHtml.render(LitHtml.html`<a class="link" href=${this.#url} @click=${this.#onLinkActivation}><slot>${linkText}</slot></a>`, this.#shadow, { host: this});
      // clang-format on
    });
  }
}

customElements.define('devtools-linkifier', Linkifier);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-linkifier': Linkifier;
  }
}
