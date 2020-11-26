// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Bindings from '../../bindings/bindings.js';
import * as LitHtml from '../../third_party/lit-html/lit-html.js';

export interface LinkifierData {
  url: string;
  lineNumber?: number;
  columnNumber?: number;
}

export class LinkifierClick extends Event {
  data: LinkifierData;

  constructor(data: LinkifierData) {
    super('linkifier-click', {
      bubbles: true,
      composed: true,
    });
    this.data = data;
  }
}

export class Linkifier extends HTMLElement {
  private readonly shadow = this.attachShadow({mode: 'open'});
  private url: string = '';
  private lineNumber?: number;
  private columnNumber?: number;

  set data(data: LinkifierData) {
    this.url = data.url;
    this.lineNumber = data.lineNumber;
    this.columnNumber = data.columnNumber;

    this.render();
  }

  private onLinkActivation(event: Event) {
    event.preventDefault();
    this.dispatchEvent(new LinkifierClick({
      url: this.url,
      lineNumber: this.lineNumber,
      columnNumber: this.columnNumber,
    }));
  }

  private linkText(): string {
    if (this.url) {
      const displayName = Bindings.ResourceUtils.displayNameForURL(this.url);
      let text = `${displayName}`;
      if (typeof this.lineNumber !== 'undefined') {
        text += `:${this.lineNumber + 1}`;
      }
      return text;
    }

    throw new Error('New linkifier component error: don\'t know how to generate link text for given arguments');
  }

  private render() {
    if (!this.url) {
      throw new Error('Cannot construct a Linkifier without providing a valid string URL.');
    }
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return LitHtml.render(LitHtml.html`
      <style>
         .link:link, .link:visited {
            color: var(--link-color);
            text-decoration: underline;
            cursor: pointer;
         }
      </style>
      <a class="link" href=${this.url} @click=${this.onLinkActivation}>${this.linkText()}</a>
    `, this.shadow, { eventContext: this});
    // clang-format on
  }
}

customElements.define('devtools-linkifier', Linkifier);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-linkifier': Linkifier;
  }
}
