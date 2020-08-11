// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export class XElement extends HTMLElement {
  /**
   * @override
   */
  static get observedAttributes() {
    return [
      'flex',          'padding',     'padding-top',      'padding-bottom', 'padding-left',
      'padding-right', 'margin',      'margin-top',       'margin-bottom',  'margin-left',
      'margin-right',  'overflow',    'overflow-x',       'overflow-y',     'font-size',
      'color',         'background',  'background-color', 'border',         'border-top',
      'border-bottom', 'border-left', 'border-right',     'max-width',      'max-height'
    ];
  }

  /**
   * @param {string} attr
   * @param {?string} oldValue
   * @param {?string} newValue
   * @override
   */
  attributeChangedCallback(attr, oldValue, newValue) {
    if (attr === 'flex') {
      if (newValue === null) {
        this.style.removeProperty('flex');
      } else if (newValue === 'initial' || newValue === 'auto' || newValue === 'none' || newValue.indexOf(' ') !== -1) {
        this.style.setProperty('flex', newValue);
      } else {
        this.style.setProperty('flex', '0 0 ' + newValue);
      }
      return;
    }
    if (newValue === null) {
      this.style.removeProperty(attr);
      if (attr.startsWith('padding-') || attr.startsWith('margin-') || attr.startsWith('border-') ||
          attr.startsWith('background-') || attr.startsWith('overflow-')) {
        const shorthand = attr.substring(0, attr.indexOf('-'));
        const shorthandValue = this.getAttribute(shorthand);
        if (shorthandValue !== null) {
          this.style.setProperty(shorthand, shorthandValue);
        }
      }
    } else {
      this.style.setProperty(attr, newValue);
    }
  }
}

/**
 * @extends {XElement}
 */
class _XBox extends XElement {
  /**
   * @param {string} direction
   */
  constructor(direction) {
    super();
    this.style.setProperty('display', 'flex');
    this.style.setProperty('flex-direction', direction);
    this.style.setProperty('justify-content', 'flex-start');
  }

  /**
   * @override
   */
  static get observedAttributes() {
    return super.observedAttributes.concat(['x-start', 'x-center', 'x-stretch', 'x-baseline', 'justify-content']);
  }

  /**
   * @param {string} attr
   * @param {?string} oldValue
   * @param {?string} newValue
   * @override
   */
  attributeChangedCallback(attr, oldValue, newValue) {
    if (attr === 'x-start' || attr === 'x-center' || attr === 'x-stretch' || attr === 'x-baseline') {
      if (newValue === null) {
        this.style.removeProperty('align-items');
      } else {
        this.style.setProperty('align-items', attr === 'x-start' ? 'flex-start' : attr.substr(2));
      }
      return;
    }
    super.attributeChangedCallback(attr, oldValue, newValue);
  }
}

/**
 * @extends {_XBox}
 */
class XVBox extends _XBox {
  constructor() {
    super('column');
  }
}

/**
 * @extends {_XBox}
 */
class XHBox extends _XBox {
  constructor() {
    super('row');
  }
}

/**
 * @extends {XElement}
 */
class XCBox extends XElement {
  constructor() {
    super();
    this.style.setProperty('display', 'flex');
    this.style.setProperty('flex-direction', 'column');
    this.style.setProperty('justify-content', 'center');
    this.style.setProperty('align-items', 'center');
  }
}

/**
 * @extends {XElement}
 */
class XDiv extends XElement {
  constructor() {
    super();
    this.style.setProperty('display', 'block');
  }
}

/**
 * @extends {XElement}
 */
class XSpan extends XElement {
  constructor() {
    super();
    this.style.setProperty('display', 'inline');
  }
}

/**
 * @extends {XElement}
 */
class XText extends XElement {
  constructor() {
    super();
    this.style.setProperty('display', 'inline');
    this.style.setProperty('white-space', 'pre');
  }
}

self.customElements.define('x-vbox', XVBox);
self.customElements.define('x-hbox', XHBox);
self.customElements.define('x-cbox', XCBox);
self.customElements.define('x-div', XDiv);
self.customElements.define('x-span', XSpan);
self.customElements.define('x-text', XText);
