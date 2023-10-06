// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TraceEngine from '../../../models/trace/trace.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as IconButton from '../../../ui/components/icon_button/icon_button.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';

import {type Breadcrumb, flattenBreadcrumbs} from './Breadcrumbs.js';
import breadcrumbsUIStyles from './breadcrumbsUI.css.js';

const {render, html} = LitHtml;

export interface BreadcrumbsUIData {
  breadcrumb: Breadcrumb;
}

export class BreadcrumbRemovedEvent extends Event {
  static readonly eventName = 'breadcrumbremoved';

  constructor(public breadcrumb: Breadcrumb) {
    super(BreadcrumbRemovedEvent.eventName);
  }
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

  #removeBreadcrumb(breadcrumb: Breadcrumb): void {
    this.dispatchEvent(new BreadcrumbRemovedEvent(breadcrumb));
  }

  #renderElement(breadcrumb: Breadcrumb, index: number): LitHtml.TemplateResult {
    // clang-format off
    return html`
          <div class="breadcrumb" @click=${(): void => this.#removeBreadcrumb(breadcrumb)}>
           <span class="${(index !== 0 && breadcrumb.child === null) ? 'last-breadcrumb' : ''} range">
            ${(index === 0) ?
              `Full range (${(breadcrumb.window.range).toFixed(2)}ms)` :
              `${(breadcrumb.window.range).toFixed(2)}ms`}
            </span>
          </div>
          ${breadcrumb.child !== null ?
            html`
            <${IconButton.Icon.Icon.litTagName} .data=${{
              iconName: 'chevron-right',
              color: 'var(--icon-default)',
              width: '16px',
              height: '16px',
            } as IconButton.Icon.IconData}>`
            : ''}
      `;
  }

  #render(): void {
    const output = html`
      <div class="breadcrumbs">
      ${flattenBreadcrumbs(this.#breadcrumb).map((breadcrumb, index) => this.#renderElement(breadcrumb, index))}
      </div>`;
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
