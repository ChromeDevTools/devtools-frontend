// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../ui/components/icon_button/icon_button.js';
import './Dialog.js';

import * as i18n from '../../../core/i18n/i18n.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import type * as IconButton from '../../../ui/components/icon_button/icon_button.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';

import type {Dialog as DialogElement, DialogHorizontalAlignment, DialogVerticalPosition} from './Dialog.js';
import iconDialogStyles from './iconDialog.css.js';

const {html} = LitHtml;

const UIStrings = {
  /**
   * @description Title of close button for the shortcuts dialog.
   */
  close: 'Close',
};

const str_ = i18n.i18n.registerUIStrings('ui/components/dialogs/IconDialog.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

declare global {
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
      maybeCloseButton = html`
        <div id='close-button-container'>
          <div id='close-button-right-aligner'>
            <devtools-icon
              @click=${this.#closeDialog}
              .data=${{
                iconName: 'cross',
                color: 'var(--icon-default-hover)',
                width: '16px',
                height: '16px',
              }}
              jslog=${VisualLogging.close().track({click: true})}
              title=${i18nString(UIStrings.close)}
            ></devtools-icon>
          </div>
        </div>
      `;
                // clang-format on
    }

    // clang-format off
    LitHtml.render(html`
      <devtools-icon
        @click=${this.#showDialog}
        on-render=${ComponentHelpers.Directives.nodeRenderedCallback(node => {
          this.#icon = node as IconButton.Icon.Icon;
        })}
        .data=${this.#data.iconData}
      ></devtools-icon>
      <devtools-dialog
        @clickoutsidedialog=${this.#closeDialog}
        .showConnector=${true}
        .origin=${() => {
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
      </devtools-dialog>
    `, this.#shadow, {host: this});
    // clang-format on
  }
}

customElements.define('devtools-icon-dialog', IconDialog);
