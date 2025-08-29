// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-lit-render-outside-of-view */

import * as i18n from '../../../core/i18n/i18n.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import * as UI from '../../legacy/legacy.js';
import * as Lit from '../../lit/lit.js';
import * as Buttons from '../buttons/buttons.js';

import snackbarStyles from './snackbar.css.js';

const {html} = Lit;

const UIStrings = {
  /**
   * @description Title for close button
   */
  dismiss: 'Dismiss',
} as const;

const str_ = i18n.i18n.registerUIStrings('ui/components/snackbars/Snackbar.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface ActionProperties {
  label: string;
  title?: string;
  onClick: () => void;
}

export interface SnackbarProperties {
  message: string;
  closable?: boolean;
  actionProperties?: ActionProperties;
}

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
  readonly #shadow = this.attachShadow({mode: 'open'});
  #timeout: number|null = null;
  #isLongAction = false;
  #actionButtonClickHandler?: () => void;

  static snackbarQueue: Snackbar[] = [];

  /**
   * Returns the timeout (in ms) after which the snackbar is dismissed.
   */
  get dismissTimeout(): number {
    return this.hasAttribute('dismiss-timeout') ? Number(this.getAttribute('dismiss-timeout')) :
                                                  DEFAULT_AUTO_DISMISS_MS;
  }

  /**
   * Sets the value of the `"dismiss-timeout"` attribute for the snackbar.
   */
  set dismissTimeout(dismissMs: number) {
    this.setAttribute('dismiss-timeout', dismissMs.toString());
  }

  /**
   * Returns the message displayed in the snackbar.
   */
  get message(): string|null {
    return this.getAttribute('message');
  }

  /**
   * Sets the `"message"` attribute for the snackbar.
   */
  set message(message: string) {
    this.setAttribute('message', message);
  }

  /**
   * Returns whether the snackbar is closable. If true, the snackbar will have a dismiss button.
   * @default false
   */
  get closable(): boolean {
    return this.hasAttribute('closable');
  }

  /**
   * Sets the `"closable"` attribute for the snackbar.
   */
  set closable(closable: boolean) {
    this.toggleAttribute('closable', closable);
  }

  /**
   * Returns the text for the action button.
   */
  get actionButtonLabel(): string|null {
    return this.getAttribute('action-button-label');
  }

  /**
   * Sets the `"action-button-label"` attribute for the snackbar.
   */
  set actionButtonLabel(actionButtonLabel: string) {
    this.setAttribute('action-button-label', actionButtonLabel);
  }

  /**
   * Returns the title for the action button.
   */
  get actionButtonTitle(): string|null {
    return this.getAttribute('action-button-title');
  }

  /**
   * Sets the `"action-button-title"` attribute for the snackbar.
   */
  set actionButtonTitle(actionButtonTitle: string) {
    this.setAttribute('action-button-title', actionButtonTitle);
  }

  /**
   * Sets the function to be triggered when the action button is clicked.
   * @param actionButtonClickHandler
   */
  set actionButtonClickHandler(actionButtonClickHandler: () => void) {
    this.#actionButtonClickHandler = actionButtonClickHandler;
  }

  constructor(properties: SnackbarProperties) {
    super();
    this.message = properties.message;
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

  static show(properties: SnackbarProperties): Snackbar {
    const snackbar = new Snackbar(properties);
    Snackbar.snackbarQueue.push(snackbar);
    if (Snackbar.snackbarQueue.length === 1) {
      snackbar.#show();
    }
    return snackbar;
  }

  #show(): void {
    UI.InspectorView.InspectorView.instance().element.appendChild(this);
    if (this.#timeout) {
      window.clearTimeout(this.#timeout);
    }
    if (!this.closable) {
      this.#timeout = window.setTimeout(() => {
        this.#close();
      }, this.dismissTimeout);
    }
  }

  #close(): void {
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

  #onActionButtonClickHandler(event: Event): void {
    if (this.#actionButtonClickHandler) {
      event.preventDefault();
      this.#actionButtonClickHandler();
      this.#close();
    }
  }

  connectedCallback(): void {
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
    const actionButton = this.actionButtonLabel ? html`<devtools-button
        class="snackbar-button"
        @click=${this.#onActionButtonClickHandler}
        jslog=${VisualLogging.action('snackbar.action').track({click: true})}
        .variant=${Buttons.Button.Variant.TEXT}
        .title=${this.actionButtonTitle ?? ''}
        .inverseColorTheme=${true}
    >${this.actionButtonLabel}</devtools-button>`:Lit.nothing;
    const crossButton = this.closable ? html`<devtools-button
        class="dismiss snackbar-button"
        @click=${this.#close}
        jslog=${VisualLogging.action('snackbar.dismiss').track({click: true})}
        aria-label=${i18nString(UIStrings.dismiss)}
        .iconName=${'cross'}
        .variant=${Buttons.Button.Variant.ICON}
        .title=${i18nString(UIStrings.dismiss)}
        .inverseColorTheme=${true}
    ></devtools-button>`:Lit.nothing;

    Lit.render(html`
        <style>${snackbarStyles}</style>
        <div class=${containerCls}>
            <div class="label-container">
                <div class="message">${this.message}</div>
                ${!this.#isLongAction ? actionButton : Lit.nothing}
                ${crossButton}
            </div>
            ${this.#isLongAction ? html`<div class="long-action-container">${actionButton}</div>` : Lit.nothing}
        </div>
    `, this.#shadow, {host: this});
    // clang-format on
  }
}

customElements.define('devtools-snackbar', Snackbar);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-snackbar': Snackbar;
  }
}
