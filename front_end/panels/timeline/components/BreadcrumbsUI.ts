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
  #breadcrumb: Breadcrumb|null = null;

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

  #showBreadcrumbsAndScrollLastCrumbIntoView(): void {
    const container = this.#shadow.querySelector<HTMLDivElement>('.breadcrumbs');
    if (!container) {
      return;
    }
    // Display Breadcrumbs after at least one was created
    container.style.display = 'flex';
    requestAnimationFrame(() => {
      // If the width of all the elements is greater than the width of the
      // container, we need to scroll the last element into view.
      if (container.scrollWidth - container.clientWidth > 0) {
        requestAnimationFrame(() => {
          // For some unknown reason, if we scroll after one rAF, the values
          // are slightly off by a few pixels which means that the element does
          // not get properly scrolled fully into view. Therefore we wait for a
          // second rAF, at which point the values are correct and this will
          // scroll the container fully to ensure the last breadcrumb is fully
          // visible.
          container.scrollLeft = container.scrollWidth - container.clientWidth;
        });
      }
    });
  }

  #renderElement(breadcrumb: Breadcrumb, index: number): LitHtml.LitTemplate {
    const breadcrumbRange = TraceEngine.Helpers.Timing.microSecondsToMilliseconds(breadcrumb.window.range);
    // clang-format off
    return html`
          <div class="breadcrumb" @click=${() => this.#removeBreadcrumb(breadcrumb)}>
           <span class="${(index !== 0 && breadcrumb.child === null) ? 'last-breadcrumb' : ''} range">
            ${(index === 0) ?
              `Full range (${breadcrumbRange.toFixed(2)}ms)` :
              `${breadcrumbRange.toFixed(2)}ms`}
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
    // clang-format on
  }

  #render(): void {
    // clang-format off
    const output = html`
      ${this.#breadcrumb === null ? html`` : html`<div class="breadcrumbs">
        ${flattenBreadcrumbs(this.#breadcrumb).map((breadcrumb, index) => this.#renderElement(breadcrumb, index))}
      </div>`}
    `;
    // clang-format on
    render(output, this.#shadow, {host: this});
    if (this.#breadcrumb?.child) {
      // If we have >1 crumbs show breadcrumbs and ensure the last one is visible by scrolling the container.
      this.#showBreadcrumbsAndScrollLastCrumbIntoView();
    }
  }
}

customElements.define('devtools-breadcrumbs-ui', BreadcrumbsUI);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-breadcrumbs-ui': BreadcrumbsUI;
  }
}
