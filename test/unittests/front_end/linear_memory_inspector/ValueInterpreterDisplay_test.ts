// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as LinearMemoryInspector from '../../../../front_end/linear_memory_inspector/linear_memory_inspector.js';

import {Endianness, format, formatBoolean, formatFloat, formatInteger, ValueType, ValueTypeMode} from '../../../../front_end/linear_memory_inspector/ValueInterpreterDisplayUtils.js';
import {getElementsWithinComponent, renderElementIntoDOM} from '../helpers/DOMHelpers.js';

const {assert} = chai;

describe('ValueInterpreterDisplay', () => {
  const combinationsForNumbers = [
    {endianness: Endianness.Little, signed: true},
    {endianness: Endianness.Little, signed: false},
    {endianness: Endianness.Big, signed: false},
    {endianness: Endianness.Big, signed: true},
  ];

  function testNumberFormatCombinations(
      baseData: {buffer: ArrayBuffer, type: ValueType, mode: ValueTypeMode},
      combinations: Array<{endianness: Endianness, signed: boolean}>) {
    const expectedIntValue = 20;
    const expectedFloatValue = -234.03;
    for (let i = 0; i < combinations.length; ++i) {
      const {endianness, signed} = combinations[i];
      let expectedValue;
      const isLittleEndian = endianness === Endianness.Little;
      const view = new DataView(baseData.buffer);
      switch (baseData.type) {
        case ValueType.Int8:
          expectedValue = signed ? -expectedIntValue : expectedIntValue;
          signed ? view.setInt8(0, expectedValue) : view.setInt8(0, expectedValue);
          break;
        case ValueType.Int16:
          expectedValue = signed ? -expectedIntValue : expectedIntValue;
          signed ? view.setInt16(0, expectedValue, isLittleEndian) : view.setUint16(0, expectedValue, isLittleEndian);
          break;
        case ValueType.Int32:
          expectedValue = signed ? -expectedIntValue : expectedIntValue;
          signed ? view.setInt32(0, expectedValue, isLittleEndian) : view.setUint32(0, expectedValue, isLittleEndian);
          break;
        case ValueType.Int64:
          expectedValue = signed ? -expectedIntValue : expectedIntValue;
          signed ? view.setBigInt64(0, BigInt(expectedValue), isLittleEndian) :
                   view.setBigUint64(0, BigInt(expectedValue), isLittleEndian);
          break;
        case ValueType.Float32:
          expectedValue = expectedFloatValue;
          view.setFloat32(0, expectedValue, isLittleEndian);
          break;
        case ValueType.Float64:
          expectedValue = expectedFloatValue;
          view.setFloat64(0, expectedValue, isLittleEndian);
          break;
        default:
          throw new Error(`Unknown type ${baseData.type}`);
      }
      const actualValue = format({...baseData, ...combinations[i]});
      assert.strictEqual(actualValue, expectedValue.toString());
    }
  }

  it('correctly formats signed/unsigned and endianness for Integer 8-bit (decimal)', async () => {
    const formatData = {
      buffer: new ArrayBuffer(1),
      type: ValueType.Int8,
      mode: ValueTypeMode.Decimal,
    };
    testNumberFormatCombinations(formatData, combinationsForNumbers);
  });

  it('correctly formats signed/unsigned and endianness for Integer 16-bit (decimal)', async () => {
    const formatData = {
      buffer: new ArrayBuffer(2),
      type: ValueType.Int16,
      mode: ValueTypeMode.Decimal,
    };

    testNumberFormatCombinations(formatData, combinationsForNumbers);
  });

  it('correctly formats signed/unsigned and endianness for Integer 32-bit (decimal)', async () => {
    const formatData = {
      buffer: new ArrayBuffer(4),
      type: ValueType.Int32,
      mode: ValueTypeMode.Decimal,
    };

    testNumberFormatCombinations(formatData, combinationsForNumbers);
  });

  it('correctly formats signed/unsigned and endianness for Integer 64-bit (decimal)', async () => {
    const formatData = {
      buffer: new ArrayBuffer(8),
      type: ValueType.Int64,
      mode: ValueTypeMode.Decimal,
    };

    testNumberFormatCombinations(formatData, combinationsForNumbers);
  });

  it('correctly formats endianness for Float 32-bit (decimal)', async () => {
    const formatData = {
      buffer: new ArrayBuffer(4),
      type: ValueType.Float32,
      mode: ValueTypeMode.Decimal,
    };

    testNumberFormatCombinations(formatData, combinationsForNumbers);
  });

  it('correctly formats endianness for Float 64-bit (decimal)', async () => {
    const formatData = {
      buffer: new ArrayBuffer(8),
      type: ValueType.Float64,
      mode: ValueTypeMode.Decimal,
    };

    testNumberFormatCombinations(formatData, combinationsForNumbers);
  });

  it('correctly formats floats in decimal mode', async () => {
    const expectedFloat = 341.34;
    const actualValue = formatFloat(expectedFloat, ValueTypeMode.Decimal);
    assert.strictEqual(actualValue, '341.34');
  });

  it('correctly formats floats in scientific mode', async () => {
    const expectedFloat = 341.34;
    const actualValue = formatFloat(expectedFloat, ValueTypeMode.Scientific);
    assert.strictEqual(actualValue, '3.41e+2');
  });

  it('correctly formats integers in decimal mode', async () => {
    const expectedInteger = 120;
    const actualValue = formatInteger(expectedInteger, ValueTypeMode.Decimal);
    assert.strictEqual(actualValue, '120');
  });

  it('correctly formats integers in hexadecimal mode', async () => {
    const expectedInteger = 16;
    const actualValue = formatInteger(expectedInteger, ValueTypeMode.Hexadecimal);
    assert.strictEqual(actualValue, '10');
  });

  it('correctly formats integers in octal mode', async () => {
    const expectedInteger = 16;
    const actualValue = formatInteger(expectedInteger, ValueTypeMode.Octal);
    assert.strictEqual(actualValue, '20');
  });

  it('correctly formats integers in octal mode', async () => {
    const expectedInteger = 16;
    const actualValue = formatInteger(expectedInteger, ValueTypeMode.Octal);
    assert.strictEqual(actualValue, '20');
  });

  it('correctly formats boolean', async () => {
    let booleanValue = 3;
    let actualValue = formatBoolean(booleanValue);
    assert.strictEqual(actualValue, 'true');

    booleanValue = 0;
    actualValue = formatBoolean(booleanValue);
    assert.strictEqual(actualValue, 'false');
  });

  it('renders value in selected ValueTypes', async () => {
    const component = new LinearMemoryInspector.ValueInterpreterDisplay.ValueInterpreterDisplay();
    const array = [1, 132, 172, 71];
    component.data = {
      buffer: new Uint8Array(array).buffer,
      endianness: Endianness.Little,
      valueTypes: new Set([ValueType.Int16, ValueType.Float32, ValueType.Boolean]),
    };
    renderElementIntoDOM(component);

    const dataValues = getElementsWithinComponent(component, '[data-value]', HTMLSpanElement);
    assert.lengthOf(dataValues, 4);

    const actualValues = Array.from(dataValues).map(x => x.innerText);
    const expectedValues = ['+ 33793', '± -31743', '88328.01', 'true'];
    assert.deepStrictEqual(actualValues, expectedValues);
  });
});
