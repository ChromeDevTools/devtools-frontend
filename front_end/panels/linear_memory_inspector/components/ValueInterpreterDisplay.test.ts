// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  assertScreenshot,
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';
import {setupLocaleHooks} from '../../../testing/LocaleHelpers.js';

import * as LinearMemoryInspectorComponents from './components.js';

export const DISPLAY_JUMP_TO_POINTER_BUTTON_SELECTOR = '[data-jump]';

describe('ValueInterpreterDisplay', () => {
  setupLocaleHooks();
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

  it('renders the value interpreter', async () => {
    const target = document.createElement('div');
    target.style.width = 'var(--sys-size-30)';
    target.style.height = 'var(--sys-size-30)';
    renderElementIntoDOM(target);

    // Include in incorrect pointer value at index 0.
    const array = [0xC8, 0xC9, 0xCA, 0XCB];
    const buffer = new Uint8Array(array).buffer;
    const endianness = LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.Endianness.LITTLE;

    // Render a non-exhaustive list of value types.
    const valueTypes = new Set([
      LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.INT8,
      LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.INT16,
      LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.INT32,
      LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.INT32,
      LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.FLOAT32,
      LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType.POINTER32,
    ]);

    // Render different value type modes.
    const valueTypeModes = new Map([
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
    const memoryLength = array.length;

    LinearMemoryInspectorComponents.ValueInterpreterDisplay.DEFAULT_VIEW(
        {
          buffer,
          endianness,
          valueTypes: Array.from(valueTypes),
          memoryLength,
          valueTypeModes,
          onValueTypeModeChange: () => {},
          onJumpToAddressClicked: () => {},
        },
        undefined, target);
    await assertScreenshot('linear_memory_inspector/value-interpreter.png');
  });
});
