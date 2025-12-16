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
import "./../../kit/kit.js";
import { Directives, html, render } from "./../../lit/lit.js";

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
var { classMap } = Directives;
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
    render(html`
      <style>${fileSourceIcon_css_default}</style>
      <devtools-icon .name=${this.#iconType ?? null} class=${iconClasses}></devtools-icon>`, this.#shadow, { host: this });
  }
};
customElements.define("devtools-file-source-icon", FileSourceIcon);

// gen/front_end/ui/components/icon_button/IconButton.js
var IconButton_exports = {};
__export(IconButton_exports, {
  IconButton: () => IconButton
});
import "./../../kit/kit.js";
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
  margin-right: var(--sys-size-1);
  margin-left: var(--sys-size-1);
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
  outline: var(--sys-size-2) solid var(--sys-color-state-focus-ring);
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
var { html: html2 } = Lit;
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
    Lit.render(html2`
      <style>${iconButton_css_default}</style>
      <button class=${buttonClasses} @click=${this.#onClickHandler} aria-label=${Lit.Directives.ifDefined(this.#accessibleName)}>
      ${!this.#compact && this.#leadingText ? html2`<span class="icon-button-title">${this.#leadingText}</span>` : Lit.nothing}
      ${filteredGroups.map((counter) => html2`
      <devtools-icon class="status-icon" name=${counter.iconName} style="color: ${counter.iconColor}; width: ${counter.iconWidth || "var(--sys-size-7)"}; height: ${counter.iconHeight || "var(--sys-size-7)"}">
      </devtools-icon>
      ${this.#compact ? html2`<!-- Force line-height for this element --><span>&#8203;</span>` : Lit.nothing}
      <span class="icon-button-title">${counter.text}</span>`)}
      </button>
      ${!this.#compact && this.#trailingText ? html2`<span class="icon-button-title">${this.#trailingText}</span>` : Lit.nothing}
    `, this.#shadow, { host: this });
  }
};
customElements.define("icon-button", IconButton);
export {
  FileSourceIcon_exports as FileSourceIcon,
  IconButton_exports as IconButton
};
//# sourceMappingURL=icon_button.js.map
