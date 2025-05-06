// Copyright (c) 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';

import * as Platform from './platform.js';

const cssInJS = (strings: ArrayLike<string>, ...values: any[]): CSSInJS =>
    String.raw({raw: strings}, ...values) as CSSInJS;

describe('DOMUtilities', () => {
  describe('deepActiveElement', () => {
    it('returns the active element if there is no shadow root', () => {
      const btn = document.createElement('button');
      btn.innerText = 'Click me!';
      renderElementIntoDOM(btn);
      btn.focus();
      const activeElement = Platform.DOMUtilities.deepActiveElement(document);
      assert.strictEqual(activeElement, btn);
    });

    it('dives through the shadow root and finds the right active element', () => {
      class TestComponent extends HTMLElement {
        shadow = this.attachShadow({mode: 'open'});
        button = document.createElement('button');

        connectedCallback(): void {
          this.button.innerText = 'Click me from the shadow root!';
          this.shadow.appendChild(this.button);
          this.button.focus();
        }
      }
      customElements.define('dom-utilities-test-component', TestComponent);

      const component = new TestComponent();
      renderElementIntoDOM(component);
      const activeElement = Platform.DOMUtilities.deepActiveElement(document);
      assert.strictEqual(activeElement, component.button);
    });
  });

  describe('getEnclosingShadowRootForNode', () => {
    it('returns null if no shadow root is found up the tree', () => {
      const parent = document.createElement('div');
      const child = document.createElement('p');
      parent.appendChild(child);
      renderElementIntoDOM(parent);
      assert.isNull(Platform.DOMUtilities.getEnclosingShadowRootForNode(child));
    });

    it('returns the shadow root in the tree', () => {
      const div = document.createElement('div');

      class TestComponent extends HTMLElement {
        readonly #shadow = this.attachShadow({mode: 'open'});

        connectedCallback() {
          this.#shadow.appendChild(div);
        }
      }
      customElements.define('shadow-root-test', TestComponent);
      const component = new TestComponent();
      renderElementIntoDOM(component);
      assert.strictEqual(Platform.DOMUtilities.getEnclosingShadowRootForNode(div), component.shadowRoot);
    });
  });

  describe('appendStyle', () => {
    const {appendStyle} = Platform.DOMUtilities;

    it('correctly appends <style> elements', () => {
      const parent = renderElementIntoDOM(document.createElement('main'));

      appendStyle(parent, cssInJS`h1 { color: red; }`);
      appendStyle(parent, cssInJS`h2 { color: green; } h1 { font-size: 1px; }`);

      assert.lengthOf(parent.children, 2);
      assert.instanceOf(parent.children[0], HTMLStyleElement);
      assert.strictEqual(parent.children[0].textContent, 'h1 { color: red; }');
      assert.instanceOf(parent.children[1], HTMLStyleElement);
      assert.strictEqual(parent.children[1].textContent, 'h2 { color: green; } h1 { font-size: 1px; }');
    });

    it('correctly inserts <style> elements into disconnected nodes', () => {
      const parent = document.createElement('div');

      appendStyle(parent, cssInJS`div { color: red; }`);

      assert.lengthOf(parent.children, 1);
      assert.instanceOf(parent.children[0], HTMLStyleElement);
      assert.strictEqual(parent.children[0].textContent, 'div { color: red; }');
    });
  });
});
