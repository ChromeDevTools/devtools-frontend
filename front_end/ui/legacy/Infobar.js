// Copyright 2015 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../kit/kit.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Buttons from '../components/buttons/buttons.js';
import { Directives, html, nothing, render } from '../lit/lit.js';
import * as VisualLogging from '../visual_logging/visual_logging.js';
import infobarStyles from './infobar.css.js';
import { Widget, WidgetElement } from './Widget.js';
const { ifDefined } = Directives;
const UIStrings = {
    /**
     * @description Button text to permanently dismiss an infobar and prevent it from appearing again.
     */
    dontShowAgain: 'Don’t show again',
    /**
     * @description Accessible label for the close button in an infobar.
     */
    close: 'Close',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/Infobar.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export const DEFAULT_VIEW = (input, _output, target) => {
    const defaultActionButtonVariant = input.hasDisableSetting ? "tonal" /* Buttons.Button.Variant.TONAL */ : "outlined" /* Buttons.Button.Variant.OUTLINED */;
    // clang-format off
    const mainRow = html `
    <div class="infobar-main-row">
      <div class="infobar-info-container">
        <div class="infobar-info-message">
          <div class="infobar-info-text" role="alert" aria-live="polite">${input.text}</div>
        </div>
        <div class="infobar-info-actions">
          ${input.hasDisableSetting ? html `
            <devtools-button
                class="infobar-button"
                .variant=${"outlined" /* Buttons.Button.Variant.OUTLINED */}
                .jslogContext=${'dont-show-again'}
                @click=${input.onDisable}>${i18nString(UIStrings.dontShowAgain)}</devtools-button>` : nothing}
          ${input.actions ? input.actions.map(action => html `
            <devtools-button
                class="infobar-button"
                .variant=${action.buttonVariant ?? defaultActionButtonVariant}
                .jslogContext=${action.jslogContext}
                @click=${() => input.onAction(action)}>${action.text}</devtools-button>`) : nothing}
        </div>
      </div>
    </div>`;
    // clang-format on
    const onKeyDown = (event) => {
        if (Platform.KeyboardUtilities.isEscKey(event)) {
            input.onDismiss();
            event.consume();
        }
    };
    const jslog = input.jslogContext ?
        `${VisualLogging.dialog(input.jslogContext).track({ resize: true, keydown: 'Enter|Escape' })}` :
        undefined;
    // clang-format off
    render(html `
    <style>${infobarStyles}</style>
    <div
        class=${`infobar infobar-${input.type}`}
        role=${ifDefined(input.actions ? 'group' : undefined)}
        tabindex=${ifDefined(input.type !== "issue" /* Type.ISSUE */ ? 0 : undefined)}
        aria-label=${input.text}
        @keydown=${onKeyDown}>
      <div class="icon-container">
        <devtools-icon class=${`${input.type}-icon`} name=${TYPE_TO_ICON[input.type]}></devtools-icon>
      </div>
      ${input.detailsRows.length > 0 ? html `
        <details>
          <summary>
            <div class="icon-container">
              <devtools-icon name="arrow-drop-down"></devtools-icon>
            </div>
            ${mainRow}
          </summary>
          <div class="infobar-details-rows">
            ${input.detailsRows.map(message => html `
              <div class="infobar-details-row"><span class="infobar-row-message">${message}</span></div>`)}
          </div>
        </details>` : mainRow}
      <dt-close-button
          class="icon-container"
          aria-description=${i18nString(UIStrings.close)}
          .tabbable=${true}
          .size=${"SMALL" /* Buttons.Button.Size.SMALL */}
          @click=${input.onDismiss}></dt-close-button>
    </div>`, target, {
        container: {
            classes: ['flex-none'],
            ...(jslog ? { attributes: { jslog } } : {}),
        },
    });
    // clang-format on
};
export class Infobar extends Widget {
    #type;
    #text;
    #actions;
    #disableSetting;
    #jslogContext;
    #view;
    #detailsRows = [];
    #closeCallback = null;
    #parentView;
    #needsUpdate = true;
    constructor(typeOrElement, textOrView, actions, disableSetting, jslogContext, view = DEFAULT_VIEW) {
        if (typeof typeOrElement === 'string') {
            super(undefined, { useShadowDom: 'pure' });
            this.#type = typeOrElement;
            this.#text = typeof textOrView === 'string' ? textOrView : '';
            this.#actions = actions;
            this.#disableSetting = disableSetting || null;
            this.#jslogContext = jslogContext;
            this.#view = view;
            // Flush initial render synchronously for legacy positional callers such as OverlaysImpl
            // (#positionInfoBarBanner) that measure clientHeight immediately and synchronous DOM unit tests.
            this.performUpdate();
        }
        else {
            super(typeOrElement, { useShadowDom: 'pure' });
            this.#type = "info" /* Type.INFO */;
            this.#text = '';
            this.#disableSetting = null;
            this.#view = typeof textOrView === 'function' ? textOrView : DEFAULT_VIEW;
        }
    }
    static create(type, text, actions, disableSetting, jslogContext, view = DEFAULT_VIEW) {
        if (disableSetting?.get()) {
            return null;
        }
        return new Infobar(type, text, actions, disableSetting, jslogContext, view);
    }
    get type() {
        return this.#type;
    }
    set type(type) {
        if (this.#type === type) {
            return;
        }
        this.#type = type;
        this.#needsUpdate = true;
        this.requestUpdate();
    }
    get text() {
        return this.#text;
    }
    set text(text) {
        if (this.#text === text) {
            return;
        }
        this.#text = text;
        this.#needsUpdate = true;
        this.requestUpdate();
        void this.updateComplete.then(() => this.#onResize());
    }
    get actions() {
        return this.#actions;
    }
    set actions(actions) {
        if (this.#actions === actions) {
            return;
        }
        this.#actions = actions;
        this.#needsUpdate = true;
        this.requestUpdate();
    }
    get disableSetting() {
        return this.#disableSetting;
    }
    set disableSetting(disableSetting) {
        if (this.#disableSetting === disableSetting) {
            return;
        }
        this.#disableSetting = disableSetting;
        this.#needsUpdate = true;
        this.requestUpdate();
    }
    get jslogContext() {
        return this.#jslogContext;
    }
    set jslogContext(jslogContext) {
        if (this.#jslogContext === jslogContext) {
            return;
        }
        this.#jslogContext = jslogContext;
        this.#needsUpdate = true;
        this.requestUpdate();
    }
    get detailsRows() {
        return this.#detailsRows;
    }
    set detailsRows(detailsRows) {
        if (this.#detailsRows === detailsRows) {
            return;
        }
        this.#detailsRows = detailsRows;
        this.#needsUpdate = true;
        this.requestUpdate();
    }
    get onClose() {
        return this.#closeCallback;
    }
    set onClose(callback) {
        this.#closeCallback = callback;
    }
    dispose() {
        if (!(this.element instanceof WidgetElement)) {
            this.detach();
        }
        if (this.#closeCallback) {
            this.#closeCallback.call(null);
        }
    }
    setText(text) {
        if (this.#text === text) {
            return;
        }
        this.#text = text;
        // TODO: migrate to `requestUpdate()` once legacy synchronous callers use declarative views.
        this.performUpdate();
        this.#onResize();
    }
    setCloseCallback(callback) {
        this.#closeCallback = callback;
    }
    setParentView(parentView) {
        this.#parentView = parentView;
    }
    wasShown() {
        super.wasShown();
        if (this.#needsUpdate) {
            this.requestUpdate();
        }
    }
    wasHidden() {
        super.wasHidden();
        this.#onResize();
    }
    performUpdate() {
        this.#needsUpdate = false;
        this.#view({
            type: this.#type,
            text: this.#text,
            actions: this.#actions,
            hasDisableSetting: Boolean(this.#disableSetting),
            jslogContext: this.#jslogContext,
            detailsRows: this.#detailsRows,
            onDisable: this.#onDisable.bind(this),
            onAction: this.#onAction.bind(this),
            onDismiss: this.dispose.bind(this),
        }, undefined, this.contentElement);
    }
    #onAction(action) {
        if (action.delegate) {
            action.delegate();
        }
        if (action.dismiss) {
            this.dispose();
        }
    }
    #onResize() {
        (this.#parentView ?? this.parentWidget())?.doResize();
    }
    #onDisable() {
        if (this.#disableSetting) {
            this.#disableSetting.set(true);
        }
        this.dispose();
    }
    createDetailsRowMessage(message) {
        this.#detailsRows = [...this.#detailsRows, message];
        // TODO: migrate to `requestUpdate()` once legacy synchronous callers use declarative views.
        this.performUpdate();
    }
}
export var Type;
(function (Type) {
    Type["WARNING"] = "warning";
    Type["INFO"] = "info";
    Type["ISSUE"] = "issue";
    Type["ERROR"] = "error";
})(Type || (Type = {}));
const TYPE_TO_ICON = {
    ["warning" /* Type.WARNING */]: 'warning',
    ["info" /* Type.INFO */]: 'info',
    ["issue" /* Type.ISSUE */]: 'issue-text-filled',
    ["error" /* Type.ERROR */]: 'cross-circle',
};
//# sourceMappingURL=Infobar.js.map