// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../legacy/legacy.js'; // Required for <x-link>.

import * as Lit from '../../lit/lit.js';
import * as VisualLogging from '../../visual_logging/visual_logging.js';

import markdownLinkStylesRaw from './markdownLink.css.js';
import {getMarkdownLink} from './MarkdownLinksMap.js';

// TODO(crbug.com/391381439): Fully migrate off of constructed style sheets.
const markdownLinkStyles = new CSSStyleSheet();
markdownLinkStyles.replaceSync(markdownLinkStylesRaw.cssContent);

const {html} = Lit;

export interface MarkdownLinkData {
  key: string;
  title: string;
}

/**
 * Component to render link from parsed markdown.
 * Parsed links from markdown are not directly rendered, instead they have to be added to the <key, link> map in MarkdownLinksMap.ts.
 * This makes sure that all links are accounted for and no bad links are introduced to devtools via markdown.
 */
export class MarkdownLink extends HTMLElement {

  readonly #shadow = this.attachShadow({mode: 'open'});
  #linkText: string = '';
  #linkUrl: string = '';

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [markdownLinkStyles];
  }

  set data(data: MarkdownLinkData) {
    const {key, title} = data;
    const markdownLink = getMarkdownLink(key);
    this.#linkText = title;
    this.#linkUrl = markdownLink;
    this.#render();
  }

  #render(): void {
    // clang-format off
    const output = html`<x-link class="devtools-link" href=${this.#linkUrl} jslog=${VisualLogging.link().track({click: true})}
    >${this.#linkText}</x-link>`;
    Lit.render(output, this.#shadow, {host: this});
    // clang-format on
  }
}

customElements.define('devtools-markdown-link', MarkdownLink);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-markdown-link': MarkdownLink;
  }
}
