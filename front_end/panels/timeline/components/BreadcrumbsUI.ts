// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import * as Trace from '../../../models/trace/trace.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';

import {flattenBreadcrumbs} from './Breadcrumbs.js';
import breadcrumbsUIStyles from './breadcrumbsUI.css.js';

const {render, html} = Lit;

const UIStrings = {
  /**
   * @description Context menu item in the Performance panel to activate the selected breadcrumb.
   */
  activateBreadcrumb: 'Activate breadcrumb',
  /**
   * @description Context menu item in the Performance panel to remove all child breadcrumbs and activate the selected breadcrumb.
   */
  removeChildBreadcrumbs: 'Remove child breadcrumbs',
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/BreadcrumbsUI.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

/**
 * `initialBreadcrumb` is the first breadcrumb in the breadcrumbs linked list. Since
 * breadcrumbs are a linked list, the first breadcrumb is enough to be able to iterate through all of them.
 *
 * `activeBreadcrumb` is the currently active breadcrumb that the timeline is limited to.
 **/
export interface BreadcrumbsUIData {
  initialBreadcrumb: Trace.Types.File.Breadcrumb;
  activeBreadcrumb: Trace.Types.File.Breadcrumb;
}

export interface ViewInput {
  initialBreadcrumb: Trace.Types.File.Breadcrumb|null;
  activeBreadcrumb: Trace.Types.File.Breadcrumb|null;
  onBreadcrumbClick: (breadcrumb: Trace.Types.File.Breadcrumb) => void;
  onBreadcrumbContextMenu: (event: Event, breadcrumb: Trace.Types.File.Breadcrumb) => void;
}

export interface ViewOutput {
  scrollToEnd?: () => void;
}

type View = typeof DEFAULT_VIEW;

export class BreadcrumbActivatedEvent extends Event {
  static readonly eventName = 'breadcrumbactivated';

  constructor(public breadcrumb: Trace.Types.File.Breadcrumb, public childBreadcrumbsRemoved?: boolean) {
    super(BreadcrumbActivatedEvent.eventName);
  }
}

export class BreadcrumbsUI extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});
  readonly #view: View = DEFAULT_VIEW;
  readonly #viewOutput: ViewOutput = {};
  #initialBreadcrumb: Trace.Types.File.Breadcrumb|null = null;
  #activeBreadcrumb: Trace.Types.File.Breadcrumb|null = null;

  set data(data: BreadcrumbsUIData) {
    this.#initialBreadcrumb = data.initialBreadcrumb;
    this.#activeBreadcrumb = data.activeBreadcrumb;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.performUpdate);
  }

  #activateBreadcrumb(breadcrumb: Trace.Types.File.Breadcrumb): void {
    this.#activeBreadcrumb = breadcrumb;
    this.dispatchEvent(new BreadcrumbActivatedEvent(breadcrumb));
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

  performUpdate(): void {
    const input: ViewInput = {
      initialBreadcrumb: this.#initialBreadcrumb,
      activeBreadcrumb: this.#activeBreadcrumb,
      onBreadcrumbClick: breadcrumb => this.#activateBreadcrumb(breadcrumb),
      onBreadcrumbContextMenu: (event, breadcrumb) => this.#onContextMenu(event, breadcrumb),
    };
    this.#view(input, this.#viewOutput, this.#shadow);
    if (this.#initialBreadcrumb?.child) {
      // If we have >1 crumbs ensure the last one is visible by scrolling the container.
      this.#viewOutput.scrollToEnd?.();
    }
  }
}

function scrollLastCrumbIntoView(container: HTMLElement): void {
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

// `target` also accepts a DocumentFragment while BreadcrumbsUI still renders into its shadow root.
export const DEFAULT_VIEW = (input: ViewInput, output: ViewOutput, target: HTMLElement|DocumentFragment): void => {
  const renderElement = (breadcrumb: Trace.Types.File.Breadcrumb, index: number): Lit.LitTemplate => {
    const breadcrumbRange = Trace.Helpers.Timing.microToMilli(breadcrumb.window.range);
    // clang-format off
        return html`
          <div class="breadcrumb" @contextmenu=${(event: Event) => input.onBreadcrumbContextMenu(event, breadcrumb)} @click=${() => input.onBreadcrumbClick(breadcrumb)}
          jslog=${VisualLogging.item('timeline.breadcrumb-select').track({click: true, resize: true})}>
           <span class="${(breadcrumb === input.activeBreadcrumb) ? 'active-breadcrumb' : ''} range">
            ${(index === 0) ?
              `Full range (${i18n.TimeUtilities.preciseMillisToString(breadcrumbRange, 2)})` :
              `${i18n.TimeUtilities.preciseMillisToString(breadcrumbRange, 2)}`}
            </span>
          </div>
          ${breadcrumb.child !== null ?
            html`
            <devtools-icon name="chevron-right" class="medium"></devtools-icon>`
            : ''}
      `;
    // clang-format on
  };

  // clang-format off
      render(html`
        <style>${breadcrumbsUIStyles}</style>
        ${input.initialBreadcrumb === null ? Lit.nothing : html`<div
            class=${Lit.Directives.classMap({breadcrumbs: true, visible: Boolean(input.initialBreadcrumb.child)})}
            jslog=${VisualLogging.section('breadcrumbs')}
            ${Lit.Directives.ref(el => {
              if (el instanceof HTMLElement) {
                output.scrollToEnd = () => scrollLastCrumbIntoView(el);
              }
            })}>
          ${flattenBreadcrumbs(input.initialBreadcrumb).map((breadcrumb, index) => renderElement(breadcrumb, index))}
        </div>`}
      `, target);
  // clang-format on
};

customElements.define('devtools-breadcrumbs-ui', BreadcrumbsUI);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-breadcrumbs-ui': BreadcrumbsUI;
  }
}
