// Copyright 2017 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export class XElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return [
      'flex',          'padding',     'padding-top',      'padding-bottom', 'padding-left',
      'padding-right', 'margin',      'margin-top',       'margin-bottom',  'margin-left',
      'margin-right',  'overflow',    'overflow-x',       'overflow-y',     'font-size',
      'color',         'background',  'background-color', 'border',         'border-top',
      'border-bottom', 'border-left', 'border-right',     'max-width',      'max-height',
    ];
  }

  attributeChangedCallback(attr: string, _oldValue: string|null, newValue: string|null): void {
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

class XBox extends XElement {
  constructor(direction: string) {
    super();
    this.style.setProperty('display', 'flex');
    this.style.setProperty('flex-direction', direction);
    this.style.setProperty('justify-content', 'flex-start');
  }

  static override get observedAttributes(): string[] {
    return super.observedAttributes.concat(['x-start', 'x-center', 'x-stretch', 'x-baseline', 'justify-content']);
  }

  override attributeChangedCallback(attr: string, oldValue: string|null, newValue: string|null): void {
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

class XHBox extends XBox {
  constructor() {
    super('row');
  }
}

customElements.define('x-hbox', XHBox);
