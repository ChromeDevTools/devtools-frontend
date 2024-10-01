// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/check_component_naming, rulesdir/no_underscored_properties, rulesdir/ban_style_tags_in_lit_html, rulesdir/ban_a_tags_in_lit_html, rulesdir/lit_html_host_this */
import {html, render} from 'lit-html';

export type CreditsItemData = {
  title: string,
  homepage: string,
  license: string,
};

function onClick(e: KeyboardEvent): void {
  const {target} = e;
  if (target instanceof HTMLButtonElement) {
    const {previousElementSibling} = target;
    if (previousElementSibling instanceof HTMLInputElement) {
      previousElementSibling.checked = !previousElementSibling.checked;
      target.ariaExpanded = `${previousElementSibling.checked}`;
    }
  }
}

export class CreditsItem extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});
  #data: Readonly<CreditsItemData> = {title: '', homepage: '', license: ''};

  constructor() {
    super();
  }

  get data(): Readonly<CreditsItemData> {
    return this.#data;
  }

  set data(data: Readonly<CreditsItemData>) {
    this.#data = data;
    this.render();
  }

  private render(): void {
    const output = html`
    <style>
      a {
        color: rgb(18 78 156);
      }

      .product {
        background-color: rgb(232, 240, 254);
        color: rgb(18 78 156);
        border-radius: 5px;
        margin-top: 16px;
        overflow: auto;
        padding: 2px;
      }

      .product .title {
        float: left;
        font-size: 110%;
        font-weight: bold;
        margin: 3px;
      }

      .product .homepage {
        color: rgb(18 78 156);
        float: right;
        margin: 3px;
        text-align: right;
      }

      .product .homepage::before {
        content: " - ";
      }

      .product .show {
        color: rgb(18 78 156);
        float: right;
        margin-top: 3px;
        text-align: right;
        text-decoration: underline;
        padding: 0;
        font: inherit;
        border: none;
        background-color: transparent;
      }

      .licence {
        border-radius: 3px;
        clear: both;
        display: none;
        padding: 16px;
      }

      .licence pre {
        white-space: pre-wrap;
      }

      input + button + div {
        display: none;
      }

      input + button::after {
        content: "show license";
        cursor: pointer;
      }

      input:checked + button + div {
        display: block;
      }
    </style>
    <div class=product>
      <span class=title>${this.data.title}</span>
      <span class=homepage><a href=${this.data.homepage}>homepage</a></span>
      <input type=checkbox hidden="" id=show-license>
      <button class=show tabindex="1" @click=${onClick} aria-expanded="false"></button>
      <div class=licence><pre>${this.data.license}</pre></div>
    </div>`;
    render(output, this.#shadow, {
      eventContext: this,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-cxx-debugging-credits-item': CreditsItem;
  }
}

customElements.define('devtools-cxx-debugging-credits-item', CreditsItem);
