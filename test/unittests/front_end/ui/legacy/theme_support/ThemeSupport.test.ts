// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../../../../../front_end/core/common/common.js';
import * as ThemeSupport from '../../../../../../front_end/ui/legacy/theme_support/theme_support.js';
import {assertShadowRoot} from '../../../helpers/DOMHelpers.js';
import {describeWithEnvironment} from '../../../helpers/EnvironmentHelpers.js';

const {assert} = chai;

class StyledComponent extends HTMLElement {
  #shadow = this.attachShadow({mode: 'open'});

  constructor() {
    super();

    this.#shadow.innerHTML = `<style>
      :host {
        --color-primary-old: red;
      }
      </style>`;
  }
}

describe('Theme Support', () => {
  describeWithEnvironment('Computed Values', () => {
    let themeSupport: ThemeSupport.ThemeSupport;
    before(() => {
      const setting = {
        get() {
          return 'default';
        },
      } as Common.Settings.Setting<string>;
      themeSupport = ThemeSupport.ThemeSupport.instance({forceNew: true, setting});
      customElements.define('test-styled-component', StyledComponent);
    });

    afterEach(() => {
      document.body.removeChildren();
    });

    it('obtains computed values correctly (document)', () => {
      assert.isNotEmpty(themeSupport.getComputedValue('--color-primary-old'));
    });

    it('obtains computed values correctly (element)', () => {
      const element = new StyledComponent();
      document.body.appendChild(element);

      const documentValue = themeSupport.getComputedValue('--color-primary-old');
      const elementValue = themeSupport.getComputedValue('--color-primary-old', element);
      assert.isNotEmpty(elementValue);
      assert.notStrictEqual(documentValue, elementValue);
    });

    it('caches computed values (document)', () => {
      const documentValue = themeSupport.getComputedValue('--color-primary-old');

      // Update the styles by adding a new style tag, and confirm that the old
      // value is still returned.
      const newStyle = document.createElement('style');
      newStyle.textContent = ':root { --color-primary-old: green; }';
      document.head.appendChild(newStyle);

      const updatedDocumentValue = themeSupport.getComputedValue('--color-primary-old');
      newStyle.remove();

      assert.strictEqual(documentValue, updatedDocumentValue);
    });

    it('caches computed values (element)', () => {
      const element = new StyledComponent();
      document.body.appendChild(element);

      const elementValue = themeSupport.getComputedValue('--color-primary-old', element);
      assert.isNotEmpty(elementValue);

      // Update the styles by adding a new style tag, and confirm that the old
      // value is still returned.
      const newStyle = document.createElement('style');
      newStyle.textContent = ':root { --color-primary-old: green; }';
      assertShadowRoot(element.shadowRoot);

      element.shadowRoot.appendChild(newStyle);
      const updatedElementValue = themeSupport.getComputedValue('--color-primary-old', element);

      assert.strictEqual(elementValue, updatedElementValue);
    });

    it('does not caches empty computed values (element)', () => {
      const documentValue = themeSupport.getComputedValue('--test-value');

      // Update the styles by adding a new style tag, and confirm that the old
      // value is still returned.
      const newStyle = document.createElement('style');
      newStyle.textContent = ':root { --test-value: green; }';
      document.head.appendChild(newStyle);

      const updatedDocumentValue = themeSupport.getComputedValue('--test-value', document.body);
      newStyle.remove();

      assert.isEmpty(documentValue);
      assert.isNotEmpty(updatedDocumentValue);
      assert.notStrictEqual(documentValue, updatedDocumentValue);
    });
  });
});
