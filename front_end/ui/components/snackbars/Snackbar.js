// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view, @devtools/enforce-custom-element-definitions-location */
import * as i18n from '../../../core/i18n/i18n.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import * as UI from '../../legacy/legacy.js';
import * as Lit from '../../lit/lit.js';
import * as Buttons from '../buttons/buttons.js';
import snackbarStyles from './snackbar.css.js';
const { html } = Lit;
const UIStrings = {
    /**
     * @description Title for close button
     */
    dismiss: 'Dismiss',
};
const str_ = i18n.i18n.registerUIStrings('ui/components/snackbars/Snackbar.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export const DEFAULT_AUTO_DISMISS_MS = 5000;
const LONG_ACTION_THRESHOLD = 15;
/**
 * @property actionButtonClickHandler - Function to be triggered when action button is clicked.
 * @property dismissTimeout - reflects the `"dismiss-timeout"` attribute.
 * @property message - reflects the `"message"` attribute.
 * @property closable - reflects the `"closable"` attribute.
 * @property actionButtonLabel - reflects the `"action-button-label"` attribute.
 * @property actionButtonTitle - reflects the `"action-button-title"` attribute.
 * @attribute dismiss-timeout - Timeout in ms after which the snackbar is dismissed (if closable is false).
 * @attribute message - The message to display in the snackbar.
 * @attribute closable - If true, the snackbar will have a dismiss button. This cancels the auto dismiss behavior.
 * @attribute action-button-label - The text for the action button.
 * @attribute action-button-title - The title for the action button.
 *
 */
export class Snackbar extends HTMLElement {
    #shadow = this.attachShadow({ mode: 'open' });
    #container;
    #timeout = null;
    #isLongAction = false;
    #actionButtonClickHandler;
    static snackbarQueue = [];
    /**
     * Returns the timeout (in ms) after which the snackbar is dismissed.
     */
    get dismissTimeout() {
        return this.hasAttribute('dismiss-timeout') ? Number(this.getAttribute('dismiss-timeout')) :
            DEFAULT_AUTO_DISMISS_MS;
    }
    /**
     * Sets the value of the `"dismiss-timeout"` attribute for the snackbar.
     */
    set dismissTimeout(dismissMs) {
        this.setAttribute('dismiss-timeout', dismissMs.toString());
    }
    /**
     * Returns the message displayed in the snackbar.
     */
    get message() {
        return this.getAttribute('message');
    }
    /**
     * Sets the `"message"` attribute for the snackbar.
     */
    set message(message) {
        this.setAttribute('message', message);
    }
    /**
     * Returns whether the snackbar is closable. If true, the snackbar will have a dismiss button.
     * @default false
     */
    get closable() {
        return this.hasAttribute('closable');
    }
    /**
     * Sets the `"closable"` attribute for the snackbar.
     */
    set closable(closable) {
        this.toggleAttribute('closable', closable);
    }
    /**
     * Returns the text for the action button.
     */
    get actionButtonLabel() {
        return this.getAttribute('action-button-label');
    }
    /**
     * Sets the `"action-button-label"` attribute for the snackbar.
     */
    set actionButtonLabel(actionButtonLabel) {
        this.setAttribute('action-button-label', actionButtonLabel);
    }
    /**
     * Returns the title for the action button.
     */
    get actionButtonTitle() {
        return this.getAttribute('action-button-title');
    }
    /**
     * Sets the `"action-button-title"` attribute for the snackbar.
     */
    set actionButtonTitle(actionButtonTitle) {
        this.setAttribute('action-button-title', actionButtonTitle);
    }
    /**
     * Sets the function to be triggered when the action button is clicked.
     * @param actionButtonClickHandler
     */
    set actionButtonClickHandler(actionButtonClickHandler) {
        this.#actionButtonClickHandler = actionButtonClickHandler;
    }
    constructor(properties, container) {
        super();
        this.message = properties.message;
        this.#container = container || UI.InspectorView.InspectorView.instance().element;
        if (properties.closable) {
            this.closable = properties.closable;
        }
        if (properties.actionProperties) {
            this.actionButtonLabel = properties.actionProperties.label;
            this.#actionButtonClickHandler = properties.actionProperties.onClick;
            if (properties.actionProperties.title) {
                this.actionButtonTitle = properties.actionProperties.title;
            }
        }
    }
    static show(properties, container) {
        const snackbar = new Snackbar(properties, container);
        Snackbar.snackbarQueue.push(snackbar);
        if (Snackbar.snackbarQueue.length === 1) {
            snackbar.#show();
        }
        return snackbar;
    }
    #show() {
        this.#container.appendChild(this);
        if (this.#timeout) {
            window.clearTimeout(this.#timeout);
        }
        if (!this.closable) {
            this.#timeout = window.setTimeout(() => {
                this.#close();
            }, this.dismissTimeout);
        }
    }
    #close() {
        if (this.#timeout) {
            window.clearTimeout(this.#timeout);
        }
        this.remove();
        Snackbar.snackbarQueue.shift();
        if (Snackbar.snackbarQueue.length > 0) {
            const nextSnackbar = Snackbar.snackbarQueue[0];
            if (nextSnackbar) {
                nextSnackbar.#show();
            }
        }
    }
    #onActionButtonClickHandler(event) {
        if (this.#actionButtonClickHandler) {
            event.preventDefault();
            this.#actionButtonClickHandler();
            this.#close();
        }
    }
    connectedCallback() {
        if (this.actionButtonLabel) {
            this.#isLongAction = this.actionButtonLabel.length > LONG_ACTION_THRESHOLD;
        }
        this.role = 'alert';
        const containerCls = Lit.Directives.classMap({
            container: true,
            'long-action': Boolean(this.#isLongAction),
            closable: Boolean(this.closable),
        });
        // clang-format off
        const actionButton = this.actionButtonLabel ? html `<devtools-button
        class="snackbar-button"
        @click=${this.#onActionButtonClickHandler}
        jslog=${VisualLogging.action('snackbar.action').track({ click: true })}
        .variant=${"text" /* Buttons.Button.Variant.TEXT */}
        .title=${this.actionButtonTitle ?? ''}
        .inverseColorTheme=${true}
    >${this.actionButtonLabel}</devtools-button>` : Lit.nothing;
        const crossButton = this.closable ? html `<devtools-button
        class="dismiss snackbar-button"
        @click=${this.#close}
        jslog=${VisualLogging.action('snackbar.dismiss').track({ click: true })}
        aria-label=${i18nString(UIStrings.dismiss)}
        .iconName=${'cross'}
        .variant=${"icon" /* Buttons.Button.Variant.ICON */}
        .title=${i18nString(UIStrings.dismiss)}
        .inverseColorTheme=${true}
    ></devtools-button>` : Lit.nothing;
        Lit.render(html `
        <style>${snackbarStyles}</style>
        <div class=${containerCls}>
            <div class="label-container">
                <div class="message">${this.message}</div>
                ${!this.#isLongAction ? actionButton : Lit.nothing}
                ${crossButton}
            </div>
            ${this.#isLongAction ? html `<div class="long-action-container">${actionButton}</div>` : Lit.nothing}
        </div>
    `, this.#shadow, { host: this });
        // clang-format on
    }
}
customElements.define('devtools-snackbar', Snackbar);
//# sourceMappingURL=Snackbar.js.map