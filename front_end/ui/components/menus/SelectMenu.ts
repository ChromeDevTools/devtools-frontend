// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../core/platform/platform.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as RenderCoordinator from '../../../ui/components/render_coordinator/render_coordinator.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import * as Dialogs from '../dialogs/dialogs.js';

import {
  MenuGroup,
  type MenuItemSelectedEvent,
  type MenuItemValue,
} from './Menu.js';
import selectMenuStylesRaw from './selectMenu.css.js';
import selectMenuButtonStylesRaw from './selectMenuButton.css.js';

// TODO(crbug.com/391381439): Fully migrate off of constructed style sheets.
const selectMenuStyles = new CSSStyleSheet();
selectMenuStyles.replaceSync(selectMenuStylesRaw.cssContent);

// TODO(crbug.com/391381439): Fully migrate off of constructed style sheets.
const selectMenuButtonStyles = new CSSStyleSheet();
selectMenuButtonStyles.replaceSync(selectMenuButtonStylesRaw.cssContent);

const {html} = Lit;

export interface SelectMenuData {
  /**
   * Determines where the dialog with the menu will show relative to
   * the show button.
   * Defaults to Bottom.
   */
  position: Dialogs.Dialog.DialogVerticalPosition;
  /**
   * Determines where the dialog with the menu will show horizontally
   * relative to the show button.
   * Defaults to Auto
   */
  horizontalAlignment: Dialogs.Dialog.DialogHorizontalAlignment;
  /**
   * The title of the menu button. Can be either a string or a function
   * that returns a Lit template.
   * If not set, the title of the button will default to the selected
   * item's text.
   */
  buttonTitle: string|TitleCallback;
  /**
   * Determines if an arrow, pointing to the opposite side of
   * the dialog, is shown at the end of the button.
   * Defaults to false.
   */
  showArrow: boolean;
  /**
   * Determines if the component is formed by two buttons:
   * one to open the meny and another that triggers a
   * selectmenusidebuttonclickEvent. The RecordMenu instance of
   * the component is an example of this use case.
   * Defaults to false.
   */
  sideButton: boolean;
  /**
   * Whether the menu button is disabled.
   * Defaults to false.
   */
  disabled: boolean;
  /**
   * Determines if dividing lines between the menu's options
   * are shown.
   */
  showDivider: boolean;
  /**
   * Determines if the selected item is marked using a checkmark.
   * Defaults to true.
   */
  showSelectedItem: boolean;
  /**
   * Specifies a context for the visual element.
   */
  jslogContext: string;
}
type TitleCallback = () => Lit.TemplateResult;

const deployMenuArrow = new URL('../../../Images/triangle-down.svg', import.meta.url).toString();

export class SelectMenu extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});
  readonly #renderBound = this.#render.bind(this);
  #button: SelectMenuButton|null = null;
  #open = false;
  #props: SelectMenuData = {
    buttonTitle: '',
    position: Dialogs.Dialog.DialogVerticalPosition.BOTTOM,
    horizontalAlignment: Dialogs.Dialog.DialogHorizontalAlignment.AUTO,
    showArrow: false,
    sideButton: false,
    showDivider: false,
    disabled: false,
    showSelectedItem: true,
    jslogContext: '',
  };

  get buttonTitle(): string|TitleCallback {
    return this.#props.buttonTitle;
  }

  set buttonTitle(buttonTitle: string|TitleCallback) {
    this.#props.buttonTitle = buttonTitle;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#renderBound);
  }

  get position(): Dialogs.Dialog.DialogVerticalPosition {
    return this.#props.position;
  }

  set position(position: Dialogs.Dialog.DialogVerticalPosition) {
    this.#props.position = position;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#renderBound);
  }

  get horizontalAlignment(): Dialogs.Dialog.DialogHorizontalAlignment {
    return this.#props.horizontalAlignment;
  }

  set horizontalAlignment(horizontalAlignment: Dialogs.Dialog.DialogHorizontalAlignment) {
    this.#props.horizontalAlignment = horizontalAlignment;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#renderBound);
  }

  get showArrow(): boolean {
    return this.#props.showArrow;
  }

  set showArrow(showArrow: boolean) {
    this.#props.showArrow = showArrow;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#renderBound);
  }

  get sideButton(): boolean {
    return this.#props.sideButton;
  }

  set sideButton(sideButton: boolean) {
    this.#props.sideButton = sideButton;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#renderBound);
  }

  get disabled(): boolean {
    return this.#props.disabled;
  }

  set disabled(disabled: boolean) {
    this.#props.disabled = disabled;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#renderBound);
  }

  get showDivider(): boolean {
    return this.#props.showDivider;
  }

  set showDivider(showDivider: boolean) {
    this.#props.showDivider = showDivider;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#renderBound);
  }

  get showSelectedItem(): boolean {
    return this.#props.showSelectedItem;
  }

  set showSelectedItem(showSelectedItem: boolean) {
    this.#props.showSelectedItem = showSelectedItem;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#renderBound);
  }

  get jslogContext(): string {
    return this.#props.jslogContext;
  }

  set jslogContext(jslogContext: string) {
    this.#props.jslogContext = jslogContext;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#renderBound);
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [selectMenuStyles];
  }

  #getButton(): SelectMenuButton {
    if (!this.#button) {
      this.#button = this.#shadow.querySelector('devtools-select-menu-button');
      if (!this.#button) {
        throw new Error('Arrow not found');
      }
    }
    return this.#button;
  }

  #showMenu(): void {
    this.#open = true;
    this.setAttribute('has-open-dialog', 'has-open-dialog');
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#renderBound);
  }

  override click(): void {
    this.#getButton().click();
  }

  #sideButtonClicked(): void {
    this.dispatchEvent(new SelectMenuSideButtonClickEvent());
  }

  #getButtonText(): Lit.TemplateResult|string {
    return this.buttonTitle instanceof Function ? this.buttonTitle() : this.buttonTitle;
  }

  #renderButton(): Lit.TemplateResult {
    const buttonLabel = this.#getButtonText();
    if (!this.sideButton) {
      // clang-format off
      return html`
          <devtools-select-menu-button
            @selectmenubuttontrigger=${this.#showMenu}
            .open=${this.#open} .showArrow=${this.showArrow}
            .arrowDirection=${this.position}
            .disabled=${this.disabled}
            .jslogContext=${this.jslogContext}>
              ${buttonLabel}
            </devtools-select-menu-button>
        `;
      // clang-format on
    }

    // clang-format off
    return html`
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
    // clang-format on
  }

  #onMenuClose(evt?: Dialogs.Dialog.ClickOutsideDialogEvent): void {
    if (evt) {
      evt.stopImmediatePropagation();
    }
    void RenderCoordinator.write(() => {
      this.removeAttribute('has-open-dialog');
    });
    this.#open = false;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#renderBound);
  }

  #onItemSelected(evt: MenuItemSelectedEvent): void {
    this.dispatchEvent(new SelectMenuItemSelectedEvent(evt.itemValue));
  }

  async #render(): Promise<void> {
    if (!ComponentHelpers.ScheduledRender.isScheduledRender(this)) {
      throw new Error('SelectMenu render was not scheduled');
    }
    Lit.render(
        html`
      <devtools-menu
        @menucloserequest=${this.#onMenuClose}
        @menuitemselected=${this.#onItemSelected}
        .position=${this.position}
        .origin=${this}
        .showDivider=${this.showDivider}
        .showSelectedItem=${this.showSelectedItem}
        .open=${this.#open}
        .getConnectorCustomXPosition=${null}
      >
      <slot>
      </slot>
      </devtools-menu>
      ${this.#renderButton()}
    `,
        this.#shadow, {host: this});
    // clang-format on
  }
}

export interface SelectMenuButtonData {
  showArrow: boolean;
  arrowDirection: Dialogs.Dialog.DialogVerticalPosition;
  disabled: boolean;
  singleArrow: boolean;
  jslogContext: string;
}
export class SelectMenuButton extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});
  readonly #renderBound = this.#render.bind(this);
  #showButton: HTMLButtonElement|null = null;

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [selectMenuButtonStyles];
    this.style.setProperty('--deploy-menu-arrow', `url(${deployMenuArrow})`);
    void RenderCoordinator.write(() => {
      switch (this.arrowDirection) {
        case Dialogs.Dialog.DialogVerticalPosition.AUTO:
        case Dialogs.Dialog.DialogVerticalPosition.TOP: {
          this.style.setProperty('--arrow-angle', '180deg');
          break;
        }
        case Dialogs.Dialog.DialogVerticalPosition.BOTTOM: {
          this.style.setProperty('--arrow-angle', '0deg');
          break;
        }
        default:
          Platform.assertNever(this.arrowDirection, `Unknown position type: ${this.arrowDirection}`);
      }
    });
  }
  #props: SelectMenuButtonData = {
    showArrow: false,
    arrowDirection: Dialogs.Dialog.DialogVerticalPosition.BOTTOM,
    disabled: false,
    singleArrow: false,
    jslogContext: '',
  };

  get showArrow(): boolean {
    return this.#props.showArrow;
  }

  set showArrow(showArrow: boolean) {
    this.#props.showArrow = showArrow;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#renderBound);
  }

  get arrowDirection(): Dialogs.Dialog.DialogVerticalPosition {
    return this.#props.arrowDirection;
  }

  set arrowDirection(arrowDirection: Dialogs.Dialog.DialogVerticalPosition) {
    this.#props.arrowDirection = arrowDirection;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#renderBound);
  }

  get disabled(): boolean {
    return this.#props.disabled;
  }

  set disabled(disabled: boolean) {
    this.#props.disabled = disabled;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#renderBound);
  }

  set open(open: boolean) {
    void RenderCoordinator.write(() => {
      this.#getShowButton()?.setAttribute('aria-expanded', String(open));
    });
  }

  set singleArrow(singleArrow: boolean) {
    this.#props.singleArrow = singleArrow;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#renderBound);
  }

  get jslogContext(): string {
    return this.#props.jslogContext;
  }

  set jslogContext(jslogContext: string) {
    this.#props.jslogContext = jslogContext;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#renderBound);
  }

  override click(): void {
    this.#getShowButton()?.click();
  }

  #getShowButton(): HTMLButtonElement|null {
    if (!this.#showButton) {
      this.#showButton = this.#shadow.querySelector('button');
    }
    return this.#showButton;
  }

  #handleButtonKeyDown(evt: KeyboardEvent): void {
    const key = evt.key;
    const shouldShowDialogBelow = this.arrowDirection === Dialogs.Dialog.DialogVerticalPosition.BOTTOM &&
        key === Platform.KeyboardUtilities.ArrowKey.DOWN;
    const shouldShowDialogAbove = this.arrowDirection === Dialogs.Dialog.DialogVerticalPosition.TOP &&
        key === Platform.KeyboardUtilities.ArrowKey.UP;
    const isEnter = key === Platform.KeyboardUtilities.ENTER_KEY;
    const isSpace = evt.code === 'Space';
    if (shouldShowDialogBelow || shouldShowDialogAbove || isEnter || isSpace) {
      this.dispatchEvent(new SelectMenuButtonTriggerEvent());
      evt.preventDefault();
    }
  }

  #handleClick(): void {
    this.dispatchEvent(new SelectMenuButtonTriggerEvent());
  }

  async #render(): Promise<void> {
    if (!ComponentHelpers.ScheduledRender.isScheduledRender(this)) {
      throw new Error('SelectMenuItem render was not scheduled');
    }
    const arrow = this.#props.showArrow ? html`<span id="arrow"></span>` : Lit.nothing;
    const classMap = {'single-arrow': this.#props.singleArrow};
    // clang-format off
      const buttonTitle = html`
      <span id="button-label-wrapper">
        <span id="label" ?witharrow=${this.showArrow} class=${Lit.Directives.classMap(classMap)}><slot></slot></span>
        ${arrow}
      </span>
      `;

    // clang-format off
    Lit.render(html`
      <button aria-haspopup="true" aria-expanded="false" class="show" @keydown=${this.#handleButtonKeyDown} @click=${this.#handleClick} ?disabled=${this.disabled} jslog=${VisualLogging.dropDown(this.jslogContext)}>${buttonTitle}</button>
    `, this.#shadow, { host: this });
    // clang-format on
  }
}

customElements.define('devtools-select-menu', SelectMenu);
customElements.define('devtools-select-menu-button', SelectMenuButton);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-select-menu': SelectMenu;
    'devtools-select-menu-button': SelectMenuButton;
  }

  interface HTMLElementEventMap {
    [SelectMenuItemSelectedEvent.eventName]: SelectMenuItemSelectedEvent;
  }
}

export class SelectMenuItemSelectedEvent extends Event {
  static readonly eventName = 'selectmenuselected';

  constructor(public itemValue: SelectMenuItemValue) {
    super(SelectMenuItemSelectedEvent.eventName, {bubbles: true, composed: true});
  }
}

export class SelectMenuSideButtonClickEvent extends Event {
  static readonly eventName = 'selectmenusidebuttonclick';
  constructor() {
    super(SelectMenuSideButtonClickEvent.eventName, {bubbles: true, composed: true});
  }
}

export class SelectMenuButtonTriggerEvent extends Event {
  static readonly eventName = 'selectmenubuttontrigger';
  constructor() {
    super(SelectMenuButtonTriggerEvent.eventName, {bubbles: true, composed: true});
  }
}

// Exported artifacts used in this component and that belong to the Menu are
// renamed to only make reference to the SelectMenu. This way, the Menu API
// doesn't have to be used in SelectMenu usages and the SelectMenu implementation
// can remain transparent to its users.
export type SelectMenuItemValue = MenuItemValue;
export {MenuGroup as SelectMenuGroup};
