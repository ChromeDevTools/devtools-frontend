// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import * as Trace from '../../../models/trace/trace.js';
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

export interface ViewInput {
  initialBreadcrumb: Trace.Types.File.Breadcrumb|null;
  activeBreadcrumb: Trace.Types.File.Breadcrumb|null;
  showBreadcrumbs: boolean;
  onBreadcrumbClick: (breadcrumb: Trace.Types.File.Breadcrumb) => void;
  onBreadcrumbContextMenu: (event: Event, breadcrumb: Trace.Types.File.Breadcrumb) => void;
}

export interface ViewOutput {
  scrollToEnd?: () => void;
}

type View = typeof DEFAULT_VIEW;

export class BreadcrumbsUI extends UI.Widget.Widget {
  readonly #view: View;
  readonly #viewOutput: ViewOutput = {};
  #initialBreadcrumb: Trace.Types.File.Breadcrumb|null = null;
  #activeBreadcrumb: Trace.Types.File.Breadcrumb|null = null;
  #showBreadcrumbs = false;

  onBreadcrumbActivated?: (breadcrumb: Trace.Types.File.Breadcrumb, childBreadcrumbsRemoved: boolean) => void;

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element);
    this.#view = view;
  }

  set initialBreadcrumb(breadcrumb: Trace.Types.File.Breadcrumb|null) {
    this.#initialBreadcrumb = breadcrumb;
    this.requestUpdate();
  }

  set activeBreadcrumb(breadcrumb: Trace.Types.File.Breadcrumb|null) {
    this.#activeBreadcrumb = breadcrumb;
    this.requestUpdate();
  }

  override wasShown(): void {
    super.wasShown();
    this.requestUpdate();
  }

  #activateBreadcrumb(breadcrumb: Trace.Types.File.Breadcrumb, removeChildBreadcrumbs = false): void {
    this.#activeBreadcrumb = breadcrumb;
    this.onBreadcrumbActivated?.(breadcrumb, removeChildBreadcrumbs);
    this.requestUpdate();
  }

  #onContextMenu(event: Event, breadcrumb: Trace.Types.File.Breadcrumb): void {
    const menu = new UI.ContextMenu.ContextMenu(event);

    menu.defaultSection().appendItem(i18nString(UIStrings.activateBreadcrumb), () => {
      this.#activateBreadcrumb(breadcrumb);
    });

    menu.defaultSection().appendItem(i18nString(UIStrings.removeChildBreadcrumbs), () => {
      this.#activateBreadcrumb(breadcrumb, true);
    });

    void menu.show();
  }

  override performUpdate(): void {
    if (this.#initialBreadcrumb === null) {
      // The container is removed, so it starts hidden again next time.
      this.#showBreadcrumbs = false;
    } else if (this.#initialBreadcrumb.child) {
      // Display Breadcrumbs after at least one was created. Once shown, they
      // stay shown even if the user goes back to a single breadcrumb.
      this.#showBreadcrumbs = true;
    }
    const input: ViewInput = {
      initialBreadcrumb: this.#initialBreadcrumb,
      activeBreadcrumb: this.#activeBreadcrumb,
      showBreadcrumbs: this.#showBreadcrumbs,
      onBreadcrumbClick: breadcrumb => this.#activateBreadcrumb(breadcrumb),
      onBreadcrumbContextMenu: (event, breadcrumb) => this.#onContextMenu(event, breadcrumb),
    };
    this.#view(input, this.#viewOutput, this.contentElement);
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

export const DEFAULT_VIEW = (input: ViewInput, output: ViewOutput, target: HTMLElement): void => {
  const renderElement = (breadcrumb: Trace.Types.File.Breadcrumb, index: number): Lit.LitTemplate => {
    const breadcrumbRange = Trace.Helpers.Timing.microToMilli(breadcrumb.window.range);
    // clang-format off
    return html`
      <div class="breadcrumb" @contextmenu=${(event: Event) => input.onBreadcrumbContextMenu(event, breadcrumb)} @click=${() => input.onBreadcrumbClick(breadcrumb)}
      jslog=${VisualLogging.item('timeline.breadcrumb-select').track({ click: true, resize: true })}>
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
        class=${Lit.Directives.classMap({ breadcrumbs: true, visible: input.showBreadcrumbs })}
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
