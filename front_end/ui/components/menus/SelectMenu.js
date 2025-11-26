// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view, @devtools/enforce-custom-element-definitions-location */
import * as Platform from '../../../core/platform/platform.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as RenderCoordinator from '../../../ui/components/render_coordinator/render_coordinator.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import * as Dialogs from '../dialogs/dialogs.js';
import { MenuGroup, } from './Menu.js';
import selectMenuStyles from './selectMenu.css.js';
import selectMenuButtonStyles from './selectMenuButton.css.js';
const { html } = Lit;
const deployMenuArrow = new URL('../../../Images/triangle-down.svg', import.meta.url).toString();
/**
 * @deprecated use `<select>` instead.
 */
export class SelectMenu extends HTMLElement {
    #shadow = this.attachShadow({ mode: 'open' });
    #button = null;
    #open = false;
    #props = {
        buttonTitle: '',
        position: "bottom" /* Dialogs.Dialog.DialogVerticalPosition.BOTTOM */,
        horizontalAlignment: "auto" /* Dialogs.Dialog.DialogHorizontalAlignment.AUTO */,
        showArrow: false,
        sideButton: false,
        showDivider: false,
        disabled: false,
        showSelectedItem: true,
        jslogContext: '',
    };
    get buttonTitle() {
        return this.#props.buttonTitle;
    }
    set buttonTitle(buttonTitle) {
        this.#props.buttonTitle = buttonTitle;
        void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
    }
    get position() {
        return this.#props.position;
    }
    set position(position) {
        this.#props.position = position;
        void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
    }
    get horizontalAlignment() {
        return this.#props.horizontalAlignment;
    }
    set horizontalAlignment(horizontalAlignment) {
        this.#props.horizontalAlignment = horizontalAlignment;
        void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
    }
    get showArrow() {
        return this.#props.showArrow;
    }
    set showArrow(showArrow) {
        this.#props.showArrow = showArrow;
        void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
    }
    get sideButton() {
        return this.#props.sideButton;
    }
    set sideButton(sideButton) {
        this.#props.sideButton = sideButton;
        void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
    }
    get disabled() {
        return this.#props.disabled;
    }
    set disabled(disabled) {
        this.#props.disabled = disabled;
        void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
    }
    get showDivider() {
        return this.#props.showDivider;
    }
    set showDivider(showDivider) {
        this.#props.showDivider = showDivider;
        void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
    }
    get showSelectedItem() {
        return this.#props.showSelectedItem;
    }
    set showSelectedItem(showSelectedItem) {
        this.#props.showSelectedItem = showSelectedItem;
        void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
    }
    get jslogContext() {
        return this.#props.jslogContext;
    }
    set jslogContext(jslogContext) {
        this.#props.jslogContext = jslogContext;
        void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
    }
    #getButton() {
        if (!this.#button) {
            this.#button = this.#shadow.querySelector('devtools-select-menu-button');
            if (!this.#button) {
                throw new Error('Arrow not found');
            }
        }
        return this.#button;
    }
    #showMenu() {
        this.#open = true;
        this.setAttribute('has-open-dialog', 'has-open-dialog');
        void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
    }
    click() {
        this.#getButton().click();
    }
    #sideButtonClicked() {
        this.dispatchEvent(new SelectMenuSideButtonClickEvent());
    }
    #getButtonText() {
        return this.buttonTitle instanceof Function ? this.buttonTitle() : this.buttonTitle;
    }
    #renderButton() {
        const buttonLabel = this.#getButtonText();
        if (!this.sideButton) {
            // clang-format off
            /* eslint-disable @devtools/no-deprecated-component-usages */
            return html `
          <devtools-select-menu-button
            @selectmenubuttontrigger=${this.#showMenu}
            .open=${this.#open} .showArrow=${this.showArrow}
            .arrowDirection=${this.position}
            .disabled=${this.disabled}
            .jslogContext=${this.jslogContext}>
              ${buttonLabel}
            </devtools-select-menu-button>
        `;
            /* eslint-enable @devtools/no-deprecated-component-usages */
            // clang-format on
        }
        // clang-format off
        /* eslint-disable @devtools/no-deprecated-component-usages */
        return html `
      <button id="side-button" @click=${this.#sideButtonClicked} ?disabled=${this.disabled}>
        ${buttonLabel}
      </button>
      <devtools-select-menu-button
        @click=${this.#showMenu}
        @selectmenubuttontrigger=${this.#showMenu}
        .singleArrow=${true}
        .open=${this.#open}
        .showArrow=${true}
        .arrowDirection=${this.position}
        .disabled=${this.disabled}>
      </devtools-select-menu-button>
    `;
        /* eslint-enable @devtools/no-deprecated-component-usages */
        // clang-format on
    }
    #onMenuClose(evt) {
        if (evt) {
            evt.stopImmediatePropagation();
        }
        void RenderCoordinator.write(() => {
            this.removeAttribute('has-open-dialog');
        });
        this.#open = false;
        void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
    }
    #onItemSelected(evt) {
        this.dispatchEvent(new SelectMenuItemSelectedEvent(evt.itemValue));
    }
    async #render() {
        if (!ComponentHelpers.ScheduledRender.isScheduledRender(this)) {
            throw new Error('SelectMenu render was not scheduled');
        }
        // clang-format off
        Lit.render(html `
        <style>${selectMenuStyles}</style>
        <devtools-menu
            @menucloserequest=${this.#onMenuClose}
            @menuitemselected=${this.#onItemSelected}
            .position=${this.position}
            .origin=${this}
            .showDivider=${this.showDivider}
            .showSelectedItem=${this.showSelectedItem}
            .open=${this.#open}
            .getConnectorCustomXPosition=${null}>
          <slot></slot>
        </devtools-menu>
        ${this.#renderButton()}`, this.#shadow, { host: this });
        // clang-format on
    }
}
export class SelectMenuButton extends HTMLElement {
    #shadow = this.attachShadow({ mode: 'open' });
    #showButton = null;
    connectedCallback() {
        this.style.setProperty('--deploy-menu-arrow', `url(${deployMenuArrow})`);
        void RenderCoordinator.write(() => {
            switch (this.arrowDirection) {
                case "auto" /* Dialogs.Dialog.DialogVerticalPosition.AUTO */:
                case "top" /* Dialogs.Dialog.DialogVerticalPosition.TOP */: {
                    this.style.setProperty('--arrow-angle', '180deg');
                    break;
                }
                case "bottom" /* Dialogs.Dialog.DialogVerticalPosition.BOTTOM */: {
                    this.style.setProperty('--arrow-angle', '0deg');
                    break;
                }
                default:
                    Platform.assertNever(this.arrowDirection, `Unknown position type: ${this.arrowDirection}`);
            }
        });
    }
    #props = {
        showArrow: false,
        arrowDirection: "bottom" /* Dialogs.Dialog.DialogVerticalPosition.BOTTOM */,
        disabled: false,
        singleArrow: false,
        jslogContext: '',
    };
    get showArrow() {
        return this.#props.showArrow;
    }
    set showArrow(showArrow) {
        this.#props.showArrow = showArrow;
        void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
    }
    get arrowDirection() {
        return this.#props.arrowDirection;
    }
    set arrowDirection(arrowDirection) {
        this.#props.arrowDirection = arrowDirection;
        void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
    }
    get disabled() {
        return this.#props.disabled;
    }
    set disabled(disabled) {
        this.#props.disabled = disabled;
        void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
    }
    set open(open) {
        void RenderCoordinator.write(() => {
            this.#getShowButton()?.setAttribute('aria-expanded', String(open));
        });
    }
    set singleArrow(singleArrow) {
        this.#props.singleArrow = singleArrow;
        void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
    }
    get jslogContext() {
        return this.#props.jslogContext;
    }
    set jslogContext(jslogContext) {
        this.#props.jslogContext = jslogContext;
        void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
    }
    click() {
        this.#getShowButton()?.click();
    }
    #getShowButton() {
        if (!this.#showButton) {
            this.#showButton = this.#shadow.querySelector('button');
        }
        return this.#showButton;
    }
    #handleButtonKeyDown(evt) {
        const key = evt.key;
        const shouldShowDialogBelow = this.arrowDirection === "bottom" /* Dialogs.Dialog.DialogVerticalPosition.BOTTOM */ &&
            key === "ArrowDown" /* Platform.KeyboardUtilities.ArrowKey.DOWN */;
        const shouldShowDialogAbove = this.arrowDirection === "top" /* Dialogs.Dialog.DialogVerticalPosition.TOP */ &&
            key === "ArrowUp" /* Platform.KeyboardUtilities.ArrowKey.UP */;
        const isEnter = key === Platform.KeyboardUtilities.ENTER_KEY;
        const isSpace = evt.code === 'Space';
        if (shouldShowDialogBelow || shouldShowDialogAbove || isEnter || isSpace) {
            this.dispatchEvent(new SelectMenuButtonTriggerEvent());
            evt.preventDefault();
        }
    }
    #handleClick() {
        this.dispatchEvent(new SelectMenuButtonTriggerEvent());
    }
    async #render() {
        if (!ComponentHelpers.ScheduledRender.isScheduledRender(this)) {
            throw new Error('SelectMenuItem render was not scheduled');
        }
        const arrow = this.#props.showArrow ? html `<span id="arrow"></span>` : Lit.nothing;
        const classMap = { 'single-arrow': this.#props.singleArrow };
        // clang-format off
        const buttonTitle = html `
      <span id="button-label-wrapper">
        <span id="label" ?witharrow=${this.showArrow} class=${Lit.Directives.classMap(classMap)}>
          <slot></slot>
        </span>
        ${arrow}
      </span>`;
        // clang-format off
        Lit.render(html `
        <style>${selectMenuButtonStyles}</style>
        <button
            aria-haspopup="true" aria-expanded="false" class="show"
            @keydown=${this.#handleButtonKeyDown} @click=${this.#handleClick}
            ?disabled=${this.disabled}
            jslog=${VisualLogging.dropDown(this.jslogContext)}>
          ${buttonTitle}
        </button>`, this.#shadow, { host: this });
        // clang-format on
    }
}
customElements.define('devtools-select-menu', SelectMenu);
customElements.define('devtools-select-menu-button', SelectMenuButton);
export class SelectMenuItemSelectedEvent extends Event {
    itemValue;
    static eventName = 'selectmenuselected';
    constructor(itemValue) {
        super(SelectMenuItemSelectedEvent.eventName, { bubbles: true, composed: true });
        this.itemValue = itemValue;
    }
}
export class SelectMenuSideButtonClickEvent extends Event {
    static eventName = 'selectmenusidebuttonclick';
    constructor() {
        super(SelectMenuSideButtonClickEvent.eventName, { bubbles: true, composed: true });
    }
}
export class SelectMenuButtonTriggerEvent extends Event {
    static eventName = 'selectmenubuttontrigger';
    constructor() {
        super(SelectMenuButtonTriggerEvent.eventName, { bubbles: true, composed: true });
    }
}
export { MenuGroup as SelectMenuGroup };
//# sourceMappingURL=SelectMenu.js.map