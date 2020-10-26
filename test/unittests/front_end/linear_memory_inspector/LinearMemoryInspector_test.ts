// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {LinearMemoryInspector} from '../../../../front_end/linear_memory_inspector/LinearMemoryInspector.js';
import {toHexString} from '../../../../front_end/linear_memory_inspector/LinearMemoryInspectorUtils.js';
import {LinearMemoryNavigator} from '../../../../front_end/linear_memory_inspector/LinearMemoryNavigator.js';
import {LinearMemoryViewer} from '../../../../front_end/linear_memory_inspector/LinearMemoryViewer.js';
import {assertElement, assertShadowRoot, renderElementIntoDOM} from '../helpers/DOMHelpers.js';

const {assert} = chai;

describe('LinearMemoryInspector', () => {
  function setUpComponent() {
    const component = new LinearMemoryInspector();
    renderElementIntoDOM(component);
    const size = 128;
    const memory = [];
    for (let i = 0; i < size; ++i) {
      memory[i] = i;
    }
    component.data = {
      memory: new Uint8Array(memory),
      address: 20,
    };
    return component;
  }

  it('renders the navigator component', async () => {
    const component = setUpComponent();
    const shadowRoot = component.shadowRoot;
    assertShadowRoot(shadowRoot);
    const input = shadowRoot.querySelector('devtools-linear-memory-inspector-navigator');
    assertElement(input, LinearMemoryNavigator);
  });

  it('renders the viewer component', async () => {
    const component = setUpComponent();
    const shadowRoot = component.shadowRoot;
    assertShadowRoot(shadowRoot);
    const input = shadowRoot.querySelector('devtools-linear-memory-inspector-viewer');
    assertElement(input, LinearMemoryViewer);
  });

  it('formats a hexadecimal number', async () => {
    const number = 23;
    assert.strictEqual(toHexString(number, 0), '17');
  });

  it('formats a hexadecimal number and adds padding', async () => {
    const decimalNumber = 23;
    assert.strictEqual(toHexString(decimalNumber, 5), '00017');
  });
});
