// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describe, it} from 'mocha';

import {
  assertScreenshot,
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';
import {setupLocaleHooks} from '../../../testing/LocaleHelpers.js';

import * as LinearMemoryInspectorComponents from './components.js';

describe('LinearMemoryValueInterpreter Screenshots', () => {
  setupLocaleHooks();

  it('renders the value interpreter with representative data', async () => {
    const component = new LinearMemoryInspectorComponents.LinearMemoryValueInterpreter.LinearMemoryValueInterpreter();
    renderElementIntoDOM(component, {includeCommonStyles: true});

    const array = [0xC8, 0xC9, 0xCA, 0xCB];
    component.buffer = new Uint8Array(array).buffer;
    component.endianness = LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.Endianness.LITTLE;
    component.valueTypes = new Set([
      LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.INT8,
      LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.INT16,
      LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.INT32,
      LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.FLOAT32,
      LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.POINTER32,
    ]);
    component.valueTypeModes = new Map([
      [
        LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.INT8,
        LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueTypeMode.OCTAL,
      ],
      [
        LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.INT16,
        LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueTypeMode.HEXADECIMAL,
      ],
      [
        LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.INT32,
        LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueTypeMode.DECIMAL,
      ],
    ]);
    component.memoryLength = array.length;
    await component.updateComplete;

    await assertScreenshot('linear_memory_inspector/linear-memory-value-interpreter.png');
  });
});
