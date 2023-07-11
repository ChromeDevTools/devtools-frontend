// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Utils from './utils/utils.js';

import * as ARIAUtils from './ARIAUtils.js';
import {Keys} from './KeyboardShortcut.js';
import {createTextButton} from './UIUtils.js';
import {type Widget} from './Widget.js';
import infobarStyles from './infobar.css.legacy.js';

const UIStrings = {
  /**
   *@description Text on a button to close the infobar and never show the infobar in the future
   */
  dontShowAgain: 'Don\'t show again',
  /**
   *@description Text that indicates that a short message can be expanded to a detailed message
   */
  showMore: 'Show more',
  /**
   *@description Text to close something
   */
  close: 'Close',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/Infobar.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class Infobar {
  element: HTMLElement;
  private readonly shadowRoot: ShadowRoot;
  private readonly contentElement: HTMLDivElement;
  private readonly mainRow: HTMLElement;
  private readonly detailsRows: HTMLElement;
  private hasDetails: boolean;
  private detailsMessage: string|Element;
  private readonly infoContainer: HTMLElement;
  private readonly infoMessage: HTMLElement;
  private infoText: HTMLElement;
  private readonly actionContainer: HTMLElement;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly disableSetting: Common.Settings.Setting<any>|null;
  private readonly closeContainer: HTMLElement;
  private readonly toggleElement: HTMLButtonElement;
  private readonly closeButton: HTMLElement;
  private closeCallback: (() => void)|null;
  #firstFocusableElement: HTMLElement|null = null;
  private parentView?: Widget;

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(type: Type, text: string, actions?: InfobarAction[], disableSetting?: Common.Settings.Setting<any>) {
    this.element = document.createElement('div');
    this.element.classList.add('flex-none');
    this.shadowRoot =
        Utils.createShadowRootWithCoreStyles(this.element, {cssFile: infobarStyles, delegatesFocus: undefined});

    this.contentElement = this.shadowRoot.createChild('div', 'infobar infobar-' + type) as HTMLDivElement;

    this.mainRow = this.contentElement.createChild('div', 'infobar-main-row');
    this.detailsRows = this.contentElement.createChild('div', 'infobar-details-rows hidden');
    this.hasDetails = false;
    this.detailsMessage = '';

    this.infoContainer = this.mainRow.createChild('div', 'infobar-info-container');

    this.infoMessage = this.infoContainer.createChild('div', 'infobar-info-message');

    // Icon is in separate file and included via CSS.
    this.infoMessage.createChild('div', type + '-icon icon');

    this.infoText = this.infoMessage.createChild('div', 'infobar-info-text');
    this.infoText.textContent = text;
    ARIAUtils.markAsAlert(this.infoText);

    this.actionContainer = this.infoContainer.createChild('div', 'infobar-info-actions');
    if (actions) {
      this.contentElement.setAttribute('role', 'group');

      for (const action of actions) {
        const actionCallback = this.actionCallbackFactory(action);
        let buttonClass = 'infobar-button';
        if (action.highlight) {
          buttonClass += ' primary-button';
        }

        const button = createTextButton(action.text, actionCallback, buttonClass);
        if (action.highlight && !this.#firstFocusableElement) {
          this.#firstFocusableElement = button;
        }
        this.actionContainer.appendChild(button);
      }
    }

    this.disableSetting = disableSetting || null;
    if (disableSetting) {
      const disableButton =
          createTextButton(i18nString(UIStrings.dontShowAgain), this.onDisable.bind(this), 'infobar-button');
      this.actionContainer.appendChild(disableButton);
    }

    this.closeContainer = this.mainRow.createChild('div', 'infobar-close-container');
    this.toggleElement = createTextButton(
        i18nString(UIStrings.showMore), this.onToggleDetails.bind(this), 'link-style devtools-link hidden');
    this.toggleElement.setAttribute('role', 'link');
    this.closeContainer.appendChild(this.toggleElement);
    this.closeButton = this.closeContainer.createChild('div', 'close-button', 'dt-close-button');
    // @ts-ignore This is a custom element defined in UIUitls.js that has a `setTabbable` that TS doesn't
    //            know about.
    this.closeButton.setTabbable(true);
    ARIAUtils.setDescription(this.closeButton, i18nString(UIStrings.close));
    self.onInvokeElement(this.closeButton, this.dispose.bind(this));

    if (type !== Type.Issue) {
      this.contentElement.tabIndex = 0;
    }
    ARIAUtils.setLabel(this.contentElement, text);
    this.contentElement.addEventListener('keydown', event => {
      if (event.keyCode === Keys.Esc.code) {
        this.dispose();
        event.consume();
        return;
      }

      if (event.target !== this.contentElement) {
        return;
      }

      if (event.key === 'Enter' && this.hasDetails) {
        this.onToggleDetails();
        event.consume();
        return;
      }
    });

    this.closeCallback = null;
  }

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static create(type: Type, text: string, actions?: InfobarAction[], disableSetting?: Common.Settings.Setting<any>):
      Infobar|null {
    if (disableSetting && disableSetting.get()) {
      return null;
    }
    return new Infobar(type, text, actions, disableSetting);
  }

  dispose(): void {
    this.element.remove();
    this.onResize();
    if (this.closeCallback) {
      this.closeCallback.call(null);
    }
  }

  setText(text: string): void {
    this.infoText.textContent = text;
    this.onResize();
  }

  setCloseCallback(callback: (() => void)|null): void {
    this.closeCallback = callback;
  }

  setParentView(parentView: Widget): void {
    this.parentView = parentView;
  }

  private actionCallbackFactory(action: InfobarAction): () => void {
    if (!action.delegate) {
      return action.dismiss ? this.dispose.bind(this) : (): void => {};
    }

    if (!action.dismiss) {
      return action.delegate;
    }

    return ((): void => {
             if (action.delegate) {
               action.delegate();
             }
             this.dispose();
           }).bind(this);
  }

  private onResize(): void {
    if (this.parentView) {
      this.parentView.doResize();
    }
  }

  private onDisable(): void {
    if (this.disableSetting) {
      this.disableSetting.set(true);
    }
    this.dispose();
  }

  private onToggleDetails(): void {
    this.detailsRows.classList.remove('hidden');
    this.toggleElement.remove();
    this.onResize();
    ARIAUtils.alert(
        typeof this.detailsMessage === 'string' ? this.detailsMessage : this.detailsMessage.textContent || '');
    if (this.#firstFocusableElement) {
      this.#firstFocusableElement.focus();
    } else {
      this.closeButton.focus();
    }
  }

  createDetailsRowMessage(message: Element|string): Element {
    this.hasDetails = true;
    this.detailsMessage = message;
    this.toggleElement.classList.remove('hidden');
    const infobarDetailsRow = this.detailsRows.createChild('div', 'infobar-details-row');
    const detailsRowMessage = infobarDetailsRow.createChild('span', 'infobar-row-message');
    if (typeof message === 'string') {
      detailsRowMessage.textContent = message;
    } else {
      detailsRowMessage.appendChild(message);
    }
    return detailsRowMessage;
  }
}
export interface InfobarAction {
  text: string;
  highlight: boolean;
  delegate: (() => void)|null;
  dismiss: boolean;
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Type {
  Warning = 'warning',
  Info = 'info',
  Issue = 'issue',
  Error = 'error',
}
