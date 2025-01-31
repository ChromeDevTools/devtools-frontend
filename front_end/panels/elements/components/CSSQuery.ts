// Copyright (c) 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// eslint-disable-next-line rulesdir/es-modules-import
import inspectorCommonStylesRaw from '../../../ui/legacy/inspectorCommon.css.legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';

import cssQueryStylesRaw from './cssQuery.css.legacy.js';

// TODO(crbug.com/391381439): Fully migrate off of constructed style sheets.
const inspectorCommonStyles = new CSSStyleSheet();
inspectorCommonStyles.replaceSync(inspectorCommonStylesRaw.cssContent);

// TODO(crbug.com/391381439): Fully migrate off of constructed style sheets.
const cssQueryStyles = new CSSStyleSheet();
cssQueryStyles.replaceSync(cssQueryStylesRaw.cssContent);

const {render, html} = Lit;

export interface CSSQueryData {
  queryPrefix: string;
  queryName?: string;
  queryText: string;
  onQueryTextClick?: (event: Event) => void;
  jslogContext: string;
}

export class CSSQuery extends HTMLElement {

  readonly #shadow = this.attachShadow({mode: 'open'});
  #queryPrefix: string = '';
  #queryName?: string;
  #queryText: string = '';
  #onQueryTextClick?: (event: Event) => void;
  #jslogContext?: string;

  set data(data: CSSQueryData) {
    this.#queryPrefix = data.queryPrefix;
    this.#queryName = data.queryName;
    this.#queryText = data.queryText;
    this.#onQueryTextClick = data.onQueryTextClick;
    this.#jslogContext = data.jslogContext;
    this.#render();
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [
      cssQueryStyles,
      inspectorCommonStyles,
    ];
  }

  #render(): void {
    const queryClasses = Lit.Directives.classMap({
      query: true,
      editable: Boolean(this.#onQueryTextClick),
    });

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    const queryText = html`
      <span class="query-text" @click=${this.#onQueryTextClick}>${this.#queryText}</span>
    `;

    render(html`
      <div class=${queryClasses} jslog=${VisualLogging.cssRuleHeader(this.#jslogContext).track({click:true, change: true})}>
        <slot name="indent"></slot>${this.#queryPrefix ? html`<span>${this.#queryPrefix + ' '}</span>` : Lit.nothing}${this.#queryName ? html`<span>${this.#queryName + ' '}</span>` : Lit.nothing}${queryText} {
      </div>
    `, this.#shadow, {
      host: this,
    });
    // clang-format on
  }
}

customElements.define('devtools-css-query', CSSQuery);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-css-query': CSSQuery;
  }
}
