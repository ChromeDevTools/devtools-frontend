// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-lit-render-outside-of-view */

import * as Platform from '../../../core/platform/platform.js';
import * as Lit from '../../lit/lit.js';
import * as RenderCoordinator from '../render_coordinator/render_coordinator.js';

import linkifierImplStyles from './linkifierImpl.css.js';
import * as LinkifierUtils from './LinkifierUtils.js';

const {html} = Lit;

export interface LinkifierData {
  url: Platform.DevToolsPath.UrlString;
  lineNumber?: number;
  columnNumber?: number;
  linkText?: string;
  title?: string;
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
  readonly #shadow = this.attachShadow({mode: 'open'});
  #url: Platform.DevToolsPath.UrlString = Platform.DevToolsPath.EmptyUrlString;
  #lineNumber?: number;
  #columnNumber?: number;
  #linkText?: string;
  #title?: string;

  set data(data: LinkifierData) {
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

  override cloneNode(deep?: boolean): Node {
    const node = super.cloneNode(deep) as Linkifier;
    node.data = {
      url: this.#url,
      lineNumber: this.#lineNumber,
      columnNumber: this.#columnNumber,
      linkText: this.#linkText,
      title: this.#title
    };
    return node;
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
    await RenderCoordinator.write(() => {
      // clang-format off
      // eslint-disable-next-line rulesdir/no-a-tags-in-lit
      Lit.render(html`
        <style>${linkifierImplStyles}</style>
        <a class="link" href=${this.#url} @click=${this.#onLinkActivation} title=${Lit.Directives.ifDefined(this.#title) as string}>
          <slot>${linkText}</slot>
        </a>`,
        this.#shadow, { host: this});
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
