// gen/front_end/ui/kit/cards/Card.js
import { html, nothing, render } from "./../lit/lit.js";

// gen/front_end/ui/kit/cards/card.css.js
var card_css_default = `/*
 * Copyright 2024 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  display: flex;
  max-width: var(--sys-size-35);
  width: 100%;
}

:host([hidden]) {
  display: none;
}

#card {
  break-inside: avoid;
  min-width: var(--sys-size-31);
  margin: var(--sys-size-3) var(--sys-size-6) var(--sys-size-5) var(--sys-size-5);
  flex: 1;

  #heading {
    display: flex;
    white-space: nowrap;
    margin-bottom: var(--sys-size-5);

    [role="heading"] {
      color: var(--sys-color-on-surface);
      font: var(--sys-typescale-body2-medium);
    }

    [name="heading-prefix"]::slotted(*) {
      margin-right: var(--sys-size-3);
    }

    [name="heading-suffix"]::slotted(*) {
      margin-left: auto;
    }
  }

  #content {
    border-radius: var(--sys-shape-corner-small);
    box-shadow: var(--sys-elevation-level2);
    display: flex;
    flex-direction: column;
    background: var(--app-color-card-background);

    &::slotted(*) {
      padding: var(--sys-size-4) var(--sys-size-6);
    }

    &::slotted(*:not(:first-child)) {
      border-top: var(--sys-size-1) solid var(--app-color-card-divider);
    }
  }
}

/*# sourceURL=${import.meta.resolve("./cards/card.css")} */`;

// gen/front_end/ui/kit/cards/Card.js
var Card = class extends HTMLElement {
  static observedAttributes = ["heading"];
  #shadow = this.attachShadow({ mode: "open" });
  constructor() {
    super();
    this.#render();
  }
  /**
   * Yields the value of the `"heading"` attribute of this `Card`.
   *
   * @returns the value of the `"heading"` attribute or `null` if the attribute
   *          is absent.
   */
  get heading() {
    return this.getAttribute("heading");
  }
  /**
   * Changes the value of the `"heading"` attribute of this `Card`. If you pass
   * `null`, the `"heading"` attribute will be removed from this element.
   *
   * @param heading the new heading of `null` to unset.
   */
  set heading(heading) {
    if (heading) {
      this.setAttribute("heading", heading);
    } else {
      this.removeAttribute("heading");
    }
  }
  attributeChangedCallback(_name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.#render();
    }
  }
  #render() {
    render(html`
        <style>${card_css_default}</style>
        <div id="card">
          <div id="heading">
            <slot name="heading-prefix"></slot>
            <div role="heading" aria-level="2">${this.heading ?? nothing}</div>
            <slot name="heading-suffix"></slot>
          </div>
          <slot id="content"></slot>
        </div>`, this.#shadow, { host: this });
  }
};
customElements.define("devtools-card", Card);

// gen/front_end/ui/kit/icons/Icon.js
import "./../../Images/Images.js";

// gen/front_end/ui/kit/icons/icon.css.js
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

/*# sourceURL=${import.meta.resolve("./icons/icon.css")} */`;

// gen/front_end/ui/kit/icons/Icon.js
var Icon = class extends HTMLElement {
  static observedAttributes = ["name"];
  #shadowRoot;
  #icon;
  constructor() {
    super();
    if (!this.role) {
      this.role = "presentation";
    }
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
var createIcon = (name, className) => {
  const icon = new Icon();
  icon.name = name;
  if (className !== void 0) {
    icon.className = className;
  }
  return icon;
};
customElements.define("devtools-icon", Icon);
export {
  Card,
  Icon,
  createIcon
};
//# sourceMappingURL=kit.js.map
