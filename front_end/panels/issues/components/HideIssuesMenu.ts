// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as UI from '../../../ui/legacy/legacy.js';
import {html, render} from '../../../ui/lit/lit.js';

import hideIssuesMenuStyles from './hideIssuesMenu.css.js';

const UIStrings = {
  /**
   * @description Tooltip in the Issues panel for the three dots (options) menu button to hide issues.
   */
  tooltipTitle: 'Hide issues',
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/issues/components/HideIssuesMenu.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface ViewInput {
  menuItemLabel: Common.UIString.LocalizedString;
  menuItemAction: () => void;
}

export type View = (input: ViewInput, output: undefined, target: HTMLElement|DocumentFragment) => void;

export const DEFAULT_VIEW: View = (input, _output, target) => {
  const onMenuOpen = (event: Event): void => {
    event.stopPropagation();
    const buttonElement = event.currentTarget as HTMLElement | null;
    const contextMenu = new UI.ContextMenu.ContextMenu(event, {
      x: buttonElement?.getBoundingClientRect().left,
      y: buttonElement?.getBoundingClientRect().bottom,
    });
    contextMenu.headerSection().appendItem(input.menuItemLabel, () => input.menuItemAction(),
                                           {jslogContext: 'toggle-similar-issues'});
    void contextMenu.show();
  };

  const onKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Enter' || event.key === 'Space') {
      // Make sure we don't propagate 'Enter' or 'Space' key events to parents,
      // so that these get turned into 'click' events properly.
      event.stopImmediatePropagation();
    }
  };

  // Disabled until https://crbug.com/1079231 is fixed.
  // clang-format off
  render(html`
    <style>${hideIssuesMenuStyles}</style>
    <devtools-button
      .data=${{variant: Buttons.Button.Variant.ICON, iconName: 'dots-vertical', title: i18nString(UIStrings.tooltipTitle)} as Buttons.Button.ButtonData}
      .jslogContext=${'hide-issues'}
      class="hide-issues-menu-btn"
      @click=${onMenuOpen}
      @keydown=${onKeydown}></devtools-button>
  `, target, {container: {classes: ['hide-issues-menu']}});
  // clang-format on
};

export class HideIssuesMenu extends UI.Widget.Widget<ShadowRoot> {
  #menuItemLabel: Common.UIString.LocalizedString = Common.UIString.LocalizedEmptyString;
  #menuItemAction: () => void = () => {};
  readonly #view: View;

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element, {useShadowDom: 'pure'});
    this.#view = view;
  }

  set menuItemLabel(menuItemLabel: Common.UIString.LocalizedString) {
    if (this.#menuItemLabel === menuItemLabel) {
      return;
    }
    this.#menuItemLabel = menuItemLabel;
    this.requestUpdate();
  }

  set menuItemAction(menuItemAction: () => void) {
    if (this.#menuItemAction === menuItemAction) {
      return;
    }
    this.#menuItemAction = menuItemAction;
    this.requestUpdate();
  }

  override wasShown(): void {
    super.wasShown();
    this.requestUpdate();
  }

  override performUpdate(): void {
    this.#view(
        {
          menuItemLabel: this.#menuItemLabel,
          menuItemAction: this.#menuItemAction,
        },
        undefined,
        this.contentElement,
    );
  }
}
