// Copyright 2015 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as i18n from '../../core/i18n/i18n.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as IconButton from '../components/icon_button/icon_button.js';
import * as ARIAUtils from './ARIAUtils.js';
import infobarStyles from './infobar.css.js';
import { Keys } from './KeyboardShortcut.js';
import { createShadowRootWithCoreStyles, createTextButton } from './UIUtils.js';
const UIStrings = {
    /**
     * @description Text on a button to close the infobar and never show the infobar in the future
     */
    dontShowAgain: 'Don\'t show again',
    /**
     * @description Text to close something
     */
    close: 'Close',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/Infobar.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class Infobar {
    element;
    shadowRoot;
    contentElement;
    detailsRows;
    infoContainer;
    infoMessage;
    infoText;
    actionContainer;
    disableSetting;
    closeButton;
    closeCallback;
    parentView;
    mainRow;
    constructor(type, text, actions, disableSetting, jslogContext) {
        this.element = document.createElement('div');
        if (jslogContext) {
            this.element.setAttribute('jslog', `${VisualLogging.dialog(jslogContext).track({ resize: true, keydown: 'Enter|Escape' })}`);
        }
        this.element.classList.add('flex-none');
        this.shadowRoot = createShadowRootWithCoreStyles(this.element, { cssFile: infobarStyles });
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
        let defaultActionButtonVariant = "outlined" /* Buttons.Button.Variant.OUTLINED */;
        this.disableSetting = disableSetting || null;
        if (disableSetting) {
            const disableButton = createTextButton(i18nString(UIStrings.dontShowAgain), this.onDisable.bind(this), { className: 'infobar-button', jslogContext: 'dont-show-again' });
            this.actionContainer.appendChild(disableButton);
            // If we have a disable button, make the other buttons tonal (if not otherwise specified).
            defaultActionButtonVariant = "tonal" /* Buttons.Button.Variant.TONAL */;
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
        this.closeButton.setSize("SMALL" /* Buttons.Button.Size.SMALL */);
        ARIAUtils.setDescription(this.closeButton, i18nString(UIStrings.close));
        self.onInvokeElement(this.closeButton, this.dispose.bind(this));
        if (type !== "issue" /* Type.ISSUE */) {
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
    static create(type, text, actions, disableSetting, jslogContext) {
        if (disableSetting?.get()) {
            return null;
        }
        return new Infobar(type, text, actions, disableSetting, jslogContext);
    }
    dispose() {
        this.element.remove();
        this.onResize();
        if (this.closeCallback) {
            this.closeCallback.call(null);
        }
    }
    setText(text) {
        this.infoText.textContent = text;
        this.onResize();
    }
    setCloseCallback(callback) {
        this.closeCallback = callback;
    }
    setParentView(parentView) {
        this.parentView = parentView;
    }
    actionCallbackFactory(action) {
        if (!action.delegate) {
            return action.dismiss ? this.dispose.bind(this) : () => { };
        }
        if (!action.dismiss) {
            return action.delegate;
        }
        return (() => {
            if (action.delegate) {
                action.delegate();
            }
            this.dispose();
        }).bind(this);
    }
    onResize() {
        if (this.parentView) {
            this.parentView.doResize();
        }
    }
    onDisable() {
        if (this.disableSetting) {
            this.disableSetting.set(true);
        }
        this.dispose();
    }
    createDetailsRowMessage(message) {
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
        }
        else {
            detailsRowMessage.appendChild(message);
        }
        return detailsRowMessage;
    }
}
const TYPE_TO_ICON = {
    ["warning" /* Type.WARNING */]: 'warning',
    ["info" /* Type.INFO */]: 'info',
    ["issue" /* Type.ISSUE */]: 'issue-text-filled',
    ["error" /* Type.ERROR */]: 'cross-circle',
};
//# sourceMappingURL=Infobar.js.map