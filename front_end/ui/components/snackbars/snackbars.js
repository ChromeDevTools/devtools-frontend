var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/ui/components/snackbars/Snackbar.js
var Snackbar_exports = {};
__export(Snackbar_exports, {
  DEFAULT_AUTO_DISMISS_MS: () => DEFAULT_AUTO_DISMISS_MS,
  Snackbar: () => Snackbar
});
import * as i18n from "./../../../core/i18n/i18n.js";
import * as VisualLogging from "./../../visual_logging/visual_logging.js";
import * as UI from "./../../legacy/legacy.js";
import * as Lit from "./../../lit/lit.js";
import * as Buttons from "./../buttons/buttons.js";

// gen/front_end/ui/components/snackbars/snackbar.css.js
var snackbar_css_default = `/*
 * Copyright 2025 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
    position: fixed;
    bottom: var(--sys-size-5);
    left: var(--sys-size-5);
    z-index: 9999;
    /* subtract var(--sys-size-5) * 2 so that there is equal space on the left and on the right in small screens */
    max-width: calc(100% - 2 * var(--sys-size-5));

    .container {
        display: flex;
        align-items: center;
        overflow: hidden;
        width: var(--sys-size-31);
        padding: var(--sys-size-6);
        background: var(--sys-color-inverse-surface);
        box-shadow: var(--sys-elevation-level3);
        border-radius: var(--sys-shape-corner-small);
        font: var(--sys-typescale-body4-medium);
        animation: slideIn 100ms cubic-bezier(0, 0, 0.3, 1);
        box-sizing: border-box;
        max-width: 100%;

        &.closable {
            padding: var(--sys-size-5) var(--sys-size-5) var(--sys-size-5) var(--sys-size-6);

            &.long-action {
                padding: var(--sys-size-5) var(--sys-size-6) var(--sys-size-6) var(--sys-size-6);
            }
        }

        &.long-action {
            flex-direction: column;
            align-items: flex-start;

            .long-action-container {
                margin-left: auto;
            }
        }

        .label-container {
            display: flex;
            width: 100%;
            align-items: center;
            gap: var(--sys-size-5);

            .message {
                width: 100%;
                color: var(--sys-color-inverse-on-surface);
                flex: 1 0 0;
                text-wrap: pretty;
                user-select: text;
            }
        }

        devtools-button.dismiss {
            padding: 3px;
        }
    }
}

 @keyframes slideIn {
    from {
        transform: translateY(var(--sys-size-5));
        opacity: 0%;
    }

    to {
        opacity: 100%;
    }
}

/*# sourceURL=${import.meta.resolve("./snackbar.css")} */`;

// gen/front_end/ui/components/snackbars/Snackbar.js
var { html } = Lit;
var UIStrings = {
  /**
   * @description Title for close button
   */
  dismiss: "Dismiss"
};
var str_ = i18n.i18n.registerUIStrings("ui/components/snackbars/Snackbar.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var DEFAULT_AUTO_DISMISS_MS = 5e3;
var LONG_ACTION_THRESHOLD = 15;
var Snackbar = class _Snackbar extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #container;
  #timeout = null;
  #isLongAction = false;
  #actionButtonClickHandler;
  static snackbarQueue = [];
  /**
   * Returns the timeout (in ms) after which the snackbar is dismissed.
   */
  get dismissTimeout() {
    return this.hasAttribute("dismiss-timeout") ? Number(this.getAttribute("dismiss-timeout")) : DEFAULT_AUTO_DISMISS_MS;
  }
  /**
   * Sets the value of the `"dismiss-timeout"` attribute for the snackbar.
   */
  set dismissTimeout(dismissMs) {
    this.setAttribute("dismiss-timeout", dismissMs.toString());
  }
  /**
   * Returns the message displayed in the snackbar.
   */
  get message() {
    return this.getAttribute("message");
  }
  /**
   * Sets the `"message"` attribute for the snackbar.
   */
  set message(message) {
    this.setAttribute("message", message);
  }
  /**
   * Returns whether the snackbar is closable. If true, the snackbar will have a dismiss button.
   * @default false
   */
  get closable() {
    return this.hasAttribute("closable");
  }
  /**
   * Sets the `"closable"` attribute for the snackbar.
   */
  set closable(closable) {
    this.toggleAttribute("closable", closable);
  }
  /**
   * Returns the text for the action button.
   */
  get actionButtonLabel() {
    return this.getAttribute("action-button-label");
  }
  /**
   * Sets the `"action-button-label"` attribute for the snackbar.
   */
  set actionButtonLabel(actionButtonLabel) {
    this.setAttribute("action-button-label", actionButtonLabel);
  }
  /**
   * Returns the title for the action button.
   */
  get actionButtonTitle() {
    return this.getAttribute("action-button-title");
  }
  /**
   * Sets the `"action-button-title"` attribute for the snackbar.
   */
  set actionButtonTitle(actionButtonTitle) {
    this.setAttribute("action-button-title", actionButtonTitle);
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
    const snackbar = new _Snackbar(properties, container);
    _Snackbar.snackbarQueue.push(snackbar);
    if (_Snackbar.snackbarQueue.length === 1) {
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
    _Snackbar.snackbarQueue.shift();
    if (_Snackbar.snackbarQueue.length > 0) {
      const nextSnackbar = _Snackbar.snackbarQueue[0];
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
    this.role = "alert";
    const containerCls = Lit.Directives.classMap({
      container: true,
      "long-action": Boolean(this.#isLongAction),
      closable: Boolean(this.closable)
    });
    const actionButton = this.actionButtonLabel ? html`<devtools-button
        class="snackbar-button"
        @click=${this.#onActionButtonClickHandler}
        jslog=${VisualLogging.action("snackbar.action").track({ click: true })}
        .variant=${"text"}
        .title=${this.actionButtonTitle ?? ""}
        .inverseColorTheme=${true}
    >${this.actionButtonLabel}</devtools-button>` : Lit.nothing;
    const crossButton = this.closable ? html`<devtools-button
        class="dismiss snackbar-button"
        @click=${this.#close}
        jslog=${VisualLogging.action("snackbar.dismiss").track({ click: true })}
        aria-label=${i18nString(UIStrings.dismiss)}
        .iconName=${"cross"}
        .variant=${"icon"}
        .title=${i18nString(UIStrings.dismiss)}
        .inverseColorTheme=${true}
    ></devtools-button>` : Lit.nothing;
    Lit.render(html`
        <style>${snackbar_css_default}</style>
        <div class=${containerCls}>
            <div class="label-container">
                <div class="message">${this.message}</div>
                ${!this.#isLongAction ? actionButton : Lit.nothing}
                ${crossButton}
            </div>
            ${this.#isLongAction ? html`<div class="long-action-container">${actionButton}</div>` : Lit.nothing}
        </div>
    `, this.#shadow, { host: this });
  }
};
customElements.define("devtools-snackbar", Snackbar);
export {
  Snackbar_exports as Snackbar
};
//# sourceMappingURL=snackbars.js.map
