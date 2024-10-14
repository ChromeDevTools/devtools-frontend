// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../core/platform/platform.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as Coordinator from '../../../ui/components/render_coordinator/render_coordinator.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import * as Dialogs from '../dialogs/dialogs.js';

import menuStyles from './menu.css.js';
import menuGroupStyles from './menuGroup.css.js';
import menuItemStyles from './menuItem.css.js';

const {html} = LitHtml;

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

export interface MenuData {
  /**
   * Whether the menu is open.
   */
  open: boolean;
  /**
   * Determines where the dialog with the menu will show relative to
   * the menu's origin.
   * Defaults to Bottom.
   */
  position: Dialogs.Dialog.DialogVerticalPosition;
  /**
   * Position or point the dialog is shown relative to.
   */
  origin: Dialogs.Dialog.DialogOrigin;
  /**
   * Determines if a connector from the dialog to it's origin
   * is shown.
   * Defaults to false.
   */
  showConnector: boolean;
  /**
   * Determines if dividing lines between the menu's options
   * are shown.
   * Defaults to false.
   */
  showDivider: boolean;
  /**
   * Determines if the selected item is marked using a checkmark.
   * Defaults to true.
   */
  showSelectedItem: boolean;
  /**
   * Determines where the dialog with the menu will show horizontally
   * relative to the show button.
   * Defaults to Auto
   */
  horizontalAlignment: Dialogs.Dialog.DialogHorizontalAlignment;
  /**
   * Optional function used to the determine the x coordinate of the connector's
   * end (tip of the triangle), relative to the viewport. If not defined, the x
   * coordinate of the origin's center is used instead.
   */
  getConnectorCustomXPosition: (() => number)|null;
}

const selectedItemCheckmark = new URL('../../../Images/checkmark.svg', import.meta.url).toString();

export class Menu extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});
  readonly #renderBound = this.#render.bind(this);
  #dialog: Dialogs.Dialog.Dialog|null = null;
  #itemIsFocused = false;
  #props: MenuData = {
    origin: null,
    open: false,
    position: Dialogs.Dialog.DialogVerticalPosition.AUTO,
    showConnector: false,
    showDivider: false,
    showSelectedItem: true,
    horizontalAlignment: Dialogs.Dialog.DialogHorizontalAlignment.AUTO,
    getConnectorCustomXPosition: null,
  };

  get origin(): Dialogs.Dialog.DialogOrigin {
    return this.#props.origin;
  }

  set origin(origin: Dialogs.Dialog.DialogOrigin) {
    this.#props.origin = origin;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#renderBound);
  }

  get open(): boolean {
    return this.#props.open;
  }

  set open(open: boolean) {
    if (open === this.open) {
      return;
    }
    this.#props.open = open;
    this.toggleAttribute('has-open-dialog', this.open);
    void this.#getDialog().setDialogVisible(this.open);
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#renderBound);
  }

  get position(): Dialogs.Dialog.DialogVerticalPosition {
    return this.#props.position;
  }

  set position(position: Dialogs.Dialog.DialogVerticalPosition) {
    this.#props.position = position;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#renderBound);
  }

  get showConnector(): boolean {
    return this.#props.showConnector;
  }

  set showConnector(showConnector: boolean) {
    this.#props.showConnector = showConnector;
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

  get horizontalAlignment(): Dialogs.Dialog.DialogHorizontalAlignment {
    return this.#props.horizontalAlignment;
  }

  set horizontalAlignment(horizontalAlignment: Dialogs.Dialog.DialogHorizontalAlignment) {
    this.#props.horizontalAlignment = horizontalAlignment;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#renderBound);
  }

  get getConnectorCustomXPosition(): (() => number)|null {
    return this.#props.getConnectorCustomXPosition;
  }

  set getConnectorCustomXPosition(connectorXPosition: (() => number)|null) {
    this.#props.getConnectorCustomXPosition = connectorXPosition;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#renderBound);
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [menuStyles];
    void coordinator.write(() => {
      this.style.setProperty('--selected-item-check', `url(${selectedItemCheckmark})`);
      this.style.setProperty('--menu-checkmark-width', this.#props.showSelectedItem ? '26px' : '0px');
      this.style.setProperty('--menu-checkmark-height', this.#props.showSelectedItem ? '12px' : '0px');
      const dividerLine = this.showDivider ? '1px var(--divider-line) solid' : 'none';
      this.style.setProperty('--override-divider-line', dividerLine);
    });
  }

  #getDialog(): Dialogs.Dialog.Dialog {
    if (!this.#dialog) {
      throw new Error('Dialog not found');
    }
    return this.#dialog;
  }

  async #dialogDeployed(): Promise<void> {
    await coordinator.write(() => {
      this.setAttribute('has-open-dialog', 'has-open-dialog');
      // Focus the container so tha twe can capture key events.
      const container = this.#shadow.querySelector('#container');
      if (!(container instanceof HTMLElement)) {
        return;
      }
      container.focus();
    });
  }

  #focusFirstItem(): void {
    this.#getFirstItem().focus();
  }

  #getFirstItem(): HTMLElement {
    const defaultSlot = this.#shadow.querySelector('slot') as HTMLSlotElement;
    const items = defaultSlot?.assignedElements();
    let firstItem = items[0];
    if (firstItem instanceof HTMLSlotElement) {
      firstItem = firstItem?.assignedElements()[0];
    }
    if (firstItem instanceof MenuGroup) {
      const groupDefaultSlot = firstItem.shadowRoot?.querySelector('slot') as HTMLSlotElement;
      firstItem = groupDefaultSlot?.assignedElements()[0];
    }
    if (firstItem instanceof HTMLElement) {
      return firstItem;
    }
    throw new Error('First item not found');
  }

  #handleItemClick(evt: MouseEvent): void {
    const path = evt.composedPath();
    evt.stopPropagation();

    // If the clicked item is an input element, do not follow the default behaviour.
    if (path.find(element => element instanceof HTMLInputElement)) {
      return;
    }
    const item = evt.composedPath().find(element => element instanceof MenuItem);
    // Compare against MenuItem again to narrow the item's type.
    if (!(item instanceof MenuItem)) {
      return;
    }
    this.#updateSelectedValue(item);
  }

  #handleDialogKeyDown(evt: KeyboardEvent): void {
    const key = evt.key;
    evt.stopImmediatePropagation();
    let item: EventTarget|null|undefined = evt.target;
    const path = evt.composedPath();
    const shouldFocusFirstItem =
        key === Platform.KeyboardUtilities.ArrowKey.DOWN || key === Platform.KeyboardUtilities.ArrowKey.RIGHT;
    if (!this.#itemIsFocused && shouldFocusFirstItem) {
      this.#focusFirstItem();
      this.#itemIsFocused = true;
      return;
    }
    if (!this.#itemIsFocused && key === Platform.KeyboardUtilities.ArrowKey.UP) {
      this.#focusLastItem();
      this.#itemIsFocused = true;
      return;
    }
    // The focused item could be nested inside the MenuItem, hence
    // find the MenuItem item inside the event's composed path.
    if (!(item instanceof MenuItem)) {
      item = path.find(element => element instanceof MenuItem);

      // Compare against MenuItem again to narrow the item's type.
      if (!(item instanceof MenuItem)) {
        return;
      }
    }
    if (Platform.KeyboardUtilities.keyIsArrowKey(key)) {
      this.#handleArrowKeyNavigation(key, item);
    } else if (key === 'Home') {
      this.#handleHomeKeyDown(item);
    } else if (key === 'End') {
      this.#focusLastItem();
    } else if (key === 'Enter' || evt.code === 'Space') {
      this.#updateSelectedValue(item);
    } else if (key === 'Escape') {
      evt.preventDefault();
      this.#closeDialog();
    }
  }

  #updateSelectedValue(item: MenuItem): void {
    if (item.value === '') {
      return;
    }
    this.dispatchEvent(new MenuItemSelectedEvent(item.value));
    if (item.preventMenuCloseOnSelection) {
      return;
    }
    this.#closeDialog();
  }

  #handleArrowKeyNavigation(key: Platform.KeyboardUtilities.ArrowKey, currentItem: MenuItem): void {
    let nextSibling: Element|null = currentItem;
    if (key === Platform.KeyboardUtilities.ArrowKey.DOWN) {
      nextSibling = currentItem.nextElementSibling;
      // Handle last item in a group and navigating down:
      if (nextSibling === null && currentItem.parentElement instanceof MenuGroup) {
        nextSibling = this.#firstItemInNextGroup(currentItem);
      }
    } else if (key === Platform.KeyboardUtilities.ArrowKey.UP) {
      nextSibling = currentItem.previousElementSibling;
      // Handle first item in a group and navigating up:
      if (nextSibling === null && currentItem.parentElement instanceof MenuGroup) {
        nextSibling = this.#lastItemInPreviousGroup(currentItem);
      }
    }
    if (nextSibling instanceof MenuItem) {
      nextSibling.focus();
    }
  }
  #firstItemInNextGroup(currentItem: MenuItem): MenuItem|null {
    const parentElement = currentItem.parentElement;
    if (!(parentElement instanceof MenuGroup)) {
      return null;
    }
    const parentNextSibling = parentElement.nextElementSibling;
    if (parentNextSibling instanceof MenuItem) {
      return parentNextSibling;
    }
    if (!(parentNextSibling instanceof MenuGroup)) {
      return null;
    }
    for (const child of parentNextSibling.children) {
      if (child instanceof MenuItem) {
        return child;
      }
    }
    return null;
  }

  #lastItemInPreviousGroup(currentItem: MenuItem): MenuItem|null {
    const parentElement = currentItem.parentElement;
    if (!(parentElement instanceof MenuGroup)) {
      return null;
    }
    const parentPreviousSibling = parentElement.previousElementSibling;
    if (parentPreviousSibling instanceof MenuItem) {
      return parentPreviousSibling;
    }
    if (!(parentPreviousSibling instanceof MenuGroup)) {
      return null;
    }
    if (parentPreviousSibling.lastElementChild instanceof MenuItem) {
      return parentPreviousSibling.lastElementChild;
    }
    return null;
  }

  #handleHomeKeyDown(currentItem: MenuItem): void {
    let topMenuPart: Element|null = currentItem;
    if (currentItem.parentElement instanceof MenuGroup) {
      topMenuPart = currentItem.parentElement;
    }
    while (topMenuPart?.previousElementSibling) {
      topMenuPart = topMenuPart?.previousElementSibling;
    }
    if (topMenuPart instanceof MenuItem) {
      topMenuPart.focus();
      return;
    }
    for (const child of topMenuPart.children) {
      if (child instanceof MenuItem) {
        child.focus();
        return;
      }
    }
  }

  #focusLastItem(): void {
    const currentItem = this.#getFirstItem();
    let lastMenuPart: Element|null = currentItem;
    if (currentItem.parentElement instanceof MenuGroup) {
      lastMenuPart = currentItem.parentElement;
    }
    while (lastMenuPart?.nextElementSibling) {
      lastMenuPart = lastMenuPart?.nextElementSibling;
    }
    if (lastMenuPart instanceof MenuItem) {
      lastMenuPart.focus();
      return;
    }
    if (lastMenuPart instanceof MenuGroup && lastMenuPart.lastElementChild instanceof MenuItem) {
      lastMenuPart.lastElementChild.focus();
    }
  }

  #closeDialog(evt?: Dialogs.Dialog.ClickOutsideDialogEvent): void {
    if (evt) {
      evt.stopImmediatePropagation();
    }
    this.dispatchEvent(new MenuCloseRequest());
    void this.#getDialog().setDialogVisible(false);
    this.#itemIsFocused = false;
  }

  async #render(): Promise<void> {
    if (!ComponentHelpers.ScheduledRender.isScheduledRender(this)) {
      throw new Error('Menu render was not scheduled');
    }
    // clang-format off
    LitHtml.render(html`
      <devtools-dialog
        @clickoutsidedialog=${this.#closeDialog}
        @forceddialogclose=${this.#closeDialog}
        .position=${this.position}
        .showConnector=${this.showConnector}
        .origin=${this.origin}
        .dialogShownCallback=${this.#dialogDeployed.bind(this)}
        .horizontalAlignment=${this.horizontalAlignment}
        .getConnectorCustomXPosition=${this.getConnectorCustomXPosition}
        on-render=${ComponentHelpers.Directives.nodeRenderedCallback((domNode: Element) => {
          this.#dialog = domNode as Dialogs.Dialog.Dialog;
        })}
        >
        <span id="container" role="menu" tabIndex="0" @keydown=${this.#handleDialogKeyDown} jslog=${VisualLogging.menu().track({resize: true, keydown: 'Escape'})}>
          <slot @click=${this.#handleItemClick}>
          </slot>
        </span>
      </devtools-dialog>
    `, this.#shadow, { host: this });
    // clang-format on
  }
}

interface MenuItemData {
  /**
   * If true, selecting the item (by clicking it or pressing enter when its focused)
   * would not cause the menu to be closed.
   * Defaults to false.
   */
  preventMenuCloseOnSelection: boolean;
  /**
   * The value associated with this item. It is used to determine what item is selected
   * and is the data sent in a MenuItemSelectedEvent, when an item is selected.
   */
  value: MenuItemValue;
  /**
   * Whether the item is selected.
   */
  selected: boolean;
}

export class MenuItem extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});
  readonly #renderBound = this.#render.bind(this);
  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [menuItemStyles];
    this.tabIndex = 0;
    this.setAttribute('role', 'menuitem');
  }
  #props: MenuItemData = {
    value: '',
    preventMenuCloseOnSelection: false,
    selected: false,
  };

  get preventMenuCloseOnSelection(): boolean {
    return this.#props.preventMenuCloseOnSelection;
  }

  set preventMenuCloseOnSelection(preventMenuCloseOnSelection: boolean) {
    this.#props.preventMenuCloseOnSelection = preventMenuCloseOnSelection;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#renderBound);
  }

  get value(): MenuItemValue {
    return this.#props.value;
  }

  set value(value: MenuItemValue) {
    this.#props.value = value;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#renderBound);
  }

  get selected(): boolean {
    return this.#props.selected;
  }

  set selected(selected: boolean) {
    this.#props.selected = selected;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#renderBound);
  }

  async #render(): Promise<void> {
    if (!ComponentHelpers.ScheduledRender.isScheduledRender(this)) {
      throw new Error('MenuItem render was not scheduled');
    }
    // clang-format off

    LitHtml.render(html`
      <span class=${LitHtml.Directives.classMap({
        'menu-item': true,
        'is-selected-item': this.selected,
        'prevents-close': this.preventMenuCloseOnSelection,
      })}
      >
        <slot></slot>
      </span>
    `, this.#shadow, { host: this });
    // clang-format on
  }
}

interface MenuGroupData {
  name: string|null;
}

export class MenuGroup extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});
  readonly #renderBound = this.#render.bind(this);
  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [menuGroupStyles];
  }

  #props: MenuGroupData = {
    name: null,
  };

  get name(): string|null {
    return this.#props.name;
  }

  set name(name: string|null) {
    this.#props.name = name;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#renderBound);
  }

  async #render(): Promise<void> {
    if (!ComponentHelpers.ScheduledRender.isScheduledRender(this)) {
      throw new Error('MenuGroup render was not scheduled');
    }
    // clang-format off
    LitHtml.render(html`
      <span class="menu-group">
        <span class="menu-group-label">${this.name}</span>
        <slot></slot>
      </span>
    `, this.#shadow, { host: this });
    // clang-format on
  }
}

customElements.define('devtools-menu', Menu);
customElements.define('devtools-menu-item', MenuItem);
customElements.define('devtools-menu-group', MenuGroup);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-menu': Menu;
    'devtools-menu-item': MenuItem;
    'devtools-menu-group': MenuGroup;
  }

  interface HTMLElementEventMap {
    [MenuItemSelectedEvent.eventName]: MenuItemSelectedEvent;
    [MenuCloseRequest.eventName]: MenuCloseRequest;
  }
}

export class MenuItemSelectedEvent extends Event {
  static readonly eventName = 'menuitemselected';

  constructor(public itemValue: MenuItemValue) {
    super(MenuItemSelectedEvent.eventName, {bubbles: true, composed: true});
  }
}
export class MenuCloseRequest extends Event {
  static readonly eventName = 'menucloserequest';
  constructor() {
    super(MenuCloseRequest.eventName, {bubbles: true, composed: true});
  }
}

export type MenuItemValue = string|number|boolean;
