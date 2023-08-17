// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TraceEngine from '../../../models/trace/trace.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as IconButton from '../../../ui/components/icon_button/icon_button.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';

import {type Breadcrumb} from './Breadcrumbs.js';
import breadcrumbsUIStyles from './breadcrumbsUI.css.js';

const {render, html} = LitHtml;

export interface BreadcrumbsUIData {
  breadcrumb: Breadcrumb;
}

export class BreadcrumbsUI extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-breadcrumbs-ui`;
  readonly #shadow = this.attachShadow({mode: 'open'});
  readonly #boundRender = this.#render.bind(this);
  readonly #traceWindow: TraceEngine.Types.Timing.TraceWindow = {
    min: TraceEngine.Types.Timing.MicroSeconds(0),
    max: TraceEngine.Types.Timing.MicroSeconds(0),
    range: TraceEngine.Types.Timing.MicroSeconds(0),
  };
  #breadcrumb: Breadcrumb = {window: this.#traceWindow, child: null};

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [breadcrumbsUIStyles];
  }

  set data(data: BreadcrumbsUIData) {
    this.#breadcrumb = data.breadcrumb;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  #render(): void {
    const output = html`
      <div class="breadcrumb">
        <span>${this.#breadcrumb.window.range} ms</span>
        <${IconButton.Icon.Icon.litTagName} .data=${
        {iconName: 'chevron-right', color: 'var(--icon-default)', width: '14px', height: '14px'} as
        IconButton.Icon.IconWithName}>
      </div>
      `;
    render(output, this.#shadow, {host: this});
  }
}

ComponentHelpers.CustomElements.defineComponent('devtools-breadcrumbs-ui', BreadcrumbsUI);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElementTagNameMap {
    'devtools-breadcrumbs-ui': BreadcrumbsUI;
  }
}
