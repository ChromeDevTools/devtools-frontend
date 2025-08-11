// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../ui/legacy/legacy.js';

import * as i18n from '../../core/i18n/i18n.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import {Directives, html, render} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import cssOverviewSidebarPanelStyles from './cssOverviewSidebarPanel.css.js';

const {classMap} = Directives;

const UIStrings = {
  /**
   * @description Label for the 'Clear overview' button in the CSS overview report
   */
  clearOverview: 'Clear overview',
  /**
   * @description Accessible label for the CSS overview panel sidebar
   */
  cssOverviewPanelSidebar: 'CSS overview panel sidebar',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/css_overview/CSSOverviewSidebarPanel.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

interface ViewInput {
  items: Array<{name: string, id: string}>;
  selectedId?: string;
  onReset: () => void;
  onItemClick: (id: string) => void;
  onItemKeyDown: (id: string, key: string) => void;
}
type View = (input: ViewInput, output: object, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, _output, target) => {
  const onClick = (event: Event): void => {
    if (event.target instanceof HTMLElement) {
      const id = event.target.dataset.id;
      if (id) {
        input.onItemClick(id);
      }
    }
  };
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Enter' && event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
      return;
    }
    if (event.target instanceof HTMLElement) {
      const id = event.target.dataset.id;
      if (id) {
        input.onItemKeyDown(id, event.key);
      }
    }

    event.consume(true);
  };

  // clang-format off
  render(html`
      <style>${cssOverviewSidebarPanelStyles}</style>
      <div class="overview-sidebar-panel" @click=${onClick} @keydown=${onKeyDown}
           aria-label=${i18nString(UIStrings.cssOverviewPanelSidebar)} role="tree">
        <div class="overview-toolbar">
          <devtools-toolbar>
            <devtools-button title=${i18nString(UIStrings.clearOverview)} @click=${input.onReset}
                .iconName=${'clear'} .variant=${Buttons.Button.Variant.TOOLBAR}
                .jslogContext=${'css-overview.clear-overview'}></devtools-button>
          </devtools-toolbar>
        </div>
        ${input.items.map(({id, name}) => {
          const selected = id === input.selectedId;
          return html`
            <div class="overview-sidebar-panel-item ${classMap({selected})}"
                ?autofocus=${selected}
                role="treeitem" data-id=${id} tabindex="0"
                jslog=${VisualLogging.item(`css-overview.${id}`)
                          .track({click: true, keydown: 'Enter|ArrowUp|ArrowDown'})}>
              ${name}
            </div>`;
        })}
      </div>`,
      target);
  // clang-format on
};

export class CSSOverviewSidebarPanel extends UI.Widget.VBox {
  #view: View;
  #items: Array<{name: string, id: string}> = [];
  #selectedId?: string;
  #onItemSelected = (_id: string, _shouldFocus: boolean): void => {};
  #onReset = (): void => {};

  constructor(element?: HTMLElement, view = DEFAULT_VIEW) {
    super(element, {useShadowDom: true, delegatesFocus: true});
    this.#view = view;
  }

  override performUpdate(): void {
    const viewInput = {
      items: this.#items,
      selectedId: this.#selectedId,
      onReset: this.#onReset,
      onItemClick: this.#onItemClick.bind(this),
      onItemKeyDown: this.#onItemKeyDown.bind(this)
    };
    this.#view(viewInput, {}, this.contentElement);
  }

  set items(items: Array<{name: string, id: string}>) {
    this.#items = items;
    this.requestUpdate();
  }

  set selectedId(id: string) {
    void this.#select(id);
  }

  set onItemSelected(callback: (id: string, shouldFocus: boolean) => void) {
    this.#onItemSelected = callback;
    this.requestUpdate();
  }

  set onReset(callback: () => void) {
    this.#onReset = callback;
    this.requestUpdate();
  }

  #select(id: string, shouldFocus = false): Promise<boolean> {
    this.#selectedId = id;
    this.requestUpdate();
    this.#onItemSelected(id, shouldFocus);
    return this.updateComplete;
  }

  #onItemClick(id: string): void {
    void this.#select(id, false);
  }

  #onItemKeyDown(id: string, key: string): void {
    if (key === 'Enter') {
      void this.#select(id, true);
    } else {  // arrow up/down key
      let currItemIndex = -1;
      for (let idx = 0; idx < this.#items.length; idx++) {
        if (this.#items[idx].id === id) {
          currItemIndex = idx;
          break;
        }
      }
      if (currItemIndex < 0) {
        return;
      }

      const moveTo = (key === 'ArrowDown' ? 1 : -1);
      const nextItemIndex = (currItemIndex + moveTo) % this.#items.length;
      const nextItemId = this.#items[nextItemIndex].id;
      if (!nextItemId) {
        return;
      }

      void this.#select(nextItemId, false).then(() => {
        this.element.blur();
        this.element.focus();
      });
    }
  }
}
