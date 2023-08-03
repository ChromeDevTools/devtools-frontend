// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as IconButton from '../../../ui/components/icon_button/icon_button.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';

import {
  Dialog as DialogElement,
  type DialogVerticalPosition,
  type DialogHorizontalAlignment,
} from './Dialog.js';
import iconDialogStyles from './iconDialog.css.js';

const UIStrings = {
  /**
   * @description Title of close button for the shortcuts dialog.
   */
  close: 'Close',
};

const str_ = i18n.i18n.registerUIStrings('ui/components/dialogs/IconDialog.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElementTagNameMap {
    'devtools-icon-dialog': IconDialog;
  }
}

export class ShowDialog extends Event {
  static readonly eventName = 'showdialog';

  constructor() {
    super(ShowDialog.eventName);
  }
}

export interface IconDialogData {
  iconData: IconButton.Icon.IconData;
  closeButton: boolean;
  // The below are parts of DialogData. See comments of DialogData.
  position: DialogVerticalPosition;
  horizontalAlignment: DialogHorizontalAlignment;
  closeOnESC: boolean;
  closeOnScroll: boolean;
}

// This class provides a shorthand for a typical use case of Dialog,
// i.e. Dialog on an icon.
export class IconDialog extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-icon-dialog`;
  readonly #shadow = this.attachShadow({mode: 'open'});
  readonly #renderBound = this.#render.bind(this);

  #data: IconDialogData|null = null;

  #dialog: DialogElement|null = null;
  #icon: IconButton.Icon.Icon|null = null;

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [iconDialogStyles];
  }

  set data(data: IconDialogData) {
    this.#data = data;

    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#renderBound);
  }

  #showDialog(): void {
    if (!this.#dialog) {
      throw new Error('Dialog not found');
    }
    void this.#dialog.setDialogVisible(true);
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#renderBound);
    this.dispatchEvent(new ShowDialog());
  }

  #closeDialog(): void {
    if (!this.#dialog) {
      throw new Error('Dialog not found');
    }
    void this.#dialog.setDialogVisible(false);
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#renderBound);
  }

  #render(): void {
    if (this.#data === null) {
      throw new Error('IconDialog.data is not set');
    }

    if (!ComponentHelpers.ScheduledRender.isScheduledRender(this)) {
      throw new Error('IconDialog render was not scheduled');
    }

    let maybeCloseButton: LitHtml.LitTemplate = LitHtml.nothing;
    if (this.#data.closeButton) {
      // Disabled until https://crbug.com/1079231 is fixed.
      // clang-format off
      maybeCloseButton = LitHtml.html`
        <div id='close-button-container'>
          <div id='close-button-right-aligner'>
            <${IconButton.Icon.Icon.litTagName}
              @click=${this.#closeDialog}
              .data=${{
                iconName: 'cross',
                color: 'var(--icon-default-hover)',
                width: '16px',
                height: '16px',
              } as IconButton.Icon.IconWithName}
              title=${i18nString(UIStrings.close)}
            ></${IconButton.Icon.Icon.litTagName}>
          </div>
        </div>
      `;
      // clang-format on
    }

    // clang-format off
    LitHtml.render(LitHtml.html`
      <${IconButton.Icon.Icon.litTagName}
        @click=${this.#showDialog}
        on-render=${ComponentHelpers.Directives.nodeRenderedCallback(node => {
          this.#icon = node as IconButton.Icon.Icon;
        })}
        .data=${this.#data.iconData as IconButton.Icon.IconWithName}
      ></${IconButton.Icon.Icon.litTagName}>
      <${DialogElement.litTagName}
        @clickoutsidedialog=${this.#closeDialog}
        .showConnector=${true}
        .origin=${(): IconButton.Icon.Icon => {
          if (!this.#icon) {
            throw new Error('Icon not found');
          }
          return this.#icon;
        }}
        .position=${this.#data.position}
        .horizontalAlignment=${this.#data.horizontalAlignment}
        .closeOnESC=${this.#data.closeOnESC}
        .closeOnScroll=${this.#data.closeOnScroll}
        on-render=${ComponentHelpers.Directives.nodeRenderedCallback(node => {
          this.#dialog = node as DialogElement;
        })}
      >
        ${maybeCloseButton}
        <div id='slot-container'>
          <slot></slot>
        </div>
      </${DialogElement.litTagName}>
    `, this.#shadow, {host: this});
    // clang-format on
  }
}

ComponentHelpers.CustomElements.defineComponent('devtools-icon-dialog', IconDialog);
