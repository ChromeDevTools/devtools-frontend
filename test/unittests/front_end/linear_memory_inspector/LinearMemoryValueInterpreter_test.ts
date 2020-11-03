// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {LinearMemoryValueInterpreter} from '../../../../front_end/linear_memory_inspector/LinearMemoryValueInterpreter.js';
import {ValueInterpreterDisplay} from '../../../../front_end/linear_memory_inspector/ValueInterpreterDisplay.js';
import {Endianness, ValueType} from '../../../../front_end/linear_memory_inspector/ValueInterpreterDisplayUtils.js';
import {getElementWithinComponent, renderElementIntoDOM} from '../helpers/DOMHelpers.js';

const {assert} = chai;

const DISPLAY_SELECTOR = 'devtools-linear-memory-inspector-interpreter-display';
const SETTINGS_SELECTOR = '.settings-toolbar';

describe('LinearMemoryValueInterpreter', () => {
  function setUpComponent() {
    const buffer = new Uint8Array([34, 234, 12, 3]).buffer;
    const component = new LinearMemoryValueInterpreter();
    component.data = {
      value: buffer,
      endianness: Endianness.Little,
      valueTypes: [ValueType.Int8],
    };
    renderElementIntoDOM(component);
    return component;
  }

  it('renders settings toolbar', async () => {
    const component = setUpComponent();
    const settingsToolbar = getElementWithinComponent(component, SETTINGS_SELECTOR, HTMLDivElement);
    assert.isNotNull(settingsToolbar);
  });

  it('renders value display', async () => {
    const component = setUpComponent();
    const valueDisplay = getElementWithinComponent(component, DISPLAY_SELECTOR, ValueInterpreterDisplay);
    assert.isNotNull(valueDisplay);
  });
});
