// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view, @devtools/enforce-custom-element-definitions-location */
import '../../legacy/legacy.js'; // Required for <x-link>.
import { html, render } from '../../lit/lit.js';
import * as VisualLogging from '../../visual_logging/visual_logging.js';
import markdownLinkStyles from './markdownLink.css.js';
import { getMarkdownLink } from './MarkdownLinksMap.js';
/**
 * Component to render link from parsed markdown.
 * Parsed links from markdown are not directly rendered, instead they have to be added to the <key, link> map in MarkdownLinksMap.ts.
 * This makes sure that all links are accounted for and no bad links are introduced to devtools via markdown.
 */
export class MarkdownLink extends HTMLElement {
    #shadow = this.attachShadow({ mode: 'open' });
    #linkText = '';
    #linkUrl = '';
    set data(data) {
        const { key, title } = data;
        const markdownLink = getMarkdownLink(key);
        this.#linkText = title;
        this.#linkUrl = markdownLink;
        this.#render();
    }
    #render() {
        // clang-format off
        const output = html `
      <style>${markdownLinkStyles}</style>
      <x-link class="devtools-link" href=${this.#linkUrl} jslog=${VisualLogging.link().track({ click: true })}
      >${this.#linkText}</x-link>`;
        render(output, this.#shadow, { host: this });
        // clang-format on
    }
}
customElements.define('devtools-markdown-link', MarkdownLink);
//# sourceMappingURL=MarkdownLink.js.map