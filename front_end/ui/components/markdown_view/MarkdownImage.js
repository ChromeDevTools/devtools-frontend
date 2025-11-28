// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view, @devtools/enforce-custom-element-definitions-location */
import '../../kit/kit.js';
import * as Lit from '../../lit/lit.js';
import markdownImageStyles from './markdownImage.css.js';
import { getMarkdownImage } from './MarkdownImagesMap.js';
const { html, Directives: { ifDefined } } = Lit;
/**
 * Component to render images from parsed markdown.
 * Parsed images from markdown are not directly rendered, instead they have to be added to the MarkdownImagesMap.ts.
 * This makes sure that all icons/images are accounted for in markdown.
 */
export class MarkdownImage extends HTMLElement {
    #shadow = this.attachShadow({ mode: 'open' });
    #imageData;
    #imageTitle;
    set data(data) {
        const { key, title } = data;
        const markdownImage = getMarkdownImage(key);
        this.#imageData = markdownImage;
        this.#imageTitle = title;
        this.#render();
    }
    #getIconComponent() {
        if (!this.#imageData) {
            return Lit.nothing;
        }
        const { src, color, width = '100%', height = '100%' } = this.#imageData;
        return html `
      <devtools-icon .data=${{ iconPath: src, color, width, height }}></devtools-icon>
    `;
    }
    #getImageComponent() {
        if (!this.#imageData) {
            return Lit.nothing;
        }
        const { src, width = '100%', height = '100%' } = this.#imageData;
        return html `
      <img class="markdown-image" src=${src} alt=${ifDefined(this.#imageTitle)} width=${width} height=${height} />
    `;
    }
    #render() {
        if (!this.#imageData) {
            return;
        }
        const { isIcon } = this.#imageData;
        const imageComponent = isIcon ? this.#getIconComponent() : this.#getImageComponent();
        Lit.render(html `
      <style>${markdownImageStyles}</style>
      ${imageComponent}
    `, this.#shadow, { host: this });
    }
}
customElements.define('devtools-markdown-image', MarkdownImage);
//# sourceMappingURL=MarkdownImage.js.map