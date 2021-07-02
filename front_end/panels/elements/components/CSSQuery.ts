// Copyright (c) 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';

import cssQueryStyles from './cssQuery.css.js';

const {render, html} = LitHtml;
const getStyleSheets = ComponentHelpers.GetStylesheet.getStyleSheets;

export interface CSSQueryData {
  queryPrefix: string;
  queryName?: string;
  queryText: string;
  onQueryTextClick?: (event: Event) => void;
}

export class CSSQuery extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-css-query`;

  private readonly shadow = this.attachShadow({mode: 'open'});
  private queryPrefix: string = '';
  private queryName?: string;
  private queryText: string = '';
  private onQueryTextClick?: (event: Event) => void;

  set data(data: CSSQueryData) {
    this.queryPrefix = data.queryPrefix;
    this.queryName = data.queryName;
    this.queryText = data.queryText;
    this.onQueryTextClick = data.onQueryTextClick;
    this.render();
  }

  connectedCallback(): void {
    this.shadow.adoptedStyleSheets = [
      cssQueryStyles,
      // Required for editing styles.
      ...getStyleSheets('ui/legacy/inspectorCommon.css'),
    ];
  }

  private render(): void {
    const queryClasses = LitHtml.Directives.classMap({
      query: true,
      editable: Boolean(this.onQueryTextClick),
    });

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    const queryText = html`
      <span class="query-text" @click=${this.onQueryTextClick}>${this.queryText}</span>
    `;

    render(html`
      <div class=${queryClasses}>
        ${this.queryPrefix ? html`<span>${this.queryPrefix + ' '}</span>` : LitHtml.nothing}${this.queryName ? html`<span>${this.queryName + ' '}</span>` : LitHtml.nothing}${queryText}
      </div>
    `, this.shadow, {
      host: this,
    });
    // clang-format on
  }
}

ComponentHelpers.CustomElements.defineComponent('devtools-css-query', CSSQuery);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElementTagNameMap {
    'devtools-css-query': CSSQuery;
  }
}
