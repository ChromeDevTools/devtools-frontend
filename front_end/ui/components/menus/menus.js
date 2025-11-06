var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/ui/components/menus/Menu.js
var Menu_exports = {};
__export(Menu_exports, {
  Menu: () => Menu,
  MenuCloseRequest: () => MenuCloseRequest,
  MenuGroup: () => MenuGroup,
  MenuItem: () => MenuItem,
  MenuItemSelectedEvent: () => MenuItemSelectedEvent
});
import * as Platform from "./../../../core/platform/platform.js";
import * as ComponentHelpers from "./../helpers/helpers.js";
import * as RenderCoordinator from "./../render_coordinator/render_coordinator.js";
import * as Lit from "./../../lit/lit.js";
import * as VisualLogging from "./../../visual_logging/visual_logging.js";
import * as Dialogs from "./../dialogs/dialogs.js";

// gen/front_end/ui/components/menus/menu.css.js
var menu_css_default = `/*
 * Copyright 2023 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  border-radius: 3px;
  width: fit-content;
  display: flex;
  align-items: center;
  background-color: var(--override-menu-background-color, var(--sys-color-cdt-base-container));
}

:host([has-open-dialog]) {
  background-color: var(--override-menu-active-background-color, var(--sys-color-neutral-container));
}

#container {
  list-style-type: none;
  margin-top: var(--sys-size-4);
  padding: 0;
  width: fit-content;
  display: block;
}

#container:focus {
  outline: none;
}

@keyframes slideIn {
  from {
    transform: var(--translate-dialog);
    opacity: 0%;
  }

  to {
    transform: none;
    opacity: 100%;
  }
}

/*# sourceURL=${import.meta.resolve("./menu.css")} */`;

// gen/front_end/ui/components/menus/menuGroup.css.js
var menuGroup_css_default = `/*
 * Copyright 2023 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.menu-group-label {
  font-size: 12px;
  line-height: 16px;
  position: relative;
  color: var(--sys-color-token-subtle);
  display: block;
}

/*# sourceURL=${import.meta.resolve("./menuGroup.css")} */`;

// gen/front_end/ui/components/menus/menuItem.css.js
var menuItem_css_default = `/*
 * Copyright 2023 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.menu-item {
  padding: var(--sys-size-3) 0 var(--sys-size-3) var(--sys-size-9);
  font-size: 12px;
  line-height: 16px;
  position: relative;
  display: block;
  color: var(--sys-color-on-surface);
}

.menu-item:focus {
  outline: none;
}

:host(.no-checkmark) .menu-item {
  padding-left: 0;
}

:host(:not(:first-child)) .menu-item {
  border-top: var(--override-divider-line);
}

:host-context(devtools-menu-group) .menu-item {
  padding: var(--sys-size-3) 0 var(--sys-size-3) var(--sys-size-9);
}

.is-selected-item::before {
  content: "";
  position: absolute;
  left: var(--sys-size-2);
  top: 50%;
  transform: translateY(-50%);
  display: inline-block;
  mask-repeat: no-repeat;
  mask-position: center;
  width: calc(var(--menu-checkmark-width) - 10px);
  height: var(--menu-checkmark-height);
  mask-image: var(--selected-item-check);
  background: var(--sys-color-token-subtle);
}

.is-disabled-item {
  opacity: 60%;
}

:host(:hover:not(.prevents-close)) .menu-item::after,
:host(:focus-visible:not(.prevents-close)) .menu-item::after {
  content: "";
  height: 100%;
  width: calc(100% + 2* var(--sys-size-8));
  border-radius: inherit;
  position: absolute;
  top: 0;
  left: calc(-1 * var(--sys-size-8));
  background-color: var(--sys-color-state-hover-on-subtle);
}

:host(:focus) {
  outline: none;
}

/*# sourceURL=${import.meta.resolve("./menuItem.css")} */`;

// gen/front_end/ui/components/menus/Menu.js
var { html, Directives: { ref } } = Lit;
var selectedItemCheckmark = new URL("../../../Images/checkmark.svg", import.meta.url).toString();
var Menu = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #dialog = null;
  #itemIsFocused = false;
  #props = {
    origin: null,
    open: false,
    position: "auto",
    showDivider: false,
    showSelectedItem: true,
    horizontalAlignment: "auto",
    getConnectorCustomXPosition: null
  };
  get origin() {
    return this.#props.origin;
  }
  set origin(origin) {
    this.#props.origin = origin;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }
  get open() {
    return this.#props.open;
  }
  set open(open) {
    if (open === this.open) {
      return;
    }
    this.#props.open = open;
    this.toggleAttribute("has-open-dialog", this.open);
    void this.#getDialog().setDialogVisible(this.open);
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }
  get position() {
    return this.#props.position;
  }
  set position(position) {
    this.#props.position = position;
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
  get horizontalAlignment() {
    return this.#props.horizontalAlignment;
  }
  set horizontalAlignment(horizontalAlignment) {
    this.#props.horizontalAlignment = horizontalAlignment;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }
  get getConnectorCustomXPosition() {
    return this.#props.getConnectorCustomXPosition;
  }
  set getConnectorCustomXPosition(connectorXPosition) {
    this.#props.getConnectorCustomXPosition = connectorXPosition;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }
  connectedCallback() {
    void RenderCoordinator.write(() => {
      this.style.setProperty("--selected-item-check", `url(${selectedItemCheckmark})`);
      this.style.setProperty("--menu-checkmark-width", this.#props.showSelectedItem ? "26px" : "0px");
      this.style.setProperty("--menu-checkmark-height", this.#props.showSelectedItem ? "12px" : "0px");
      const dividerLine = this.showDivider ? "1px var(--divider-line) solid" : "none";
      this.style.setProperty("--override-divider-line", dividerLine);
    });
  }
  #getDialog() {
    if (!this.#dialog) {
      throw new Error("Dialog not found");
    }
    return this.#dialog;
  }
  async #dialogDeployed() {
    await RenderCoordinator.write(() => {
      this.setAttribute("has-open-dialog", "has-open-dialog");
      const container = this.#shadow.querySelector("#container");
      if (!(container instanceof HTMLElement)) {
        return;
      }
      container.focus();
    });
  }
  #focusFirstItem() {
    this.#getFirstItem().focus();
  }
  #getFirstItem() {
    const defaultSlot = this.#shadow.querySelector("slot");
    const items = defaultSlot?.assignedElements();
    let firstItem = items[0];
    if (firstItem instanceof HTMLSlotElement) {
      firstItem = firstItem?.assignedElements()[0];
    }
    if (firstItem instanceof MenuGroup) {
      const groupDefaultSlot = firstItem.shadowRoot?.querySelector("slot");
      firstItem = groupDefaultSlot?.assignedElements()[0];
    }
    if (firstItem instanceof HTMLElement) {
      return firstItem;
    }
    throw new Error("First item not found");
  }
  #handleItemClick(evt) {
    const path = evt.composedPath();
    evt.stopPropagation();
    if (path.find((element) => element instanceof HTMLInputElement)) {
      return;
    }
    const item = evt.composedPath().find((element) => element instanceof MenuItem);
    if (!(item instanceof MenuItem)) {
      return;
    }
    if (item.disabled) {
      return;
    }
    this.#updateSelectedValue(item);
  }
  #handleDialogKeyDown(evt) {
    const key = evt.key;
    evt.stopImmediatePropagation();
    let item = evt.target;
    const path = evt.composedPath();
    const shouldFocusFirstItem = key === "ArrowDown" || key === "ArrowRight";
    if (!this.#itemIsFocused && shouldFocusFirstItem) {
      this.#focusFirstItem();
      this.#itemIsFocused = true;
      return;
    }
    if (!this.#itemIsFocused && key === "ArrowUp") {
      this.#focusLastItem();
      this.#itemIsFocused = true;
      return;
    }
    if (!(item instanceof MenuItem)) {
      item = path.find((element) => element instanceof MenuItem);
      if (!(item instanceof MenuItem)) {
        return;
      }
    }
    if (Platform.KeyboardUtilities.keyIsArrowKey(key)) {
      this.#handleArrowKeyNavigation(key, item);
    } else if (key === "Home") {
      this.#handleHomeKeyDown(item);
    } else if (key === "End") {
      this.#focusLastItem();
    } else if (key === "Enter" || evt.code === "Space") {
      this.#updateSelectedValue(item);
    } else if (key === "Escape") {
      evt.preventDefault();
      this.#closeDialog();
    }
  }
  #updateSelectedValue(item) {
    if (item.value === "") {
      return;
    }
    this.dispatchEvent(new MenuItemSelectedEvent(item.value));
    if (item.preventMenuCloseOnSelection) {
      return;
    }
    this.#closeDialog();
  }
  #handleArrowKeyNavigation(key, currentItem) {
    let nextSibling = currentItem;
    if (key === "ArrowDown") {
      nextSibling = currentItem.nextElementSibling;
      if (nextSibling === null && currentItem.parentElement instanceof MenuGroup) {
        nextSibling = this.#firstItemInNextGroup(currentItem);
      }
    } else if (key === "ArrowUp") {
      nextSibling = currentItem.previousElementSibling;
      if (nextSibling === null && currentItem.parentElement instanceof MenuGroup) {
        nextSibling = this.#lastItemInPreviousGroup(currentItem);
      }
    }
    if (nextSibling instanceof MenuItem) {
      nextSibling.focus();
    }
  }
  #firstItemInNextGroup(currentItem) {
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
  #lastItemInPreviousGroup(currentItem) {
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
  #handleHomeKeyDown(currentItem) {
    let topMenuPart = currentItem;
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
  #focusLastItem() {
    const currentItem = this.#getFirstItem();
    let lastMenuPart = currentItem;
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
  #closeDialog(evt) {
    if (evt) {
      evt.stopImmediatePropagation();
    }
    this.dispatchEvent(new MenuCloseRequest());
    void this.#getDialog().setDialogVisible(false);
    this.#itemIsFocused = false;
  }
  async #render() {
    if (!ComponentHelpers.ScheduledRender.isScheduledRender(this)) {
      throw new Error("Menu render was not scheduled");
    }
    Lit.render(html`
      <style>${menu_css_default}</style>
      <devtools-dialog
        @clickoutsidedialog=${this.#closeDialog}
        @forceddialogclose=${this.#closeDialog}
        .position=${this.position}
        .origin=${this.origin}
        .dialogShownCallback=${this.#dialogDeployed.bind(this)}
        .horizontalAlignment=${this.horizontalAlignment}
        .getConnectorCustomXPosition=${this.getConnectorCustomXPosition}
        ${ref((el) => {
      if (el instanceof HTMLElement) {
        this.#dialog = el;
      }
    })}
        >
        <span id="container" role="menu" tabIndex="0" @keydown=${this.#handleDialogKeyDown} jslog=${VisualLogging.menu().track({ resize: true, keydown: "Escape" })}>
          <slot @click=${this.#handleItemClick}>
          </slot>
        </span>
      </devtools-dialog>
    `, this.#shadow, { host: this });
  }
};
var MenuItem = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  connectedCallback() {
    this.tabIndex = 0;
    this.setAttribute("role", "menuitem");
  }
  #props = {
    value: "",
    preventMenuCloseOnSelection: false,
    selected: false,
    disabled: false
  };
  get preventMenuCloseOnSelection() {
    return this.#props.preventMenuCloseOnSelection;
  }
  set preventMenuCloseOnSelection(preventMenuCloseOnSelection) {
    this.#props.preventMenuCloseOnSelection = preventMenuCloseOnSelection;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }
  get value() {
    return this.#props.value;
  }
  set value(value) {
    this.#props.value = value;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }
  get selected() {
    return this.#props.selected;
  }
  set selected(selected) {
    this.#props.selected = selected;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }
  get disabled() {
    return this.#props.disabled;
  }
  set disabled(disabled) {
    this.#props.disabled = disabled;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }
  async #render() {
    if (!ComponentHelpers.ScheduledRender.isScheduledRender(this)) {
      throw new Error("MenuItem render was not scheduled");
    }
    Lit.render(html`
      <style>${menuItem_css_default}</style>
      <span class=${Lit.Directives.classMap({
      "menu-item": true,
      "is-selected-item": this.selected,
      "is-disabled-item": this.disabled,
      "prevents-close": this.preventMenuCloseOnSelection
    })}
      >
        <slot></slot>
      </span>
    `, this.#shadow, { host: this });
  }
};
var MenuGroup = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #props = {
    name: null
  };
  get name() {
    return this.#props.name;
  }
  set name(name) {
    this.#props.name = name;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }
  async #render() {
    if (!ComponentHelpers.ScheduledRender.isScheduledRender(this)) {
      throw new Error("MenuGroup render was not scheduled");
    }
    Lit.render(html`
      <style>${menuGroup_css_default}</style>
      <span class="menu-group">
        <span class="menu-group-label">${this.name}</span>
        <slot></slot>
      </span>
    `, this.#shadow, { host: this });
  }
};
customElements.define("devtools-menu", Menu);
customElements.define("devtools-menu-item", MenuItem);
customElements.define("devtools-menu-group", MenuGroup);
var MenuItemSelectedEvent = class _MenuItemSelectedEvent extends Event {
  itemValue;
  static eventName = "menuitemselected";
  constructor(itemValue) {
    super(_MenuItemSelectedEvent.eventName, { bubbles: true, composed: true });
    this.itemValue = itemValue;
  }
};
var MenuCloseRequest = class _MenuCloseRequest extends Event {
  static eventName = "menucloserequest";
  constructor() {
    super(_MenuCloseRequest.eventName, { bubbles: true, composed: true });
  }
};

// gen/front_end/ui/components/menus/SelectMenu.js
var SelectMenu_exports = {};
__export(SelectMenu_exports, {
  SelectMenu: () => SelectMenu,
  SelectMenuButton: () => SelectMenuButton,
  SelectMenuButtonTriggerEvent: () => SelectMenuButtonTriggerEvent,
  SelectMenuGroup: () => MenuGroup,
  SelectMenuItemSelectedEvent: () => SelectMenuItemSelectedEvent,
  SelectMenuSideButtonClickEvent: () => SelectMenuSideButtonClickEvent
});
import * as Platform2 from "./../../../core/platform/platform.js";
import * as ComponentHelpers2 from "./../helpers/helpers.js";
import * as RenderCoordinator2 from "./../render_coordinator/render_coordinator.js";
import * as Lit2 from "./../../lit/lit.js";
import * as VisualLogging2 from "./../../visual_logging/visual_logging.js";
import * as Dialogs2 from "./../dialogs/dialogs.js";

// gen/front_end/ui/components/menus/selectMenu.css.js
var selectMenu_css_default = `/*
 * Copyright 2023 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  border: 1px solid var(--sys-color-neutral-outline);
  border-radius: var(--sys-shape-corner-extra-small);
  width: fit-content;
  display: flex;
  align-items: center;
  background-color: var(--sys-color-cdt-base-container);
}

:host([has-open-dialog]) {
  outline: var(--sys-size-2) solid var(--sys-color-state-focus-ring);
  background:
    linear-gradient(var(--sys-color-state-hover-on-subtle), var(--sys-color-state-hover-on-subtle)),
    linear-gradient(var(--sys-color-state-ripple-neutral-on-subtle), var(--sys-color-state-ripple-neutral-on-subtle));
}

button {
  background: none;
}

#side-button {
  border: 1px solid var(--sys-color-neutral-outline);
  border-radius: 3px 0 0 3px;
  border-right: none;
  height: 100%;
  position: relative;
  padding: var(--override-select-button-padding);
}

button:disabled {
  pointer-events: none;
}

@keyframes slideIn {
  from {
    transform: var(--translate-dialog);
    opacity: 0%;
  }

  to {
    transform: none;
    opacity: 100%;
  }
}

/*# sourceURL=${import.meta.resolve("./selectMenu.css")} */`;

// gen/front_end/ui/components/menus/selectMenuButton.css.js
var selectMenuButton_css_default = `/*
 * Copyright 2023 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  height: var(--sys-size-9);
  width: 100%;
  display: block;
}

.show {
  display: block;
  font-size: 12px;
  color: var(--sys-color-on-surface);
  height: 100%;
  width: 100%;
  border: none;
  border-radius: var(--sys-shape-corner-extra-small);
  padding: 0 var(--sys-size-4) 0 var(--sys-size-5);

  &:hover {
    background-color: var(--sys-color-state-hover-on-subtle);
  }

  &:active {
    background-color: var(--sys-color-state-ripple-neutral-on-subtle);
  }

  &:hover:active {
    background:
      linear-gradient(var(--sys-color-state-hover-on-subtle), var(--sys-color-state-hover-on-subtle)),
      linear-gradient(var(--sys-color-state-ripple-neutral-on-subtle), var(--sys-color-state-ripple-neutral-on-subtle));
  }

  &:focus-visible {
    outline: var(--sys-size-2) solid var(--sys-color-state-focus-ring);
    outline-offset: -1px;
  }
}

#button-label-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

#label {
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
  width: fit-content;
  height: 100%;
}

#label[witharrow].single-arrow {
  padding: 0;
}

#label[witharrow] {
  padding: 0 10px 0 0;
  text-align: left;
}

.single-arrow + span#arrow {
  margin: 0;
}

#arrow {
  mask-image: var(--deploy-menu-arrow);
  -webkit-mask-position-y: center;
  margin-left: 5px;
  width: 14px;
  flex-shrink: 0;
  height: 14px;
  display: inline-block;
  mask-repeat: no-repeat;
  background-color: var(--sys-color-on-surface-subtle);
}

.single-arrow {
  border-radius: 0 3px 3px 0;
  border: var(--sys-size-1) solid var(--sys-color-neutral-outline);
  height: 100%;
  aspect-ratio: 1 / 1;
  padding: 0;
  display: flex;
  justify-content: center;
  align-items: center;
}

button {
  background: none;
}

button[disabled] {
  color: var(--sys-color-state-disabled);
  background-color: var(--sys-color-state-disabled-container);

  #arrow {
    background-color: var(--sys-color-state-disabled);
  }
}

/*# sourceURL=${import.meta.resolve("./selectMenuButton.css")} */`;

// gen/front_end/ui/components/menus/SelectMenu.js
var { html: html2 } = Lit2;
var deployMenuArrow = new URL("../../../Images/triangle-down.svg", import.meta.url).toString();
var SelectMenu = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #button = null;
  #open = false;
  #props = {
    buttonTitle: "",
    position: "bottom",
    horizontalAlignment: "auto",
    showArrow: false,
    sideButton: false,
    showDivider: false,
    disabled: false,
    showSelectedItem: true,
    jslogContext: ""
  };
  get buttonTitle() {
    return this.#props.buttonTitle;
  }
  set buttonTitle(buttonTitle) {
    this.#props.buttonTitle = buttonTitle;
    void ComponentHelpers2.ScheduledRender.scheduleRender(this, this.#render);
  }
  get position() {
    return this.#props.position;
  }
  set position(position) {
    this.#props.position = position;
    void ComponentHelpers2.ScheduledRender.scheduleRender(this, this.#render);
  }
  get horizontalAlignment() {
    return this.#props.horizontalAlignment;
  }
  set horizontalAlignment(horizontalAlignment) {
    this.#props.horizontalAlignment = horizontalAlignment;
    void ComponentHelpers2.ScheduledRender.scheduleRender(this, this.#render);
  }
  get showArrow() {
    return this.#props.showArrow;
  }
  set showArrow(showArrow) {
    this.#props.showArrow = showArrow;
    void ComponentHelpers2.ScheduledRender.scheduleRender(this, this.#render);
  }
  get sideButton() {
    return this.#props.sideButton;
  }
  set sideButton(sideButton) {
    this.#props.sideButton = sideButton;
    void ComponentHelpers2.ScheduledRender.scheduleRender(this, this.#render);
  }
  get disabled() {
    return this.#props.disabled;
  }
  set disabled(disabled) {
    this.#props.disabled = disabled;
    void ComponentHelpers2.ScheduledRender.scheduleRender(this, this.#render);
  }
  get showDivider() {
    return this.#props.showDivider;
  }
  set showDivider(showDivider) {
    this.#props.showDivider = showDivider;
    void ComponentHelpers2.ScheduledRender.scheduleRender(this, this.#render);
  }
  get showSelectedItem() {
    return this.#props.showSelectedItem;
  }
  set showSelectedItem(showSelectedItem) {
    this.#props.showSelectedItem = showSelectedItem;
    void ComponentHelpers2.ScheduledRender.scheduleRender(this, this.#render);
  }
  get jslogContext() {
    return this.#props.jslogContext;
  }
  set jslogContext(jslogContext) {
    this.#props.jslogContext = jslogContext;
    void ComponentHelpers2.ScheduledRender.scheduleRender(this, this.#render);
  }
  #getButton() {
    if (!this.#button) {
      this.#button = this.#shadow.querySelector("devtools-select-menu-button");
      if (!this.#button) {
        throw new Error("Arrow not found");
      }
    }
    return this.#button;
  }
  #showMenu() {
    this.#open = true;
    this.setAttribute("has-open-dialog", "has-open-dialog");
    void ComponentHelpers2.ScheduledRender.scheduleRender(this, this.#render);
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
      return html2`
          <devtools-select-menu-button
            @selectmenubuttontrigger=${this.#showMenu}
            .open=${this.#open} .showArrow=${this.showArrow}
            .arrowDirection=${this.position}
            .disabled=${this.disabled}
            .jslogContext=${this.jslogContext}>
              ${buttonLabel}
            </devtools-select-menu-button>
        `;
    }
    return html2`
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
  }
  #onMenuClose(evt) {
    if (evt) {
      evt.stopImmediatePropagation();
    }
    void RenderCoordinator2.write(() => {
      this.removeAttribute("has-open-dialog");
    });
    this.#open = false;
    void ComponentHelpers2.ScheduledRender.scheduleRender(this, this.#render);
  }
  #onItemSelected(evt) {
    this.dispatchEvent(new SelectMenuItemSelectedEvent(evt.itemValue));
  }
  async #render() {
    if (!ComponentHelpers2.ScheduledRender.isScheduledRender(this)) {
      throw new Error("SelectMenu render was not scheduled");
    }
    Lit2.render(html2`
        <style>${selectMenu_css_default}</style>
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
  }
};
var SelectMenuButton = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #showButton = null;
  connectedCallback() {
    this.style.setProperty("--deploy-menu-arrow", `url(${deployMenuArrow})`);
    void RenderCoordinator2.write(() => {
      switch (this.arrowDirection) {
        case "auto":
        case "top": {
          this.style.setProperty("--arrow-angle", "180deg");
          break;
        }
        case "bottom": {
          this.style.setProperty("--arrow-angle", "0deg");
          break;
        }
        default:
          Platform2.assertNever(this.arrowDirection, `Unknown position type: ${this.arrowDirection}`);
      }
    });
  }
  #props = {
    showArrow: false,
    arrowDirection: "bottom",
    disabled: false,
    singleArrow: false,
    jslogContext: ""
  };
  get showArrow() {
    return this.#props.showArrow;
  }
  set showArrow(showArrow) {
    this.#props.showArrow = showArrow;
    void ComponentHelpers2.ScheduledRender.scheduleRender(this, this.#render);
  }
  get arrowDirection() {
    return this.#props.arrowDirection;
  }
  set arrowDirection(arrowDirection) {
    this.#props.arrowDirection = arrowDirection;
    void ComponentHelpers2.ScheduledRender.scheduleRender(this, this.#render);
  }
  get disabled() {
    return this.#props.disabled;
  }
  set disabled(disabled) {
    this.#props.disabled = disabled;
    void ComponentHelpers2.ScheduledRender.scheduleRender(this, this.#render);
  }
  set open(open) {
    void RenderCoordinator2.write(() => {
      this.#getShowButton()?.setAttribute("aria-expanded", String(open));
    });
  }
  set singleArrow(singleArrow) {
    this.#props.singleArrow = singleArrow;
    void ComponentHelpers2.ScheduledRender.scheduleRender(this, this.#render);
  }
  get jslogContext() {
    return this.#props.jslogContext;
  }
  set jslogContext(jslogContext) {
    this.#props.jslogContext = jslogContext;
    void ComponentHelpers2.ScheduledRender.scheduleRender(this, this.#render);
  }
  click() {
    this.#getShowButton()?.click();
  }
  #getShowButton() {
    if (!this.#showButton) {
      this.#showButton = this.#shadow.querySelector("button");
    }
    return this.#showButton;
  }
  #handleButtonKeyDown(evt) {
    const key = evt.key;
    const shouldShowDialogBelow = this.arrowDirection === "bottom" && key === "ArrowDown";
    const shouldShowDialogAbove = this.arrowDirection === "top" && key === "ArrowUp";
    const isEnter = key === Platform2.KeyboardUtilities.ENTER_KEY;
    const isSpace = evt.code === "Space";
    if (shouldShowDialogBelow || shouldShowDialogAbove || isEnter || isSpace) {
      this.dispatchEvent(new SelectMenuButtonTriggerEvent());
      evt.preventDefault();
    }
  }
  #handleClick() {
    this.dispatchEvent(new SelectMenuButtonTriggerEvent());
  }
  async #render() {
    if (!ComponentHelpers2.ScheduledRender.isScheduledRender(this)) {
      throw new Error("SelectMenuItem render was not scheduled");
    }
    const arrow = this.#props.showArrow ? html2`<span id="arrow"></span>` : Lit2.nothing;
    const classMap = { "single-arrow": this.#props.singleArrow };
    const buttonTitle = html2`
      <span id="button-label-wrapper">
        <span id="label" ?witharrow=${this.showArrow} class=${Lit2.Directives.classMap(classMap)}>
          <slot></slot>
        </span>
        ${arrow}
      </span>`;
    Lit2.render(html2`
        <style>${selectMenuButton_css_default}</style>
        <button
            aria-haspopup="true" aria-expanded="false" class="show"
            @keydown=${this.#handleButtonKeyDown} @click=${this.#handleClick}
            ?disabled=${this.disabled}
            jslog=${VisualLogging2.dropDown(this.jslogContext)}>
          ${buttonTitle}
        </button>`, this.#shadow, { host: this });
  }
};
customElements.define("devtools-select-menu", SelectMenu);
customElements.define("devtools-select-menu-button", SelectMenuButton);
var SelectMenuItemSelectedEvent = class _SelectMenuItemSelectedEvent extends Event {
  itemValue;
  static eventName = "selectmenuselected";
  constructor(itemValue) {
    super(_SelectMenuItemSelectedEvent.eventName, { bubbles: true, composed: true });
    this.itemValue = itemValue;
  }
};
var SelectMenuSideButtonClickEvent = class _SelectMenuSideButtonClickEvent extends Event {
  static eventName = "selectmenusidebuttonclick";
  constructor() {
    super(_SelectMenuSideButtonClickEvent.eventName, { bubbles: true, composed: true });
  }
};
var SelectMenuButtonTriggerEvent = class _SelectMenuButtonTriggerEvent extends Event {
  static eventName = "selectmenubuttontrigger";
  constructor() {
    super(_SelectMenuButtonTriggerEvent.eventName, { bubbles: true, composed: true });
  }
};
export {
  Menu_exports as Menu,
  SelectMenu_exports as SelectMenu
};
//# sourceMappingURL=menus.js.map
