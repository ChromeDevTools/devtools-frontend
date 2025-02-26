// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../components/icon_button/icon_button.js';

import type * as IconButton from '../../components/icon_button/icon_button.js';
import * as Lit from '../../lit/lit.js';

import markdownImageStylesRaw from './markdownImage.css.js';
import {getMarkdownImage, type ImageData} from './MarkdownImagesMap.js';

// TODO(crbug.com/391381439): Fully migrate off of constructed style sheets.
const markdownImageStyles = new CSSStyleSheet();
markdownImageStyles.replaceSync(markdownImageStylesRaw.cssContent);

const {html, Directives: {ifDefined}} = Lit;

export interface MarkdownImageData {
  key: string;
  title: string;
}

/**
 * Component to render images from parsed markdown.
 * Parsed images from markdown are not directly rendered, instead they have to be added to the MarkdownImagesMap.ts.
 * This makes sure that all icons/images are accounted for in markdown.
 */
export class MarkdownImage extends HTMLElement {

  readonly #shadow = this.attachShadow({mode: 'open'});
  #imageData?: ImageData;
  #imageTitle?: string;

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [markdownImageStyles];
  }

  set data(data: MarkdownImageData) {
    const {key, title} = data;
    const markdownImage = getMarkdownImage(key);
    this.#imageData = markdownImage;
    this.#imageTitle = title;
    this.#render();
  }

  #getIconComponent(): Lit.TemplateResult {
    if (!this.#imageData) {
      return html``;
    }
    const {src, color, width = '100%', height = '100%'} = this.#imageData;
    return html`
      <devtools-icon .data=${{iconPath: src, color, width, height} as IconButton.Icon.IconData}></devtools-icon>
    `;
  }

  #getImageComponent(): Lit.TemplateResult {
    if (!this.#imageData) {
      return html``;
    }
    const {src, width = '100%', height = '100%'} = this.#imageData;
    return html`
      <img class="markdown-image" src=${src} alt=${ifDefined(this.#imageTitle)} width=${width} height=${height} />
    `;
  }

  #render(): void {
    if (!this.#imageData) {
      return;
    }
    const {isIcon} = this.#imageData;
    const imageComponent = isIcon ? this.#getIconComponent() : this.#getImageComponent();
    Lit.render(imageComponent, this.#shadow, {host: this});
  }
}

customElements.define('devtools-markdown-image', MarkdownImage);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-markdown-image': MarkdownImage;
  }
}
