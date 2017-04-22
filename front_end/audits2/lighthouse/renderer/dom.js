/**
 * Copyright 2017 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

/* globals URL */

class DOM {
  /**
   * @param {!Document} document
   */
  constructor(document) {
    this._document = document;
  }

 /**
   * @param {string} name
   * @param {string=} className
   * @param {!Object<string, (string|undefined)>=} attrs Attribute key/val pairs.
   *     Note: if an attribute key has an undefined value, this method does not
   *     set the attribute on the node.
   * @return {!Element}
   */
  createElement(name, className, attrs) {
    // TODO(all): adopt `attrs` default arg when https://codereview.chromium.org/2821773002/ lands
    attrs = attrs || {};
    const element = this._document.createElement(name);
    if (className) {
      element.className = className;
    }
    Object.keys(attrs).forEach(key => {
      const value = attrs[key];
      if (typeof value !== 'undefined') {
        element.setAttribute(key, value);
      }
    });
    return element;
  }

  /**
   * @param {string} selector
   * @param {!Document|!Element} context
   * @return {!DocumentFragment} A clone of the template content.
   * @throws {Error}
   */
  cloneTemplate(selector, context) {
    const template = context.querySelector(selector);
    if (!template) {
      throw new Error(`Template not found: template${selector}`);
    }
    return /** @type {!DocumentFragment} */ (this._document.importNode(template.content, true));
  }

  /**
   * @param {string} text
   * @return {!Element}
   */
  createSpanFromMarkdown(text) {
    const element = this.createElement('span');

    // Split on markdown links (e.g. [some link](https://...)).
    const parts = text.split(/\[(.*?)\]\((https?:\/\/.*?)\)/g);

    while (parts.length) {
      // Pop off the same number of elements as there are capture groups.
      const [preambleText, linkText, linkHref] = parts.splice(0, 3);
      element.appendChild(this._document.createTextNode(preambleText));

      // Append link if there are any.
      if (linkText && linkHref) {
        const a = this.createElement('a');
        a.rel = 'noopener';
        a.target = '_blank';
        a.textContent = linkText;
        a.href = (new URL(linkHref)).href;
        element.appendChild(a);
      }
    }

    return element;
  }

  /**
   * @return {!Document}
   */
  document() {
    return this._document;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DOM;
}
