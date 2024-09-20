// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import * as Trace from '../../../models/trace/trace.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as IconButton from '../../../ui/components/icon_button/icon_button.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';

import {flattenBreadcrumbs} from './Breadcrumbs.js';
import breadcrumbsUIStyles from './breadcrumbsUI.css.js';

const {render, html} = LitHtml;

const UIStrings = {
  /**
   *@description A context menu item in the Minimap Breadcrumb context menu.
   * This context menu option activates the breadcrumb that the context menu was opened on.
   */
  activateBreadcrumb: 'Activate breadcrumb',
  /**
   *@description A context menu item in the Minimap Breadcrumb context menu.
   * This context menu option removed all the child breadcrumbs and activates
   * the breadcrumb that the context menu was opened on.
   */
  removeChildBreadcrumbs: 'Remove child breadcrumbs',

};

const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/BreadcrumbsUI.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

// `initialBreadcrumb` is the first breadcrumb in the breadcrumbs linked list. Since
// breadcrumbs are a linked list, the first breadcrumb is enought to be able to iterate through all of them.
//
// `activeBreadcrumb` is the currently active breadcrumb that the timeline is limited to.
export interface BreadcrumbsUIData {
  initialBreadcrumb: Trace.Types.File.Breadcrumb;
  activeBreadcrumb: Trace.Types.File.Breadcrumb;
}

export class BreadcrumbActivatedEvent extends Event {
  static readonly eventName = 'breadcrumbactivated';

  constructor(public breadcrumb: Trace.Types.File.Breadcrumb, public childBreadcrumbsRemoved?: boolean) {
    super(BreadcrumbActivatedEvent.eventName);
  }
}

export class BreadcrumbsUI extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-breadcrumbs-ui`;
  readonly #shadow = this.attachShadow({mode: 'open'});
  readonly #boundRender = this.#render.bind(this);
  #initialBreadcrumb: Trace.Types.File.Breadcrumb|null = null;
  #activeBreadcrumb: Trace.Types.File.Breadcrumb|null = null;

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [breadcrumbsUIStyles];
  }

  set data(data: BreadcrumbsUIData) {
    this.#initialBreadcrumb = data.initialBreadcrumb;
    this.#activeBreadcrumb = data.activeBreadcrumb;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  #activateBreadcrumb(breadcrumb: Trace.Types.File.Breadcrumb): void {
    this.#activeBreadcrumb = breadcrumb;
    this.dispatchEvent(new BreadcrumbActivatedEvent(breadcrumb));
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

  #onContextMenu(event: Event, breadcrumb: Trace.Types.File.Breadcrumb): void {
    const menu = new UI.ContextMenu.ContextMenu(event);

    menu.defaultSection().appendItem(i18nString(UIStrings.activateBreadcrumb), () => {
      this.dispatchEvent(new BreadcrumbActivatedEvent(breadcrumb));
    });

    menu.defaultSection().appendItem(i18nString(UIStrings.removeChildBreadcrumbs), () => {
      this.dispatchEvent(new BreadcrumbActivatedEvent(breadcrumb, true));
    });

    void menu.show();
  }

  #renderElement(breadcrumb: Trace.Types.File.Breadcrumb, index: number): LitHtml.LitTemplate {
    const breadcrumbRange = Trace.Helpers.Timing.microSecondsToMilliseconds(breadcrumb.window.range);
    // clang-format off
    return html`
          <div class="breadcrumb" @contextmenu=${(event: Event) => this.#onContextMenu(event, breadcrumb)} @click=${() => this.#activateBreadcrumb(breadcrumb)}
          jslog=${VisualLogging.item('timeline.breadcrumb-select').track({click: true})}>
           <span class="${(breadcrumb === this.#activeBreadcrumb) ? 'active-breadcrumb' : ''} range">
            ${(index === 0) ?
              `Full range (${i18n.TimeUtilities.preciseMillisToString(breadcrumbRange, 2)})` :
              `${i18n.TimeUtilities.preciseMillisToString(breadcrumbRange, 2)}`}
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
      ${this.#initialBreadcrumb === null ? LitHtml.nothing : html`<div class="breadcrumbs" jslog=${VisualLogging.section('breadcrumbs')}>
        ${flattenBreadcrumbs(this.#initialBreadcrumb).map((breadcrumb, index) => this.#renderElement(breadcrumb, index))}
      </div>`}
    `;
    // clang-format on
    render(output, this.#shadow, {host: this});
    if (this.#initialBreadcrumb?.child) {
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
