// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @param {string} localName
 * @param {string} typeExtension
 * @param {function(new:HTMLElement, *)} definition
 * @return {function()}
 * @suppressGlobalPropertiesCheck
 */
export function registerCustomElement(localName, typeExtension, definition) {
  self.customElements.define(typeExtension, class extends definition {
    constructor() {
      super();
      // TODO(einbinder) convert to classes and custom element tags
      this.setAttribute('is', typeExtension);
    }
  }, {extends: localName});
  return () => createElement(localName, typeExtension);
}
