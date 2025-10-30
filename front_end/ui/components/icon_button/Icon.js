// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import '../../../Images/Images.js';
import iconStyles from './icon.css.js';
/**
 * A simple icon component to display SVG icons from the `front_end/Images/src`
 * folder (via the `--image-file-<name>` CSS variables).
 *
 * Usage is simple:
 *
 * ```js
 * // Instantiate programmatically via the `create()` helper:
 * const icon = IconButton.Icon.create('bin');
 * const iconWithClassName = IconButton.Icon.create('bin', 'delete-icon');
 *
 * // Use within a template:
 * Lit.html`
 *   <devtools-icon name="bin">
 *   </devtools-icon>
 * `;
 * ```
 *
 * The color for the icon defaults to `var(--icon-default)`, while the dimensions
 * default to 20px times 20px. You can change both color and size via CSS:
 *
 * ```css
 * devtools-icon.my-icon {
 *   color: red;
 *   width: 14px;
 *   height: 14px;
 * }
 * ```
 *
 * For `'triangle-up'`, `'triangle-down'`, `'triangle-left'`, and `'triangle-right'`
 * the default dimensions are 14px times 14px, and the default `vertical-align` is
 * `baseline` (instead of `sub`).
 *
 * @property name - The `"name"` attribute is reflected as property.
 * @property data - Deprecated way to set dimensions, color and name at once.
 * @attribute name - The basename of the icon file (not including the `.svg` suffix). For
 *              backwards compatibility we also support a full URL here, but that
 *              should not be used in newly written code.
 */
export class Icon extends HTMLElement {
    static observedAttributes = ['name'];
    #shadowRoot;
    #icon;
    constructor() {
        super();
        this.role = 'presentation';
        const style = document.createElement('style');
        style.textContent = iconStyles;
        this.#icon = document.createElement('span');
        this.#shadowRoot = this.attachShadow({ mode: 'open' });
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
            iconName: this.name ?? '',
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
        if ('iconName' in data && data.iconName) {
            this.name = data.iconName;
        }
        else if ('iconPath' in data && data.iconPath) {
            this.name = data.iconPath;
        }
        else {
            throw new Error('Misconfigured `iconName` or `iconPath`.');
        }
    }
    /**
     * Yields the value of the `"name"` attribute of this `Icon` (`null` in case
     * there's no `"name"` on this element).
     */
    get name() {
        return this.getAttribute('name');
    }
    /**
     * Changes the value of the `"name"` attribute of this `Icon`. If you pass
     * `null` the `"name"` attribute will be removed from this element.
     *
     * @param name the new icon name or `null` to unset.
     */
    set name(name) {
        if (name === null) {
            this.removeAttribute('name');
        }
        else {
            this.setAttribute('name', name);
        }
    }
    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) {
            return;
        }
        switch (name) {
            case 'name': {
                if (newValue === null) {
                    this.#icon.style.removeProperty('--icon-url');
                }
                else {
                    const url = URL.canParse(newValue) ? `url(${newValue})` : `var(--image-file-${newValue})`;
                    this.#icon.style.setProperty('--icon-url', url);
                }
                break;
            }
        }
    }
}
/**
 * Helper function to programmatically create an `Icon` isntance with a given
 * `name` and an optional CSS `className`.
 *
 * @param name the name of the icon to use.
 * @param className optional CSS class name(s) to put onto the element.
 * @returns the newly created `Icon` instance.
 */
export const create = (name, className) => {
    const icon = new Icon();
    icon.name = name;
    if (className !== undefined) {
        icon.className = className;
    }
    return icon;
};
customElements.define('devtools-icon', Icon);
//# sourceMappingURL=Icon.js.map