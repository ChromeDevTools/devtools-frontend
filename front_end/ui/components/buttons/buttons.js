var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/ui/components/buttons/Button.js
var Button_exports = {};
__export(Button_exports, {
  Button: () => Button
});
import "./../../kit/kit.js";
import * as Lit from "./../../lit/lit.js";
import * as VisualLogging from "./../../visual_logging/visual_logging.js";

// gen/front_end/ui/components/buttons/button.css.js
var button_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

/**
* Design: http://go/cdt-design-button
*/
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/**
* Reset default UA styles for focused elements.
* The button styles below explicitly implement custom focus styles.
*/
*:focus,
*:focus-visible,
:host(:focus),
:host(:focus-visible) {
  outline: none;
}

:host {
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  width: fit-content;
}

button {
  --hover-layer-color: var(--sys-color-state-hover-on-subtle);
  --active-layer-color: var(--sys-color-state-ripple-neutral-on-subtle);
  --button-border-size: 1px;
  --button-height: var(--sys-size-11);
  --button-width: fit-content;

  align-items: center;
  background: transparent;
  border-radius: var(--sys-shape-corner-full);
  cursor: inherit;
  display: inline-flex;
  position: relative;
  font-family: var(--default-font-family);
  font-size: var(--sys-typescale-body4-size);
  font-weight: var(--ref-typeface-weight-medium);
  line-height: var(--sys-typescale-body4-line-height);
  height: var(--button-height);
  justify-content: center;
  padding: 0 var(--sys-size-6);
  white-space: nowrap;
  width: var(--button-width);

  &.primary-toggle {
    --toggle-color: var(--sys-color-primary-bright);
  }

  &.red-toggle {
    --toggle-color: var(--sys-color-error-bright);
  }

  &.inverse {
    --hover-layer-color: var(--sys-color-state-hover-on-prominent);
    --active-layer-color: var(--sys-color-state-ripple-neutral-on-prominent);
  }

  devtools-icon {
    width: var(--icon-size);
    height: var(--icon-size);
  }

  &.toolbar,
  &.icon,
  &.only-icon {
    --button-height: 26px;
    --button-width: 26px;
    --icon-size: var(--sys-size-9);

    padding: 0;
    border: none;
    overflow: hidden;

    &.small {
      --button-height: var(--sys-size-9);
      --button-width: var(--sys-size-9);
      --icon-size: var(--sys-size-8);
    }

    &.micro {
      --button-height: var(--sys-size-8);
      --button-width: var(--sys-size-8);
      --icon-size: var(--sys-size-8);

      border-radius: var(--sys-shape-corner-extra-small);
    }

    &.inverse devtools-icon {
      color:  var(--sys-color-inverse-on-surface);
    }

    &.toggled devtools-icon {
      color: var(--toggle-color); /* stylelint-disable-line plugin/use_theme_colors */

      &.long-click {
        color: var(--icon-default);
      }
    }

    &.checked devtools-icon {
      color: var(--toggle-color); /* stylelint-disable-line plugin/use_theme_colors */

      &::after {
        content: "";
        width: var(--sys-size-3);
        height: var(--sys-size-3);
        border-radius: var(--sys-shape-corner-full);
        background-color: var(--sys-color-primary-bright);
        position: absolute;
        top: var(--dot-toggle-top);
        left: var(--dot-toggle-left);
      }
    }

    devtools-icon.long-click {
      position: absolute;
      top: 2px;
      left: 3px;
    }

    devtools-icon[name='cross-circle-filled'] {
      color: var(--icon-default);
    }
  }

  &.primary {
    --hover-layer-color: var(--sys-color-state-hover-on-prominent);
    --active-layer-color: var(--sys-color-state-ripple-primary);

    border: var(--button-border-size) solid var(--sys-color-primary);
    background: var(--sys-color-primary);
    color: var(--sys-color-on-primary);

    devtools-icon {
      color: var(--sys-color-on-primary);
    }
  }

  &.tonal {
    border: none;
    background: var(--sys-color-tonal-container);
    color: var(--sys-color-on-tonal-container);

    devtools-icon {
      color: var(--sys-color-on-tonal-container);
    }
  }

  &.primary-toolbar {
    devtools-icon {
      color: var(--icon-primary);
    }
  }

  &.text {
    border: none;
    color: var(--sys-color-primary);

    &.inverse {
      color:  var(--sys-color-inverse-primary);
    }

    devtools-icon {
      color: var(--icon-primary);
    }
  }

  &.text-with-icon {
    padding-left: var(--sys-size-4);

    devtools-icon {
      width: var(--sys-size-9);
      height: var(--sys-size-9);
      margin-right: var(--sys-size-2);
    }
  }

  &.outlined {
    border: var(--button-border-size) solid var(--sys-color-tonal-outline);
    background: transparent;
    color: var(--sys-color-primary);

    &.micro {
      --button-height: var(--sys-size-8);
    }

    devtools-icon {
      color: var(--icon-primary);
    }
  }

  &:disabled {
    pointer-events: none;
    color: var(--sys-color-state-disabled);

    &.primary {
      border: var(--button-border-size) solid var(--sys-color-state-disabled-container);
      background: var(--sys-color-state-disabled-container);
    }

    &.tonal {
      border: var(--button-border-size) solid var(--sys-color-state-disabled-container);
      background: var(--sys-color-state-disabled-container);
    }

    &.outlined {
      border: var(--button-border-size) solid var(--sys-color-state-disabled-container);
    }

    &.toolbar,
    &.icon {
      background: transparent;
    }

    devtools-icon {
      color: var(--icon-disabled);
    }
  }

  &:not(.icon, .toolbar).only-icon {
    width: 100%;
    padding: 0;

    &.small {
      width: var(--button-height);
    }
  }

  &:focus-visible {
    outline: var(--sys-size-2) solid var(--sys-color-state-focus-ring);
    outline-offset: var(--sys-size-2);
    z-index: 1;

    &.toolbar,
    &.icon,
    &.reduced-focus-ring {
      outline-offset: calc(-1 * var(--sys-size-2));
    }

    &.only-icon {
      outline: none;

      devtools-icon {
        outline: var(--sys-size-2) solid var(--sys-color-state-focus-ring);
        outline-offset: var(--sys-size-1);
        border-radius: inherit;
      }

      &.micro devtools-icon {
        outline-offset: calc(-1 * var(--sys-size-2));
      }

      &.small devtools-icon {
        outline-offset: 0;
      }
    }
  }

  &:has(.spinner) {
    padding-left: var(--sys-size-4);
  }

  &:hover::after {
    content: "";
    height: 100%;
    width: 100%;
    border-radius: inherit;
    position: absolute;
    top: 0;
    left: 0;
    background-color: var(--hover-layer-color); /* stylelint-disable-line plugin/use_theme_colors */

    &.primary {
      border: var(--button-border-size) solid color-mix(in srgb, var(--sys-color-primary), var(--sys-color-state-hover-on-prominent) 6%);
    }

    &.tonal {
      background: color-mix(in srgb, var(--sys-color-tonal-container), var(--sys-color-state-hover-on-subtle));
    }

    &.toobar {
      devtools-icon {
        color: var(--icon-default-hover);
      }
    }
  }

  &:active::before,
  &.active::before {
    content: "";
    height: 100%;
    width: 100%;
    border-radius: inherit;
    position: absolute;
    top: 0;
    left: 0;
    background-color: var(--active-layer-color); /* stylelint-disable-line plugin/use_theme_colors */

    &.primary {
      border: var(--button-border-size) solid color-mix(in srgb, var(--sys-color-primary), var(--sys-color-state-ripple-primary) 32%);
    }

    &.tonal {
      background: color-mix(in srgb, var(--sys-color-tonal-container), var(--sys-color-state-ripple-primary) 50%);
    }

    &.toolbar {
      devtools-icon {
        color: var(--icon-toggled);
      }
    }
  }
}

.spinner {
  display: block;
  width: 12px;
  height: 12px;
  border-radius: 6px;
  border: 2px solid var(--sys-color-cdt-base-container);
  animation: spinner-animation 1s linear infinite;
  border-right-color: transparent;
  margin-right: 4px;

  &.outlined {
    border: 2px solid var(--sys-color-primary);
    border-right-color: transparent;
  }

  &.disabled {
    border: 2px solid var(--sys-color-state-disabled);
    border-right-color: transparent;
  }
}

@keyframes spinner-animation {
  from {
    transform: rotate(0);
  }

  to {
    transform: rotate(360deg);
  }
}

@media(forced-colors: active) {
  .toggled devtools-icon {
    background-color: canvas;
  }
}

/*# sourceURL=${import.meta.resolve("./button.css")} */`;

// gen/front_end/ui/components/buttons/Button.js
var { html, Directives: { ifDefined, ref, classMap } } = Lit;
var Button = class extends HTMLElement {
  static formAssociated = true;
  #shadow = this.attachShadow({ mode: "open", delegatesFocus: true });
  #boundOnClick = this.#onClick.bind(this);
  #props = {
    size: "REGULAR",
    variant: "primary",
    toggleOnClick: true,
    disabled: false,
    active: false,
    spinner: false,
    type: "button",
    longClickable: false
  };
  #internals = this.attachInternals();
  #slotRef = Lit.Directives.createRef();
  constructor() {
    super();
    this.setAttribute("role", "presentation");
    this.addEventListener("click", this.#boundOnClick, true);
  }
  cloneNode(deep) {
    const node = super.cloneNode(deep);
    Object.assign(node.#props, this.#props);
    node.#render();
    return node;
  }
  /**
   * Perfer using the .data= setter instead of setting the individual properties
   * for increased type-safety.
   */
  set data(data) {
    this.#props.variant = data.variant;
    this.#props.iconName = data.iconName;
    this.#props.toggledIconName = data.toggledIconName;
    this.#props.toggleOnClick = data.toggleOnClick !== void 0 ? data.toggleOnClick : true;
    this.#props.size = "REGULAR";
    if ("size" in data && data.size) {
      this.#props.size = data.size;
    }
    if (data.accessibleLabel) {
      this.#props.accessibleLabel = data.accessibleLabel;
    }
    this.#props.active = Boolean(data.active);
    this.#props.spinner = Boolean("spinner" in data ? data.spinner : false);
    this.#props.type = "button";
    if ("type" in data && data.type) {
      this.#props.type = data.type;
    }
    this.#props.toggled = data.toggled;
    this.#props.toggleType = data.toggleType;
    this.#props.checked = data.checked;
    this.#props.disabled = Boolean(data.disabled);
    this.#props.title = data.title;
    this.#props.jslogContext = data.jslogContext;
    this.#props.longClickable = data.longClickable;
    this.#props.inverseColorTheme = data.inverseColorTheme;
    this.#render();
  }
  set iconName(iconName) {
    this.#props.iconName = iconName;
    this.#render();
  }
  set toggledIconName(toggledIconName) {
    this.#props.toggledIconName = toggledIconName;
    this.#render();
  }
  set toggleType(toggleType) {
    this.#props.toggleType = toggleType;
    this.#render();
  }
  set variant(variant) {
    this.#props.variant = variant;
    this.#render();
  }
  set size(size) {
    this.#props.size = size;
    this.#render();
  }
  set accessibleLabel(label) {
    this.#props.accessibleLabel = label;
    this.#render();
  }
  set reducedFocusRing(reducedFocusRing) {
    this.#props.reducedFocusRing = reducedFocusRing;
    this.#render();
  }
  set type(type) {
    this.#props.type = type;
    this.#render();
  }
  set title(title) {
    this.#props.title = title;
    this.#render();
  }
  get disabled() {
    return this.#props.disabled;
  }
  set disabled(disabled) {
    this.#setDisabledProperty(disabled);
    this.#render();
  }
  set toggleOnClick(toggleOnClick) {
    this.#props.toggleOnClick = toggleOnClick;
    this.#render();
  }
  set toggled(toggled) {
    this.#props.toggled = toggled;
    this.#render();
  }
  get toggled() {
    return Boolean(this.#props.toggled);
  }
  set checked(checked) {
    this.#props.checked = checked;
    this.#render();
  }
  set active(active) {
    this.#props.active = active;
    this.#render();
  }
  get active() {
    return this.#props.active;
  }
  set spinner(spinner) {
    this.#props.spinner = spinner;
    this.#render();
  }
  get jslogContext() {
    return this.#props.jslogContext;
  }
  set jslogContext(jslogContext) {
    this.#props.jslogContext = jslogContext;
    this.#render();
  }
  set longClickable(longClickable) {
    this.#props.longClickable = longClickable;
    this.#render();
  }
  set inverseColorTheme(inverseColorTheme) {
    this.#props.inverseColorTheme = inverseColorTheme;
    this.#render();
  }
  #setDisabledProperty(disabled) {
    this.#props.disabled = disabled;
    this.#render();
  }
  connectedCallback() {
    this.#render();
  }
  #onClick(event) {
    if (this.#props.disabled) {
      event.stopPropagation();
      event.preventDefault();
      return;
    }
    if (this.form && this.#props.type === "submit") {
      event.preventDefault();
      this.form.dispatchEvent(new SubmitEvent("submit", {
        submitter: this
      }));
    }
    if (this.form && this.#props.type === "reset") {
      event.preventDefault();
      this.form.reset();
    }
    if (this.#props.toggleOnClick && this.#props.variant === "icon_toggle" && this.#props.iconName) {
      this.toggled = !this.#props.toggled;
    }
  }
  #isToolbarVariant() {
    return this.#props.variant === "toolbar" || this.#props.variant === "primary_toolbar";
  }
  #render() {
    const nodes = this.#slotRef.value?.assignedNodes();
    const isEmpty = !Boolean(nodes?.length);
    if (!this.#props.variant) {
      throw new Error("Button requires a variant to be defined");
    }
    if (this.#isToolbarVariant()) {
      if (!this.#props.iconName) {
        throw new Error("Toolbar button requires an icon");
      }
      if (!isEmpty) {
        throw new Error("Toolbar button does not accept children");
      }
    }
    if (this.#props.variant === "icon") {
      if (!this.#props.iconName) {
        throw new Error("Icon button requires an icon");
      }
      if (!isEmpty) {
        throw new Error("Icon button does not accept children");
      }
    }
    const hasIcon = Boolean(this.#props.iconName);
    const classes = {
      primary: this.#props.variant === "primary",
      tonal: this.#props.variant === "tonal",
      outlined: this.#props.variant === "outlined",
      text: this.#props.variant === "text",
      toolbar: this.#isToolbarVariant(),
      "primary-toolbar": this.#props.variant === "primary_toolbar",
      icon: this.#props.variant === "icon" || this.#props.variant === "icon_toggle" || this.#props.variant === "adorner_icon",
      "primary-toggle": this.#props.toggleType === "primary-toggle",
      "red-toggle": this.#props.toggleType === "red-toggle",
      toggled: Boolean(this.#props.toggled),
      checked: Boolean(this.#props.checked),
      "text-with-icon": hasIcon && !isEmpty,
      "only-icon": hasIcon && isEmpty,
      micro: this.#props.size === "MICRO",
      small: this.#props.size === "SMALL",
      "reduced-focus-ring": Boolean(this.#props.reducedFocusRing),
      active: this.#props.active,
      inverse: Boolean(this.#props.inverseColorTheme)
    };
    const spinnerClasses = {
      primary: this.#props.variant === "primary",
      outlined: this.#props.variant === "outlined",
      disabled: this.#props.disabled,
      spinner: true
    };
    const jslog = this.#props.jslogContext && VisualLogging.action().track({ click: true }).context(this.#props.jslogContext);
    Lit.render(html`
        <style>${button_css_default}</style>
        <button title=${ifDefined(this.#props.title)}
                ?disabled=${this.#props.disabled}
                class=${classMap(classes)}
                aria-pressed=${ifDefined(this.#props.toggled)}
                aria-label=${ifDefined(this.#props.accessibleLabel)}
                jslog=${ifDefined(jslog)}>
          ${hasIcon ? html`
            <devtools-icon name=${ifDefined(this.#props.toggled ? this.#props.toggledIconName : this.#props.iconName)}>
            </devtools-icon>` : ""}
          ${this.#props.longClickable ? html`
              <devtools-icon name="triangle-bottom-right" class="long-click">
              </devtools-icon>` : ""}
          ${this.#props.spinner ? html`<span class=${classMap(spinnerClasses)}></span>` : ""}
          <slot @slotchange=${this.#render} ${ref(this.#slotRef)}></slot>
        </button>
      `, this.#shadow, { host: this });
  }
  // Based on https://web.dev/more-capable-form-controls/ to make custom elements form-friendly.
  // Form controls usually expose a "value" property.
  get value() {
    return this.#props.value || "";
  }
  set value(value) {
    this.#props.value = value;
  }
  // The following properties and methods aren't strictly required,
  // but browser-level form controls provide them. Providing them helps
  // ensure consistency with browser-provided controls.
  get form() {
    return this.#internals.form;
  }
  get name() {
    return this.getAttribute("name");
  }
  get type() {
    return this.#props.type;
  }
  get validity() {
    return this.#internals.validity;
  }
  get validationMessage() {
    return this.#internals.validationMessage;
  }
  get willValidate() {
    return this.#internals.willValidate;
  }
  checkValidity() {
    return this.#internals.checkValidity();
  }
  reportValidity() {
    return this.#internals.reportValidity();
  }
};
customElements.define("devtools-button", Button);

// gen/front_end/ui/components/buttons/FloatingButton.js
var FloatingButton_exports = {};
__export(FloatingButton_exports, {
  FloatingButton: () => FloatingButton,
  create: () => create
});
import "./../../kit/kit.js";
import * as VisualLogging2 from "./../../visual_logging/visual_logging.js";
import * as Lit2 from "./../../lit/lit.js";

// gen/front_end/ui/components/buttons/floatingButton.css.js
var floatingButton_css_default = `/*
 * Copyright 2024 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  width: fit-content;
  height: fit-content;
}

button {
  padding: 0;
  margin: 0;
  background: 0;
  border: 0;
  position: relative;
  width: var(--sys-size-8);
  height: var(--sys-size-8);
  box-shadow: var(--sys-elevation-level2);
  border-radius: var(--sys-shape-corner-extra-small);
  display: flex;
  justify-content: center;
  align-items: center;

  :host-context(:not(.theme-with-dark-background)) & {
    background-color: var(--sys-color-tonal-container);
  }

  :host-context(.theme-with-dark-background) & {
    background-color: var(--sys-color-primary);
  }

  & > devtools-icon {
    width: var(--sys-size-7);
    height: var(--sys-size-7);
  }

  :host-context(:not(.theme-with-dark-background)) & > devtools-icon {
    color: var(--sys-color-on-tonal-container);
  }

  :host-context(.theme-with-dark-background) & > devtools-icon {
    color: var(--sys-color-on-primary);
  }

  &:not(:disabled):hover::after,
  &:not(:disabled):hover::before {
    content: "";
    height: 100%;
    width: 100%;
    border-radius: inherit;
    position: absolute;
    top: 0;
    left: 0;
  }

  &:not(:disabled):hover::after {
    background-color: var(--sys-color-state-hover-on-subtle);
  }

  &:not(:disabled):active::before {
    background-color: var(--sys-color-state-ripple-neutral-on-subtle);
  }

  &:focus-visible {
    outline: 2px solid var(--sys-color-state-focus-ring);
    outline-offset: 2px;
  }

  &:disabled > devtools-icon {
    color: var(--sys-color-state-disabled);
  }
}

/*# sourceURL=${import.meta.resolve("./floatingButton.css")} */`;

// gen/front_end/ui/components/buttons/FloatingButton.js
var { html: html2 } = Lit2;
var FloatingButton = class extends HTMLElement {
  static observedAttributes = ["icon-name", "jslogcontext"];
  #shadow = this.attachShadow({ mode: "open" });
  constructor() {
    super();
    this.role = "presentation";
    this.#render();
  }
  /**
   * Yields the value of the `"icon-name"` attribute of this `FloatingButton`
   * (`null` in case there's no `"icon-name"` on this element).
   */
  get iconName() {
    return this.getAttribute("icon-name");
  }
  /**
   * Changes the value of the `"icon-name"` attribute of this `FloatingButton`.
   * If you pass `null`, the `"icon-name"` attribute will be removed from this
   * element.
   *
   * @param the new icon name or `null` to unset.
   */
  set iconName(iconName) {
    if (iconName === null) {
      this.removeAttribute("icon-name");
    } else {
      this.setAttribute("icon-name", iconName);
    }
  }
  get jslogContext() {
    return this.getAttribute("jslogcontext");
  }
  set jslogContext(jslogContext) {
    if (jslogContext === null) {
      this.removeAttribute("jslogcontext");
    } else {
      this.setAttribute("jslogcontext", jslogContext);
    }
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) {
      return;
    }
    if (name === "icon-name") {
      this.#render();
    }
    if (name === "jslogcontext") {
      this.#updateJslog();
    }
  }
  #render() {
    Lit2.render(html2`
        <style>${floatingButton_css_default}</style>
        <button><devtools-icon .name=${this.iconName}></devtools-icon></button>`, this.#shadow, { host: this });
  }
  #updateJslog() {
    if (this.jslogContext) {
      this.setAttribute("jslog", `${VisualLogging2.action().track({ click: true }).context(this.jslogContext)}`);
    } else {
      this.removeAttribute("jslog");
    }
  }
};
var create = (iconName, title, jslogContext) => {
  const floatingButton = new FloatingButton();
  floatingButton.iconName = iconName;
  floatingButton.title = title;
  if (jslogContext) {
    floatingButton.jslogContext = jslogContext;
  }
  return floatingButton;
};
customElements.define("devtools-floating-button", FloatingButton);

// gen/front_end/ui/components/buttons/textButton.css.js
var textButton_css_default = `/*
 * Copyright 2014 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.text-button {
  margin: 2px;
  height: 24px;
  font-size: 12px;
  font-family: var(--default-font-family);
  border: 1px solid var(--sys-color-tonal-outline);
  border-radius: 12px;
  padding: 0 12px;
  font-weight: 500;
  color: var(--sys-color-primary);
  background-color: var(--sys-color-cdt-base-container);
  flex: none;
  white-space: nowrap;
}

.text-button:disabled {
  opacity: 38%;
}

.text-button:not(:disabled):focus,
.text-button:not(:disabled):hover,
.text-button:not(:disabled):active {
  background-color: var(--sys-color-state-hover-on-subtle);
}

.text-button:not(:disabled, .primary-button):focus-visible {
  outline: 2px solid var(--sys-color-state-focus-ring);
  color: var(--sys-color-on-primary);
  background-color: var(--sys-color-cdt-base-container);
}

.text-button:not(:disabled, .running):focus,
.text-button:not(:disabled, .running):hover,
.text-button:not(:disabled, .running):active {
  color: var(--sys-color-primary);
}

.text-button.link-style,
.text-button.link-style:hover,
.text-button.link-style:active {
  background: none;
  border: none;
  outline: none;
  border-radius: 2px;
  margin: 0;
  padding: 0 !important; /* stylelint-disable-line declaration-no-important */
  font: inherit;
  cursor: pointer;
  height: unset;
}

.text-button.primary-button,
.text-button.primary-button:not(:disabled):focus {
  background-color: var(--sys-color-primary);
  border: none;
  color: var(--sys-color-on-primary);
}

.text-button.primary-button:not(:disabled):active {
  background-color: color-mix(in srgb, var(--sys-color-primary), var(--sys-color-state-ripple-primary) 32%);
  color: var(--sys-color-on-primary);
}

.text-button.primary-button:not(:disabled):hover {
  background-color: color-mix(in srgb, var(--sys-color-primary), var(--sys-color-state-hover-on-prominent) 6%);
  color: var(--sys-color-on-primary);
}

.text-button.primary-button:not(:disabled):focus-visible {
  background-color: var(--sys-color-primary);
  outline-offset: 2px;
  outline: 2px solid var(--sys-color-state-focus-ring);
  color: var(--sys-color-on-primary);
}

@media (forced-colors: active) {
  .text-button {
    background-color: ButtonFace;
    color: ButtonText;
    border-color: ButtonText;
  }

  .text-button:disabled {
    forced-color-adjust: none;
    opacity: 100%;
    background: ButtonFace;
    border-color: GrayText;
    color: GrayText;
  }

  .text-button:not(:disabled):focus-visible {
    forced-color-adjust: none;
    background-color: ButtonFace;
    color: Highlight !important; /* stylelint-disable-line declaration-no-important */
    border-color: Highlight;
    outline: 2px solid ButtonText;
    box-shadow: var(--legacy-focus-ring-active-shadow);
  }

  .text-button:not(:disabled):hover,
  .text-button:not(:disabled):active {
    forced-color-adjust: none;
    background-color: Highlight;
    color: HighlightText !important; /* stylelint-disable-line declaration-no-important */
    box-shadow: var(--sys-color-primary);
  }

  .text-button.primary-button {
    forced-color-adjust: none;
    background-color: Highlight;
    color: HighlightText;
    border: 1px solid Highlight;
  }

  .text-button.primary-button:not(:disabled):focus-visible {
    background-color: Highlight;
    color: HighlightText !important; /* stylelint-disable-line declaration-no-important */
    border-color: ButtonText;
  }

  .text-button.primary-button:not(:disabled):hover,
  .text-button.primary-button:not(:disabled):active {
    background-color: HighlightText;
    color: Highlight !important; /* stylelint-disable-line declaration-no-important */
    border-color: Highlight;
  }
}

/*# sourceURL=${import.meta.resolve("./textButton.css")} */`;
export {
  Button_exports as Button,
  FloatingButton_exports as FloatingButton,
  textButton_css_default as textButtonStyles
};
//# sourceMappingURL=buttons.js.map
