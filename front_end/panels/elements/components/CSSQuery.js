// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import cssQueryStyles from './cssQuery.css.js';
const { render, html } = Lit;
export class CSSQuery extends HTMLElement {
    #shadow = this.attachShadow({ mode: 'open' });
    #queryPrefix = '';
    #queryName;
    #queryText = '';
    #onQueryTextClick;
    #jslogContext;
    set data(data) {
        this.#queryPrefix = data.queryPrefix;
        this.#queryName = data.queryName;
        this.#queryText = data.queryText;
        this.#onQueryTextClick = data.onQueryTextClick;
        this.#jslogContext = data.jslogContext;
        this.#render();
    }
    #render() {
        const queryClasses = Lit.Directives.classMap({
            query: true,
            editable: Boolean(this.#onQueryTextClick),
        });
        // Disabled until https://crbug.com/1079231 is fixed.
        // clang-format off
        const queryText = html `
      <span class="query-text" @click=${this.#onQueryTextClick}>${this.#queryText}</span>
    `;
        render(html `
        <style>${cssQueryStyles}</style>
        <style>${UI.inspectorCommonStyles}</style>
        <div class=${queryClasses} jslog=${VisualLogging.cssRuleHeader(this.#jslogContext).track({ click: true, change: true })}>
          <slot name="indent"></slot>
          ${this.#queryPrefix ? html `<span>${this.#queryPrefix + ' '}</span>` : Lit.nothing}
          ${this.#queryName ? html `<span>${this.#queryName + ' '}</span>` : Lit.nothing}
          ${queryText} {
        </div>`, this.#shadow, { host: this });
        // clang-format on
    }
}
customElements.define('devtools-css-query', CSSQuery);
//# sourceMappingURL=CSSQuery.js.map