// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as Lit from '../../../ui/lit/lit.js';

import buttonDialogStyles from './buttonDialog.css.js';
import {
  type ClickOutsideDialogEvent,
  type Dialog as DialogElement,
  DialogHorizontalAlignment,
  DialogVerticalPosition,
} from './Dialog.js';

const {html} = Lit;

export interface ButtonDialogData {
  openOnRender?: boolean;
  jslogContext?: string;
  // The below are parts of ButtonData. See comments of ButtonData.
  variant: Buttons.Button.Variant.PRIMARY_TOOLBAR|Buttons.Button.Variant.TOOLBAR|Buttons.Button.Variant.ICON;
  iconName: string;
  disabled?: boolean;
  iconTitle?: string;
  // The below are parts of DialogData. See comments of DialogData.
  position?: DialogVerticalPosition;
  horizontalAlignment?: DialogHorizontalAlignment;
  closeOnESC?: boolean;
  closeOnScroll?: boolean;
  closeButton?: boolean;
  dialogTitle: string;
}

export class ButtonDialog extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});
  readonly #renderBound = this.#render.bind(this);

  #dialog: DialogElement|null = null;
  #showButton: Buttons.Button.Button|null = null;
  #data: ButtonDialogData|null = null;

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [buttonDialogStyles];
  }

  set data(data: ButtonDialogData) {
    this.#data = data;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#renderBound);
  }

  #showDialog(): void {
    if (!this.#dialog) {
      throw new Error('Dialog not found');
    }
    void this.#dialog.setDialogVisible(true);
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#renderBound);
  }

  #closeDialog(evt?: ClickOutsideDialogEvent): void {
    if (!this.#dialog) {
      throw new Error('Dialog not found');
    }
    void this.#dialog.setDialogVisible(false);
    if (evt) {
      evt.stopImmediatePropagation();
    }
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#renderBound);
  }

  #render(): void {
    if (!this.#data) {
      throw new Error('ButtonDialog.data is not set');
    }
    if (!ComponentHelpers.ScheduledRender.isScheduledRender(this)) {
      throw new Error('Button dialog render was not scheduled');
    }

    // clang-format off
    Lit.render(
      html`
      <devtools-button
        @click=${this.#showDialog}
        on-render=${ComponentHelpers.Directives.nodeRenderedCallback(node => {
          this.#showButton = node as Buttons.Button.Button;
        })}
        .data=${{
          variant: this.#data.variant,
          iconName: this.#data.iconName,
          disabled: this.#data.disabled,
          title: this.#data.iconTitle,
          jslogContext: this.#data.jslogContext,
        } as Buttons.Button.ButtonData}
      ></devtools-button>
      <devtools-dialog
        @clickoutsidedialog=${this.#closeDialog}
        .origin=${() => {
          if (!this.#showButton) {
            throw new Error('Button not found');
          }
          return this.#showButton;
        }}
        .position=${this.#data.position ?? DialogVerticalPosition.BOTTOM}
        .horizontalAlignment=${this.#data.horizontalAlignment ?? DialogHorizontalAlignment.RIGHT}
        .closeOnESC=${this.#data.closeOnESC ?? false}
        .closeOnScroll=${this.#data.closeOnScroll ?? false}
        .closeButton=${this.#data.closeButton ?? false}
        .dialogTitle=${this.#data.dialogTitle}
        .jslogContext=${this.#data.jslogContext ?? ''}
        on-render=${ComponentHelpers.Directives.nodeRenderedCallback(node => {
          this.#dialog = node as DialogElement;
        })}
      >
        <slot></slot>
      </devtools-dialog>
      `,
      this.#shadow, {host: this});
    // clang-format on

    if (this.#data.openOnRender) {
      this.#showDialog();
      this.#data.openOnRender = false;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-button-dialog': ButtonDialog;
  }
}
customElements.define('devtools-button-dialog', ButtonDialog);
