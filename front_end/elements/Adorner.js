// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as UI from '../ui/ui.js';

/**
 * @enum {string}
 * Use a normal object instead of making it null-prototyped because
 * Closure requires enum initialization to be an object literal.
 * Will be a proper enum class once this file becomes TypeScript.
 */
export const AdornerCategories = {
  Security: 'Security',
  Layout: 'Layout',
  Default: 'Default',
};
Object.freeze(AdornerCategories);

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: inline-flex;
    }

    :host.hidden {
      display: none;
    }

    slot[name=content] {
      display: inline-block;
      height: 13px;
      line-height: 13px;
      padding: 0 6px;
      font-size: 8.5px;
      font-weight: 700;
      color: var(--adorner-text-color, #3c4043);
      background-color: var(--adorner-background-color, #f1f3f4);
      border: var(--adorner-border, 1px solid #dadce0);
      border-radius: var(--adorner-border-radius, 10px);
    }

    :host-context(.-theme-with-dark-background) slot[name=content] {
      color: var(--adorner-text-color, #ffffffde);
      background-color: var(--adorner-background-color, #5db0d726);
      border: var(--adorner-border, 1px solid #5db0d780);
    }
  </style>
  <slot name="content"></slot>
`;

export class Adorner extends HTMLElement {
  /**
   *
   * @param {!HTMLElement} content
   * @param {string} name
   * @param {?*} options
   * @return {!Adorner}
   */
  static create(content, name, options = {}) {
    const adorner = /** @type {!Adorner} */ (document.createElement('devtools-adorner'));
    content.slot = 'content';
    adorner.append(content);

    adorner.name = name;

    const {category} = options;
    adorner.category = category || AdornerCategories.Default;
    return adorner;
  }

  constructor() {
    super();

    const shadowRoot = this.attachShadow({mode: 'open'});
    shadowRoot.appendChild(template.content.cloneNode(true));

    this.name = '';
    this.category = AdornerCategories.Default;
  }

  /**
   * @override
   */
  connectedCallback() {
    UI.ARIAUtils.setAccessibleName(this, `${this.name}, adorner`);
  }

  // TODO(changhaohan): add active/inactive toggle with style and ARIA updates
  show() {
    this.classList.remove('hidden');
  }

  hide() {
    this.classList.add('hidden');
  }
}

self.customElements.define('devtools-adorner', Adorner);
