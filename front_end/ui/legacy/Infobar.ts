// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-imperative-dom-api */

import type * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as IconButton from '../components/icon_button/icon_button.js';

import * as ARIAUtils from './ARIAUtils.js';
import infobarStyles from './infobar.css.js';
import {Keys} from './KeyboardShortcut.js';
import {createShadowRootWithCoreStyles, createTextButton, type DevToolsCloseButton} from './UIUtils.js';
import type {Widget} from './Widget.js';

const UIStrings = {
  /**
   * @description Text on a button to close the infobar and never show the infobar in the future
   */
  dontShowAgain: 'Don\'t show again',
  /**
   * @description Text to close something
   */
  close: 'Close',
} as const;
const str_ = i18n.i18n.registerUIStrings('ui/legacy/Infobar.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class Infobar {
  element: HTMLElement;
  private readonly shadowRoot: ShadowRoot;
  private readonly contentElement: HTMLDivElement;
  private detailsRows?: HTMLElement;
  private readonly infoContainer: HTMLElement;
  private readonly infoMessage: HTMLElement;
  private infoText: HTMLElement;
  private readonly actionContainer: HTMLElement;
  private readonly disableSetting: Common.Settings.Setting<boolean>|null;
  private readonly closeButton: DevToolsCloseButton;
  private closeCallback: (() => void)|null;
  private parentView?: Widget;
  mainRow: HTMLElement;

  constructor(
      type: Type, text: string, actions?: InfobarAction[], disableSetting?: Common.Settings.Setting<boolean>,
      jslogContext?: string) {
    this.element = document.createElement('div');
    if (jslogContext) {
      this.element.setAttribute(
          'jslog', `${VisualLogging.dialog(jslogContext).track({resize: true, keydown: 'Enter|Escape'})}`);
    }
    this.element.classList.add('flex-none');
    this.shadowRoot = createShadowRootWithCoreStyles(this.element, {cssFile: infobarStyles});

    this.contentElement = this.shadowRoot.createChild('div', 'infobar infobar-' + type);
    const icon = IconButton.Icon.create(TYPE_TO_ICON[type], type + '-icon');
    this.contentElement.createChild('div', 'icon-container').appendChild(icon);

    this.mainRow = this.contentElement.createChild('div', 'infobar-main-row');
    this.infoContainer = this.mainRow.createChild('div', 'infobar-info-container');
    this.infoMessage = this.infoContainer.createChild('div', 'infobar-info-message');

    this.infoText = this.infoMessage.createChild('div', 'infobar-info-text');
    this.infoText.textContent = text;
    ARIAUtils.markAsAlert(this.infoText);

    this.actionContainer = this.infoContainer.createChild('div', 'infobar-info-actions');

    let defaultActionButtonVariant = Buttons.Button.Variant.OUTLINED;
    this.disableSetting = disableSetting || null;
    if (disableSetting) {
      const disableButton = createTextButton(
          i18nString(UIStrings.dontShowAgain), this.onDisable.bind(this),
          {className: 'infobar-button', jslogContext: 'dont-show-again'});
      this.actionContainer.appendChild(disableButton);

      // If we have a disable button, make the other buttons tonal (if not otherwise specified).
      defaultActionButtonVariant = Buttons.Button.Variant.TONAL;
    }
    if (actions) {
      this.contentElement.setAttribute('role', 'group');

      for (const action of actions) {
        const actionCallback = this.actionCallbackFactory(action);
        const buttonVariant = action.buttonVariant ?? defaultActionButtonVariant;

        const button = createTextButton(action.text, actionCallback, {
          className: 'infobar-button',
          jslogContext: action.jslogContext,
          variant: buttonVariant,
        });
        this.actionContainer.appendChild(button);
      }
    }

    this.closeButton = this.contentElement.createChild('dt-close-button', 'icon-container');
    this.closeButton.setTabbable(true);
    this.closeButton.setSize(Buttons.Button.Size.SMALL);
    ARIAUtils.setDescription(this.closeButton, i18nString(UIStrings.close));
    self.onInvokeElement(this.closeButton, this.dispose.bind(this));

    if (type !== Type.ISSUE) {
      this.contentElement.tabIndex = 0;
    }
    ARIAUtils.setLabel(this.contentElement, text);
    this.contentElement.addEventListener('keydown', event => {
      if (event.keyCode === Keys.Esc.code) {
        this.dispose();
        event.consume();
        return;
      }
    });

    this.closeCallback = null;
  }

  static create(
      type: Type, text: string, actions?: InfobarAction[], disableSetting?: Common.Settings.Setting<boolean>,
      jslogContext?: string): Infobar|null {
    if (disableSetting?.get()) {
      return null;
    }
    return new Infobar(type, text, actions, disableSetting, jslogContext);
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

  createDetailsRowMessage(message: Element|string): Element {
    if (!this.detailsRows) {
      const details = document.createElement('details');
      const summary = details.createChild('summary');
      const triangleIcon = IconButton.Icon.create('arrow-drop-down');
      summary.createChild('div', 'icon-container').appendChild(triangleIcon);
      this.contentElement.insertBefore(details, this.mainRow);
      summary.appendChild(this.mainRow);
      this.detailsRows = details.createChild('div', 'infobar-details-rows');
    }
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
  delegate: (() => void)|null;
  dismiss: boolean;
  buttonVariant?: Buttons.Button.Variant;
  jslogContext?: string;
}

export const enum Type {
  WARNING = 'warning',
  INFO = 'info',
  ISSUE = 'issue',
  ERROR = 'error',
}

const TYPE_TO_ICON = {
  [Type.WARNING]: 'warning',
  [Type.INFO]: 'info',
  [Type.ISSUE]: 'issue-text-filled',
  [Type.ERROR]: 'cross-circle',
};
