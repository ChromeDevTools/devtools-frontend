"use strict";
import "../../../Images/Images.js";
import iconStyles from "./icon.css.js";
export class Icon extends HTMLElement {
  static observedAttributes = ["name"];
  #shadowRoot;
  #icon;
  constructor() {
    super();
    this.role = "presentation";
    const style = document.createElement("style");
    style.textContent = iconStyles;
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
}
export const create = (name, className) => {
  const icon = new Icon();
  icon.name = name;
  if (className !== void 0) {
    icon.className = className;
  }
  return icon;
};
customElements.define("devtools-icon", Icon);
//# sourceMappingURL=Icon.js.map
