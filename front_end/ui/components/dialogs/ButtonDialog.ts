// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-lit-render-outside-of-view */

import type * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import {html, render} from '../../../ui/lit/lit.js';

import buttonDialogStyles from './buttonDialog.css.js';
import {
  type ClickOutsideDialogEvent,
  type Dialog as DialogElement,
  DialogHorizontalAlignment,
  DialogState,
  DialogVerticalPosition,
} from './Dialog.js';

export type ButtonDialogState = DialogState;

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
  state?: ButtonDialogState;
  dialogTitle: string;
}

export class ButtonDialog extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});

  #dialog: DialogElement|null = null;
  #showButton: Buttons.Button.Button|null = null;
  #data: ButtonDialogData|null = null;

  set data(data: ButtonDialogData) {
    this.#data = data;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  #showDialog(): void {
    if (!this.#dialog) {
      throw new Error('Dialog not found');
    }

    this.state = DialogState.EXPANDED;
    void this.#dialog.setDialogVisible(true);
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  #closeDialog(evt?: ClickOutsideDialogEvent): void {
    if (!this.#dialog) {
      throw new Error('Dialog not found');
    }
    void this.#dialog.setDialogVisible(false);
    this.state = DialogState.EXPANDED;
    if (evt) {
      evt.stopImmediatePropagation();
    }
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  set state(state: ButtonDialogState) {
    if (this.#data) {
      this.#data.state = state;
      void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
    }
  }

  #render(): void {
    if (!this.#data) {
      throw new Error('ButtonDialog.data is not set');
    }
    if (!ComponentHelpers.ScheduledRender.isScheduledRender(this)) {
      throw new Error('Button dialog render was not scheduled');
    }

    // clang-format off
    render(
      html`
      <style>${buttonDialogStyles}</style>
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
        .state=${this.#data.state ?? DialogState.EXPANDED}
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
