// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  dispatchClickEvent,
  getElementsWithinComponent,
  getElementWithinComponent,
  getEventPromise,
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';
import {describeWithLocale} from '../../../testing/EnvironmentHelpers.js';

import * as LinearMemoryInspectorComponents from './components.js';

export const DISPLAY_JUMP_TO_POINTER_BUTTON_SELECTOR = '[data-jump]';

describeWithLocale('ValueInterpreterDisplay', () => {
  const combinationsForNumbers = [
    {endianness: LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.Endianness.LITTLE, signed: true},
    {endianness: LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.Endianness.LITTLE, signed: false},
    {endianness: LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.Endianness.BIG, signed: false},
    {endianness: LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.Endianness.BIG, signed: true},
  ];

  function testNumberFormatCombinations(
      baseData: {
        buffer: ArrayBuffer,
        type: LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType,
        mode: LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueTypeMode,
      },
      combinations: Array<
          {endianness: LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.Endianness, signed: boolean}>) {
    const expectedIntValue = 20;
    const expectedFloatValue = -234.03;
    for (let i = 0; i < combinations.length; ++i) {
      const {endianness, signed} = combinations[i];
      let expectedValue;
      const isLittleEndian =
          endianness === LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.Endianness.LITTLE;
      const view = new DataView(baseData.buffer);
      switch (baseData.type) {
        case LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.INT8:
          expectedValue = signed ? -expectedIntValue : expectedIntValue;
          signed ? view.setInt8(0, expectedValue) : view.setInt8(0, expectedValue);
          break;
        case LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.INT16:
          expectedValue = signed ? -expectedIntValue : expectedIntValue;
          signed ? view.setInt16(0, expectedValue, isLittleEndian) : view.setUint16(0, expectedValue, isLittleEndian);
          break;
        case LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.INT32:
          expectedValue = signed ? -expectedIntValue : expectedIntValue;
          signed ? view.setInt32(0, expectedValue, isLittleEndian) : view.setUint32(0, expectedValue, isLittleEndian);
          break;
        case LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.INT64:
          expectedValue = signed ? -expectedIntValue : expectedIntValue;
          signed ? view.setBigInt64(0, BigInt(expectedValue), isLittleEndian) :
                   view.setBigUint64(0, BigInt(expectedValue), isLittleEndian);
          break;
        case LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.FLOAT32:
          expectedValue = expectedFloatValue;
          view.setFloat32(0, expectedValue, isLittleEndian);
          break;
        case LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.FLOAT64:
          expectedValue = expectedFloatValue;
          view.setFloat64(0, expectedValue, isLittleEndian);
          break;
        case LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.POINTER32:
          expectedValue = '0x' + expectedIntValue.toString(16);
          view.setInt32(0, expectedIntValue, isLittleEndian);
          break;
        case LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.POINTER64:
          expectedValue = '0x' + expectedIntValue.toString(16);
          view.setBigUint64(0, BigInt(expectedIntValue), isLittleEndian);
          break;
        default:
          throw new Error(`Unknown type ${baseData.type}`);
      }
      const actualValue =
          LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.format({...baseData, ...combinations[i]});
      assert.strictEqual(actualValue, expectedValue.toString());
    }
  }

  it('correctly formats signed/unsigned and endianness for Integer 8-bit (decimal)', () => {
    const formatData = {
      buffer: new ArrayBuffer(1),
      type: LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.INT8,
      mode: LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueTypeMode.DECIMAL,
    };
    testNumberFormatCombinations(formatData, combinationsForNumbers);
  });

  it('correctly formats signed/unsigned and endianness for Integer 16-bit (decimal)', () => {
    const formatData = {
      buffer: new ArrayBuffer(2),
      type: LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.INT16,
      mode: LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueTypeMode.DECIMAL,
    };

    testNumberFormatCombinations(formatData, combinationsForNumbers);
  });

  it('correctly formats signed/unsigned and endianness for Integer 32-bit (decimal)', () => {
    const formatData = {
      buffer: new ArrayBuffer(4),
      type: LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.INT32,
      mode: LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueTypeMode.DECIMAL,
    };

    testNumberFormatCombinations(formatData, combinationsForNumbers);
  });

  it('correctly formats signed/unsigned and endianness for Integer 64-bit (decimal)', () => {
    const formatData = {
      buffer: new ArrayBuffer(8),
      type: LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.INT64,
      mode: LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueTypeMode.DECIMAL,
    };

    testNumberFormatCombinations(formatData, combinationsForNumbers);
  });

  it('correctly formats endianness for Float 32-bit (decimal)', () => {
    const formatData = {
      buffer: new ArrayBuffer(4),
      type: LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.FLOAT32,
      mode: LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueTypeMode.DECIMAL,
    };

    testNumberFormatCombinations(formatData, combinationsForNumbers);
  });

  it('correctly formats endianness for Float 64-bit (decimal)', () => {
    const formatData = {
      buffer: new ArrayBuffer(8),
      type: LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.FLOAT64,
      mode: LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueTypeMode.DECIMAL,
    };

    testNumberFormatCombinations(formatData, combinationsForNumbers);
  });

  it('correctly formats endianness for Pointer 32-bit', () => {
    const formatData = {
      buffer: new ArrayBuffer(4),
      type: LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.POINTER32,
      mode: LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueTypeMode.HEXADECIMAL,
    };

    testNumberFormatCombinations(formatData, combinationsForNumbers);
  });

  it('correctly formats endianness for Pointer 64-bit', () => {
    const formatData = {
      buffer: new ArrayBuffer(8),
      type: LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.POINTER64,
      mode: LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueTypeMode.HEXADECIMAL,
    };

    testNumberFormatCombinations(formatData, combinationsForNumbers);
  });

  it('correctly formats floats in decimal mode', () => {
    const expectedFloat = 341.34;
    const actualValue = LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.formatFloat(
        expectedFloat, LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueTypeMode.DECIMAL);
    assert.strictEqual(actualValue, '341.34');
  });

  it('correctly formats floats in scientific mode', () => {
    const expectedFloat = 341.34;
    const actualValue = LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.formatFloat(
        expectedFloat, LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueTypeMode.SCIENTIFIC);
    assert.strictEqual(actualValue, '3.41e+2');
  });

  it('correctly formats integers in decimal mode', () => {
    const expectedInteger = 120;
    const actualValue = LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.formatInteger(
        expectedInteger, LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueTypeMode.DECIMAL);
    assert.strictEqual(actualValue, '120');
  });

  it('correctly formats integers in hexadecimal mode', () => {
    const expectedInteger = 16;
    const actualValue = LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.formatInteger(
        expectedInteger, LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueTypeMode.HEXADECIMAL);
    assert.strictEqual(actualValue, '0x10');
  });

  it('returns N/A for negative hex numbers', () => {
    const negativeInteger = -16;
    const actualValue = LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.formatInteger(
        negativeInteger, LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueTypeMode.HEXADECIMAL);
    assert.strictEqual(actualValue, 'N/A');
  });

  it('correctly formats integers in octal mode', () => {
    const expectedInteger = 16;
    const actualValue = LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.formatInteger(
        expectedInteger, LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueTypeMode.OCTAL);
    assert.strictEqual(actualValue, '20');
  });

  it('returns N/A for negative octal numbers', () => {
    const expectedInteger = -16;
    const actualValue = LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.formatInteger(
        expectedInteger, LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueTypeMode.OCTAL);
    assert.strictEqual(actualValue, 'N/A');
  });

  it('renders pointer values in LinearMemoryInspector.ValueInterpreterDisplayUtils.ValueTypes', () => {
    const component = new LinearMemoryInspectorComponents.ValueInterpreterDisplay.ValueInterpreterDisplay();
    const array = [1, 132, 172, 71, 43, 12, 12, 66];
    component.data = {
      buffer: new Uint8Array(array).buffer,
      endianness: LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.Endianness.LITTLE,
      valueTypes: new Set([
        LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.POINTER32,
        LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.POINTER64,
      ]),
      memoryLength: array.length,
    };
    renderElementIntoDOM(component);

    const dataValues = getElementsWithinComponent(component, '[data-value]', HTMLDivElement);
    assert.lengthOf(dataValues, 2);

    const actualValues = Array.from(dataValues).map(x => x.innerText);
    const expectedValues = ['0x47AC8401', '0x420C0C2B47AC8401'];
    assert.deepStrictEqual(actualValues, expectedValues);
  });

  it('renders value in selected LinearMemoryInspector.ValueInterpreterDisplayUtils.ValueTypes', () => {
    const component = new LinearMemoryInspectorComponents.ValueInterpreterDisplay.ValueInterpreterDisplay();
    const array = [1, 132, 172, 71];
    component.data = {
      buffer: new Uint8Array(array).buffer,
      endianness: LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.Endianness.LITTLE,
      valueTypes: new Set([
        LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.INT16,
        LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.FLOAT32,
      ]),
      memoryLength: array.length,
    };
    renderElementIntoDOM(component);

    const dataValues = getElementsWithinComponent(component, '[data-value]', HTMLSpanElement);
    assert.lengthOf(dataValues, 3);

    const actualValues = Array.from(dataValues).map(x => x.innerText);
    const expectedValues = ['33793', '-31743', '88328.01'];
    assert.deepStrictEqual(actualValues, expectedValues);
  });

  it('renders only unsigned values for Octal and Hexadecimal representation', () => {
    const component = new LinearMemoryInspectorComponents.ValueInterpreterDisplay.ValueInterpreterDisplay();
    const array = [0xC8, 0xC9, 0xCA, 0XCB];
    component.data = {
      buffer: new Uint8Array(array).buffer,
      endianness: LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.Endianness.LITTLE,
      valueTypes: new Set([
        LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.INT8,
        LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.INT16,
        LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.INT32,
      ]),
      valueTypeModes: new Map([
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
      ]),
      memoryLength: array.length,
    };
    renderElementIntoDOM(component);

    const dataValues = getElementsWithinComponent(component, '[data-value]', HTMLSpanElement);
    assert.lengthOf(dataValues, 4);

    const actualValues = Array.from(dataValues).map(x => x.innerText);
    const expectedValues = ['310', '0xC9C8', '3419064776', '-875902520'];
    assert.deepStrictEqual(actualValues, expectedValues);
  });

  it('triggers a value changed event on selecting a new mode', async () => {
    const component = new LinearMemoryInspectorComponents.ValueInterpreterDisplay.ValueInterpreterDisplay();
    const array = [1, 132, 172, 71];
    const oldMode = LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueTypeMode.DECIMAL;
    const newMode = LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueTypeMode.SCIENTIFIC;

    const mapping = LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.getDefaultValueTypeMapping();
    mapping.set(LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.FLOAT32, oldMode);

    component.data = {
      buffer: new Uint8Array(array).buffer,
      endianness: LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.Endianness.LITTLE,
      valueTypes: new Set([
        LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.FLOAT32,
      ]),
      valueTypeModes: mapping,
      memoryLength: array.length,
    };

    const input = getElementWithinComponent(component, '[data-mode-settings]', HTMLSelectElement);
    assert.strictEqual(input.value, oldMode);
    input.value = newMode;
    const eventPromise =
        getEventPromise<LinearMemoryInspectorComponents.ValueInterpreterDisplay.ValueTypeModeChangedEvent>(
            component, 'valuetypemodechanged');
    const changeEvent = new Event('change');
    input.dispatchEvent(changeEvent);
    const event = await eventPromise;
    assert.deepEqual(
        event.data,
        {type: LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.FLOAT32, mode: newMode});
  });

  it('triggers an event on jumping to an address from a 32-bit pointer', async () => {
    const component = new LinearMemoryInspectorComponents.ValueInterpreterDisplay.ValueInterpreterDisplay();
    const array = [1, 0, 0, 0];
    component.data = {
      buffer: new Uint8Array(array).buffer,
      endianness: LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.Endianness.LITTLE,
      valueTypes: new Set([
        LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.POINTER32,
      ]),
      memoryLength: array.length,
    };
    renderElementIntoDOM(component);

    const button = getElementWithinComponent(component, DISPLAY_JUMP_TO_POINTER_BUTTON_SELECTOR, HTMLButtonElement);
    const eventPromise =
        getEventPromise<LinearMemoryInspectorComponents.ValueInterpreterDisplay.JumpToPointerAddressEvent>(
            component, 'jumptopointeraddress');
    dispatchClickEvent(button);
    const event = await eventPromise;
    assert.deepEqual(event.data, 1);
  });

  it('triggers an event on jumping to an address from a 64-bit pointer', async () => {
    const component = new LinearMemoryInspectorComponents.ValueInterpreterDisplay.ValueInterpreterDisplay();
    const array = [1, 0, 0, 0, 0, 0, 0, 0];
    component.data = {
      buffer: new Uint8Array(array).buffer,
      endianness: LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.Endianness.LITTLE,
      valueTypes: new Set([
        LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.POINTER64,
      ]),
      memoryLength: array.length,
    };
    renderElementIntoDOM(component);

    const button = getElementWithinComponent(component, DISPLAY_JUMP_TO_POINTER_BUTTON_SELECTOR, HTMLButtonElement);
    const eventPromise =
        getEventPromise<LinearMemoryInspectorComponents.ValueInterpreterDisplay.JumpToPointerAddressEvent>(
            component, 'jumptopointeraddress');
    dispatchClickEvent(button);
    const event = await eventPromise;
    assert.deepEqual(event.data, 1);
  });

  it('renders a disabled jump-to-address button if address is invalid', () => {
    const component = new LinearMemoryInspectorComponents.ValueInterpreterDisplay.ValueInterpreterDisplay();
    const array = [8, 0, 0, 0, 0, 0, 0, 0];
    component.data = {
      buffer: new Uint8Array(array).buffer,
      endianness: LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.Endianness.LITTLE,
      valueTypes: new Set([
        LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.POINTER32,
        LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.POINTER64,
      ]),
      memoryLength: array.length,
    };
    renderElementIntoDOM(component);

    const buttons = getElementsWithinComponent(component, DISPLAY_JUMP_TO_POINTER_BUTTON_SELECTOR, HTMLButtonElement);
    assert.lengthOf(buttons, 2);
    assert.isTrue(buttons[0].disabled);
    assert.isTrue(buttons[1].disabled);
  });

  it('selects text in data-value elements if user selects it', () => {
    // To test the failing case, set .value-type user-select to `none`.
    // This is necessary as we render the component in isolation, so it doesn't
    // inherit this property from its parent.

    const component = new LinearMemoryInspectorComponents.ValueInterpreterDisplay.ValueInterpreterDisplay();
    const array = [1, 132, 172, 71];
    component.data = {
      buffer: new Uint8Array(array).buffer,
      endianness: LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.Endianness.LITTLE,
      valueTypes: new Set([
        LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.INT8,
        LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.INT16,
        LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.FLOAT32,
        LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.POINTER32,
      ]),
      memoryLength: array.length,
    };
    renderElementIntoDOM(component);

    const dataValues = getElementsWithinComponent(component, '.selectable-text', HTMLSpanElement);
    assert.lengthOf(dataValues, 9);

    const expectedValues = [
      'Integer 8-bit',
      '1',
      'Integer 16-bit',
      '33793',
      '-31743',
      'Float 32-bit',
      '88328.01',
      'Pointer 32-bit',
      '0x47AC8401',
    ];

    // Workaround for selecting text (instead of double-clicking it).
    // We can use a range to specify an element. Range can be converted into
    // a selection. We then check if the selected text meets our expectations.

    // Continuous part of a document, independent of any visual representation.
    const range = document.createRange();
    // Represents user's highlighted text.
    const selection = document.getSelection();

    for (let i = 0; i < dataValues.length; ++i) {
      if (selection === null) {
        assert.fail('Selection is null');
      }
      // Set range around the element.
      range.selectNodeContents(dataValues[i]);
      // Remove ranges associated with selection.
      selection?.removeAllRanges();
      // Select element using range.
      selection?.addRange(range);

      const text = window.getSelection()?.toString();
      assert.strictEqual(text, expectedValues[i]);
    }
  });
});
