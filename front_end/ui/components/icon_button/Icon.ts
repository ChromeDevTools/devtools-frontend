// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import iconStyles from './icon.css.legacy.js';

/**
 * @deprecated
 */
export interface IconWithName {
  iconName: string;
  color: string;
  width?: string;
  height?: string;
}

/**
 * @deprecated
 */
export type IconData = IconWithName|{
  iconPath: string,
  color: string,
  width?: string,
  height?: string,
};

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
 * // Instantiate programmatically via the constructor:
 * const icon = new IconButton.Icon.Icon();
 * icon.name = 'bin';
 * container.appendChild(icon);
 *
 * // Use within a template:
 * LitHtml.html`
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
 * @attr name - The basename of the icon file (not including the `.svg` suffix). For
 *              backwards compatibility we also support a full URL here, but that
 *              should not be used in newly written code.
 * @prop {String} name - The `"name"` attribute is reflected as property.
 * @prop {IconData} data - Deprecated way to set dimensions, color and name at once.
 */
export class Icon extends HTMLElement {
  static readonly observedAttributes = ['name'];

  readonly #shadowRoot;
  readonly #icon;

  constructor() {
    super();
    this.role = 'presentation';
    this.#icon = document.createElement('span');
    this.#shadowRoot = this.attachShadow({mode: 'open'});
    this.#shadowRoot.appendChild(this.#icon);

    // TODO(crbug.com/359141904): Ideally we'd have a `connectedCallback()` that would just
    // install the CSS via `adoptedStyleSheets`, but that throws when using the
    // same `CSSStyleSheet` across two different documents (which happens in the
    // case of undocked DevTools windows and using the DeviceMode). So the work-
    // around for now is to use legacy CSS injected as a <style> tag into the
    // ShadowRoot (which has been working well for the legacy UI components for
    // a long time).
    const styleElement = document.createElement('style');
    styleElement.textContent = iconStyles.cssContent;
    this.#shadowRoot.appendChild(styleElement);
  }

  /**
   * @deprecated use `name` and CSS instead.
   */
  get data(): IconData {
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
  set data(data: IconData) {
    const {color, width = '20px', height = '20px'} = data;
    this.style.color = color;
    this.style.width = width;
    this.style.height = height;
    if ('iconName' in data && data.iconName) {
      this.name = data.iconName;
    } else if ('iconPath' in data && data.iconPath) {
      this.name = data.iconPath;
    } else {
      throw new Error('Misconfigured `iconName` or `iconPath`.');
    }
  }

  /**
   * Yields the value of the `"name"` attribute of this `Icon` (`null` in case
   * there's no `"name"` on this element).
   */
  get name(): string|null {
    return this.getAttribute('name');
  }

  /**
   * Changes the value of the `"name"` attribute of this `Icon`. If you pass
   * `null` the `"name"` attribute will be removed from this element.
   *
   * @param name the new icon name or `null` to unset.
   */
  set name(name: string|null) {
    if (name === null) {
      this.removeAttribute('name');
    } else {
      this.setAttribute('name', name);
    }
  }

  attributeChangedCallback(name: string, oldValue: string|null, newValue: string|null): void {
    if (oldValue === newValue) {
      return;
    }
    switch (name) {
      case 'name': {
        if (newValue === null) {
          this.#icon.style.removeProperty('--icon-url');
        } else {
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
 * @return the newly created `Icon` instance.
 */
export const create = (name: string, className?: string): Icon => {
  const icon = new Icon();
  icon.name = name;
  if (className !== undefined) {
    icon.className = className;
  }
  return icon;
};

customElements.define('devtools-icon', Icon);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-icon': Icon;
  }
}
