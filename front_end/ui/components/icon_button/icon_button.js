var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/ui/components/icon_button/FileSourceIcon.js
var FileSourceIcon_exports = {};
__export(FileSourceIcon_exports, {
  FileSourceIcon: () => FileSourceIcon
});

// gen/front_end/ui/components/icon_button/IconButton.js
var IconButton_exports = {};
__export(IconButton_exports, {
  IconButton: () => IconButton
});

// gen/front_end/ui/components/icon_button/Icon.js
var Icon_exports = {};
__export(Icon_exports, {
  Icon: () => Icon,
  create: () => create
});
import "./../../../Images/Images.js";

// gen/front_end/ui/components/icon_button/icon.css.js
var icon_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  flex-grow: 0;
  flex-shrink: 0;
  display: inline-block;
  width: 20px;
  height: 20px;
  color: var(--icon-default);
  vertical-align: sub;
  position: relative;
}

:host(.extra-small) {
  height: var(--sys-size-6);
  width: var(--sys-size-6);
}

:host(.small) {
  height: var(--sys-size-7);
  width: var(--sys-size-7);
}

:host(.medium) {
  height: var(--sys-size-8);
  width: var(--sys-size-8);
}

:host(.large) {
  height: 18px;
  width: 18px;
}

:host(.extra-large) {
  height: var(--sys-size-9);
  width: var(--sys-size-9);
}

:host(.toggled) {
  color: var(--icon-toggled);
}

:host([hidden]) {
  display: none;
}

:host([name="warning-filled"]),
:host([name="issue-exclamation-filled"]) {
  color: var(--icon-warning);
}

:host([name="cross-circle"]),
:host([name="cross-circle-filled"]),
:host([name="issue-cross-filled"]),
:host([name="small-status-dot"]) {
  color: var(--icon-error);
}

:host([name="issue-text-filled"]) {
  color: var(--icon-info);
}

:host([name="large-arrow-right-filled"]) {
  color: var(--icon-arrow-main-thread);
}

:host([name="code-circle"]) {
  color: var(--icon-link);
}

:host([name="file-document"]) {
  color: var(--icon-file-document);
}

:host([name="file-font"]) {
  color: var(--icon-file-font);
}

:host([name="file-script"]) {
  color: var(--icon-file-script);
}

:host([name="file-stylesheet"]) {
  color: var(--icon-file-styles);
}

:host([name="file-media"]) {
  color: var(--icon-file-media);
}

:host([name="triangle-up"]),
:host([name="triangle-down"]),
:host([name="triangle-left"]),
:host([name="triangle-right"]) {
  width: 14px;
  height: 14px;
  vertical-align: baseline;
}

span {
  display: block;
  width: 100%;
  height: 100%;
  background-color: currentcolor;
  /* Default to a (scaled) 1x1 filled mask image, so that the \\'Icon\\' renders as transparent until a "name" is set */
  mask: var(--icon-url, url("data:image/svg+xml,%3Csvg width='1' height='1' fill='%23000' xmlns='http://www.w3.org/2000/svg'%3E%3C/svg%3E ")) center / contain no-repeat;
}

@media (forced-colors: active) {
  span {
    forced-color-adjust: none;
  }
}

/*# sourceURL=${import.meta.resolve("./icon.css")} */`;

// gen/front_end/ui/components/icon_button/Icon.js
var Icon = class extends HTMLElement {
  static observedAttributes = ["name"];
  #shadowRoot;
  #icon;
  constructor() {
    super();
    this.role = "presentation";
    const style = document.createElement("style");
    style.textContent = icon_css_default;
    this.#icon = document.createElement("span");
    this.#shadowRoot = this.attachShadow({ mode: "open" });
    this.#shadowRoot.append(style, this.#icon);
  }
  /**
   * @deprecated use `name` and CSS instead.
   */
  get data() {
    return {
      color: this.style.color,
      width: this.style.width,
      height: this.style.height,
      iconName: this.name ?? ""
    };
  }
  /**
   * @deprecated use `name` and CSS instead.
   */
  set data(data) {
    const { color, width, height } = data;
    if (color) {
      this.style.color = color;
    }
    if (width) {
      this.style.width = width;
    }
    if (height) {
      this.style.height = height;
    }
    if ("iconName" in data && data.iconName) {
      this.name = data.iconName;
    } else if ("iconPath" in data && data.iconPath) {
      this.name = data.iconPath;
    } else {
      throw new Error("Misconfigured `iconName` or `iconPath`.");
    }
  }
  /**
   * Yields the value of the `"name"` attribute of this `Icon` (`null` in case
   * there's no `"name"` on this element).
   */
  get name() {
    return this.getAttribute("name");
  }
  /**
   * Changes the value of the `"name"` attribute of this `Icon`. If you pass
   * `null` the `"name"` attribute will be removed from this element.
   *
   * @param name the new icon name or `null` to unset.
   */
  set name(name) {
    if (name === null) {
      this.removeAttribute("name");
    } else {
      this.setAttribute("name", name);
    }
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) {
      return;
    }
    switch (name) {
      case "name": {
        if (newValue === null) {
          this.#icon.style.removeProperty("--icon-url");
        } else {
          const url = URL.canParse(newValue) ? `url(${newValue})` : `var(--image-file-${newValue})`;
          this.#icon.style.setProperty("--icon-url", url);
        }
        break;
      }
    }
  }
};
var create = (name, className) => {
  const icon = new Icon();
  icon.name = name;
  if (className !== void 0) {
    icon.className = className;
  }
  return icon;
};
customElements.define("devtools-icon", Icon);

// gen/front_end/ui/components/icon_button/IconButton.js
import * as Lit from "./../../lit/lit.js";

// gen/front_end/ui/components/icon_button/iconButton.css.js
var iconButton_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  white-space: normal;
  display: inline-block;
}

.icon-button {
  border: none;
  margin-right: 2px;
  margin-top: 4px;
  display: inline-flex;
  align-items: center;
  color: inherit;
  font-size: inherit;
  font-family: inherit;
  background-color: inherit;
}

.icon-button.with-click-handler {
  padding: 0;
  margin: 0;
  height: 18px;
  border-radius: var(--sys-shape-corner-extra-small);
}

.icon-button.with-click-handler:hover {
  background-color: var(--sys-color-state-hover-on-subtle);
}

.icon-button:focus-visible {
  background-color: var(--sys-color-state-hover-on-subtle);
}

.compact .icon-button-title {
  display: none;
}

.icon-button-title {
  margin-right: var(--sys-size-2);

  + devtools-icon {
    margin-left: var(--sys-size-3);
  }
}

.status-icon {
  margin-right: var(--sys-size-1);
  margin-left: var(--sys-size-2);
}

@media (forced-colors: active) {
  .icon-button {
    forced-color-adjust: none;
    background-color: ButtonFace;
  }

  .icon-button:focus-visible,
  .icon-button.with-click-handler:hover {
    background-color: Highlight;
    color: HighlightText;
  }
}

/*# sourceURL=${import.meta.resolve("./iconButton.css")} */`;

// gen/front_end/ui/components/icon_button/IconButton.js
var { html } = Lit;
var IconButton = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #clickHandler = void 0;
  #groups = [];
  #compact = false;
  #leadingText = "";
  #trailingText = "";
  #accessibleName;
  set data(data) {
    this.#groups = data.groups.map((group) => ({ ...group }));
    this.#clickHandler = data.clickHandler;
    this.#trailingText = data.trailingText ?? "";
    this.#leadingText = data.leadingText ?? "";
    this.#accessibleName = data.accessibleName;
    this.#compact = Boolean(data.compact);
    this.#render();
  }
  get data() {
    return {
      groups: this.#groups.map((group) => ({ ...group })),
      // Ensure we make a deep copy.
      accessibleName: this.#accessibleName,
      clickHandler: this.#clickHandler,
      leadingText: this.#leadingText,
      trailingText: this.#trailingText,
      compact: this.#compact
    };
  }
  #onClickHandler(event) {
    if (this.#clickHandler) {
      event.preventDefault();
      this.#clickHandler();
    }
  }
  #render() {
    const buttonClasses = Lit.Directives.classMap({
      "icon-button": true,
      "with-click-handler": Boolean(this.#clickHandler),
      compact: this.#compact
    });
    const filteredGroups = this.#groups.filter((counter) => counter.text !== void 0).filter((_, index) => this.#compact ? index === 0 : true);
    Lit.render(html`
      <style>${iconButton_css_default}</style>
      <button class=${buttonClasses} @click=${this.#onClickHandler} aria-label=${Lit.Directives.ifDefined(this.#accessibleName)}>
      ${!this.#compact && this.#leadingText ? html`<span class="icon-button-title">${this.#leadingText}</span>` : Lit.nothing}
      ${filteredGroups.map(
      (counter) => html`
      <devtools-icon class="status-icon" name=${counter.iconName} style="color: ${counter.iconColor}; width: ${counter.iconWidth || "var(--sys-size-7)"}; height: ${counter.iconHeight || "var(--sys-size-7)"}">
      </devtools-icon>
      ${this.#compact ? html`<!-- Force line-height for this element --><span>&#8203;</span>` : Lit.nothing}
      <span class="icon-button-title">${counter.text}</span>`
    )}
      </button>
      ${!this.#compact && this.#trailingText ? html`<span class="icon-button-title">${this.#trailingText}</span>` : Lit.nothing}
    `, this.#shadow, { host: this });
  }
};
customElements.define("icon-button", IconButton);

// gen/front_end/ui/components/icon_button/FileSourceIcon.js
import { Directives as Directives2, html as html2, render as render2 } from "./../../lit/lit.js";

// gen/front_end/ui/components/icon_button/fileSourceIcon.css.js
var fileSourceIcon_css_default = `/*
 * Copyright 2024 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  height: var(--sys-size-9);
  width: var(--sys-size-9);

  devtools-icon {
    height: 100%;
    width: 100%;
  }

  devtools-icon.document {
    color: var(--override-file-source-icon-color, var(--icon-default));
  }

  devtools-icon.script,
  devtools-icon.sm-script,
  devtools-icon.snippet {
    color: var(--override-file-source-icon-color, var(--icon-file-script));
  }

  devtools-icon.stylesheet,
  devtools-icon.sm-stylesheet {
    color: var(--override-file-source-icon-color, var(--icon-file-styles));
  }

  devtools-icon.image,
  devtools-icon.font {
    color: var(--override-file-source-icon-color, var(--icon-file-image));
  }

  devtools-icon.dot::before {
    content: var(--image-file-empty);
    width: 35%;
    height: 35%;
    border-radius: 50%;
    outline: var(--sys-size-1) solid var(--icon-gap-focus-selected);
    top: 60%;
    left: 55%;
    position: absolute;
    z-index: 1;
  }

  devtools-icon.purple.dot::before {
    background-color: var(--sys-color-purple-bright);
  }

  devtools-icon.green.dot::before {
    background-color: var(--sys-color-green-bright);
  }
}

/*# sourceURL=${import.meta.resolve("./fileSourceIcon.css")} */`;

// gen/front_end/ui/components/icon_button/FileSourceIcon.js
var { classMap } = Directives2;
var FileSourceIcon = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #iconType;
  #contentType;
  #hasDotBadge;
  #isDotPurple;
  set data(data) {
    this.#contentType = data.contentType;
    this.#hasDotBadge = data.hasDotBadge;
    this.#isDotPurple = data.isDotPurple;
    this.#iconType = data.iconType;
    this.#render();
  }
  get data() {
    return {
      iconType: this.#iconType,
      contentType: this.#contentType,
      hasDotBadge: this.#hasDotBadge,
      isDotPurple: this.#isDotPurple
    };
  }
  connectedCallback() {
    this.#render();
  }
  #render() {
    const iconClasses = classMap({
      dot: Boolean(this.#hasDotBadge),
      purple: Boolean(this.#hasDotBadge && this.#isDotPurple),
      green: Boolean(this.#hasDotBadge && !this.#isDotPurple),
      ...this.#contentType ? { [this.#contentType]: this.#contentType } : null
    });
    render2(
      html2`
      <style>${fileSourceIcon_css_default}</style>
      <devtools-icon .name=${this.#iconType ?? null} class=${iconClasses}></devtools-icon>`,
      this.#shadow,
      { host: this }
    );
  }
};
customElements.define("devtools-file-source-icon", FileSourceIcon);
export {
  FileSourceIcon_exports as FileSourceIcon,
  Icon_exports as Icon,
  IconButton_exports as IconButton
};
//# sourceMappingURL=icon_button.js.map
