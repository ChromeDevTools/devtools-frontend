// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as LinearMemoryInspector from '../../../../front_end/linear_memory_inspector/linear_memory_inspector.js';
import {getElementsWithinComponent, renderElementIntoDOM} from '../helpers/DOMHelpers.js';

const {assert} = chai;

describe('ValueInterpreterDisplay', () => {
  const combinationsForNumbers = [
    {endianness: LinearMemoryInspector.ValueInterpreterDisplayUtils.Endianness.Little, signed: true},
    {endianness: LinearMemoryInspector.ValueInterpreterDisplayUtils.Endianness.Little, signed: false},
    {endianness: LinearMemoryInspector.ValueInterpreterDisplayUtils.Endianness.Big, signed: false},
    {endianness: LinearMemoryInspector.ValueInterpreterDisplayUtils.Endianness.Big, signed: true},
  ];

  function testNumberFormatCombinations(
      baseData: {
        buffer: ArrayBuffer,
        type: LinearMemoryInspector.ValueInterpreterDisplayUtils.ValueType,
        mode: LinearMemoryInspector.ValueInterpreterDisplayUtils.ValueTypeMode
      },
      combinations:
          Array<{endianness: LinearMemoryInspector.ValueInterpreterDisplayUtils.Endianness, signed: boolean}>) {
    const expectedIntValue = 20;
    const expectedFloatValue = -234.03;
    for (let i = 0; i < combinations.length; ++i) {
      const {endianness, signed} = combinations[i];
      let expectedValue;
      const isLittleEndian = endianness === LinearMemoryInspector.ValueInterpreterDisplayUtils.Endianness.Little;
      const view = new DataView(baseData.buffer);
      switch (baseData.type) {
        case LinearMemoryInspector.ValueInterpreterDisplayUtils.ValueType.Int8:
          expectedValue = signed ? -expectedIntValue : expectedIntValue;
          signed ? view.setInt8(0, expectedValue) : view.setInt8(0, expectedValue);
          break;
        case LinearMemoryInspector.ValueInterpreterDisplayUtils.ValueType.Int16:
          expectedValue = signed ? -expectedIntValue : expectedIntValue;
          signed ? view.setInt16(0, expectedValue, isLittleEndian) : view.setUint16(0, expectedValue, isLittleEndian);
          break;
        case LinearMemoryInspector.ValueInterpreterDisplayUtils.ValueType.Int32:
          expectedValue = signed ? -expectedIntValue : expectedIntValue;
          signed ? view.setInt32(0, expectedValue, isLittleEndian) : view.setUint32(0, expectedValue, isLittleEndian);
          break;
        case LinearMemoryInspector.ValueInterpreterDisplayUtils.ValueType.Int64:
          expectedValue = signed ? -expectedIntValue : expectedIntValue;
          signed ? view.setBigInt64(0, BigInt(expectedValue), isLittleEndian) :
                   view.setBigUint64(0, BigInt(expectedValue), isLittleEndian);
          break;
        case LinearMemoryInspector.ValueInterpreterDisplayUtils.ValueType.Float32:
          expectedValue = expectedFloatValue;
          view.setFloat32(0, expectedValue, isLittleEndian);
          break;
        case LinearMemoryInspector.ValueInterpreterDisplayUtils.ValueType.Float64:
          expectedValue = expectedFloatValue;
          view.setFloat64(0, expectedValue, isLittleEndian);
          break;
        default:
          throw new Error(`Unknown type ${baseData.type}`);
      }
      const actualValue = LinearMemoryInspector.ValueInterpreterDisplayUtils.format({...baseData, ...combinations[i]});
      assert.strictEqual(actualValue, expectedValue.toString());
    }
  }

  it('correctly LinearMemoryInspector.ValueInterpreterDisplayUtils.formats signed/unsigned and endianness for Integer 8-bit (decimal)',
     async () => {
       const formatData = {
         buffer: new ArrayBuffer(1),
         type: LinearMemoryInspector.ValueInterpreterDisplayUtils.ValueType.Int8,
         mode: LinearMemoryInspector.ValueInterpreterDisplayUtils.ValueTypeMode.Decimal,
       };
       testNumberFormatCombinations(formatData, combinationsForNumbers);
     });

  it('correctly LinearMemoryInspector.ValueInterpreterDisplayUtils.formats signed/unsigned and endianness for Integer 16-bit (decimal)',
     async () => {
       const formatData = {
         buffer: new ArrayBuffer(2),
         type: LinearMemoryInspector.ValueInterpreterDisplayUtils.ValueType.Int16,
         mode: LinearMemoryInspector.ValueInterpreterDisplayUtils.ValueTypeMode.Decimal,
       };

       testNumberFormatCombinations(formatData, combinationsForNumbers);
     });

  it('correctly LinearMemoryInspector.ValueInterpreterDisplayUtils.formats signed/unsigned and endianness for Integer 32-bit (decimal)',
     async () => {
       const formatData = {
         buffer: new ArrayBuffer(4),
         type: LinearMemoryInspector.ValueInterpreterDisplayUtils.ValueType.Int32,
         mode: LinearMemoryInspector.ValueInterpreterDisplayUtils.ValueTypeMode.Decimal,
       };

       testNumberFormatCombinations(formatData, combinationsForNumbers);
     });

  it('correctly LinearMemoryInspector.ValueInterpreterDisplayUtils.formats signed/unsigned and endianness for Integer 64-bit (decimal)',
     async () => {
       const formatData = {
         buffer: new ArrayBuffer(8),
         type: LinearMemoryInspector.ValueInterpreterDisplayUtils.ValueType.Int64,
         mode: LinearMemoryInspector.ValueInterpreterDisplayUtils.ValueTypeMode.Decimal,
       };

       testNumberFormatCombinations(formatData, combinationsForNumbers);
     });

  it('correctly LinearMemoryInspector.ValueInterpreterDisplayUtils.formats endianness for Float 32-bit (decimal)',
     async () => {
       const formatData = {
         buffer: new ArrayBuffer(4),
         type: LinearMemoryInspector.ValueInterpreterDisplayUtils.ValueType.Float32,
         mode: LinearMemoryInspector.ValueInterpreterDisplayUtils.ValueTypeMode.Decimal,
       };

       testNumberFormatCombinations(formatData, combinationsForNumbers);
     });

  it('correctly LinearMemoryInspector.ValueInterpreterDisplayUtils.formats endianness for Float 64-bit (decimal)',
     async () => {
       const formatData = {
         buffer: new ArrayBuffer(8),
         type: LinearMemoryInspector.ValueInterpreterDisplayUtils.ValueType.Float64,
         mode: LinearMemoryInspector.ValueInterpreterDisplayUtils.ValueTypeMode.Decimal,
       };

       testNumberFormatCombinations(formatData, combinationsForNumbers);
     });

  it('correctly LinearMemoryInspector.ValueInterpreterDisplayUtils.formats floats in decimal mode', async () => {
    const expectedFloat = 341.34;
    const actualValue = LinearMemoryInspector.ValueInterpreterDisplayUtils.formatFloat(
        expectedFloat, LinearMemoryInspector.ValueInterpreterDisplayUtils.ValueTypeMode.Decimal);
    assert.strictEqual(actualValue, '341.34');
  });

  it('correctly LinearMemoryInspector.ValueInterpreterDisplayUtils.formats floats in scientific mode', async () => {
    const expectedFloat = 341.34;
    const actualValue = LinearMemoryInspector.ValueInterpreterDisplayUtils.formatFloat(
        expectedFloat, LinearMemoryInspector.ValueInterpreterDisplayUtils.ValueTypeMode.Scientific);
    assert.strictEqual(actualValue, '3.41e+2');
  });

  it('correctly LinearMemoryInspector.ValueInterpreterDisplayUtils.formats integers in decimal mode', async () => {
    const expectedInteger = 120;
    const actualValue = LinearMemoryInspector.ValueInterpreterDisplayUtils.formatInteger(
        expectedInteger, LinearMemoryInspector.ValueInterpreterDisplayUtils.ValueTypeMode.Decimal);
    assert.strictEqual(actualValue, '120');
  });

  it('correctly LinearMemoryInspector.ValueInterpreterDisplayUtils.formats integers in hexadecimal mode', async () => {
    const expectedInteger = 16;
    const actualValue = LinearMemoryInspector.ValueInterpreterDisplayUtils.formatInteger(
        expectedInteger, LinearMemoryInspector.ValueInterpreterDisplayUtils.ValueTypeMode.Hexadecimal);
    assert.strictEqual(actualValue, '10');
  });

  it('correctly LinearMemoryInspector.ValueInterpreterDisplayUtils.formats integers in octal mode', async () => {
    const expectedInteger = 16;
    const actualValue = LinearMemoryInspector.ValueInterpreterDisplayUtils.formatInteger(
        expectedInteger, LinearMemoryInspector.ValueInterpreterDisplayUtils.ValueTypeMode.Octal);
    assert.strictEqual(actualValue, '20');
  });

  it('correctly LinearMemoryInspector.ValueInterpreterDisplayUtils.formats integers in octal mode', async () => {
    const expectedInteger = 16;
    const actualValue = LinearMemoryInspector.ValueInterpreterDisplayUtils.formatInteger(
        expectedInteger, LinearMemoryInspector.ValueInterpreterDisplayUtils.ValueTypeMode.Octal);
    assert.strictEqual(actualValue, '20');
  });

  it('correctly LinearMemoryInspector.ValueInterpreterDisplayUtils.formats boolean', async () => {
    let booleanValue = 3;
    let actualValue = LinearMemoryInspector.ValueInterpreterDisplayUtils.formatBoolean(booleanValue);
    assert.strictEqual(actualValue, 'true');

    booleanValue = 0;
    actualValue = LinearMemoryInspector.ValueInterpreterDisplayUtils.formatBoolean(booleanValue);
    assert.strictEqual(actualValue, 'false');
  });

  it('renders value in selected LinearMemoryInspector.ValueInterpreterDisplayUtils.ValueTypes', async () => {
    const component = new LinearMemoryInspector.ValueInterpreterDisplay.ValueInterpreterDisplay();
    const array = [1, 132, 172, 71];
    component.data = {
      buffer: new Uint8Array(array).buffer,
      endianness: LinearMemoryInspector.ValueInterpreterDisplayUtils.Endianness.Little,
      valueTypes: new Set([
        LinearMemoryInspector.ValueInterpreterDisplayUtils.ValueType.Int16,
        LinearMemoryInspector.ValueInterpreterDisplayUtils.ValueType.Float32,
        LinearMemoryInspector.ValueInterpreterDisplayUtils.ValueType.Boolean,
      ]),
    };
    renderElementIntoDOM(component);

    const dataValues = getElementsWithinComponent(component, '[data-value]', HTMLSpanElement);
    assert.lengthOf(dataValues, 4);

    const actualValues = Array.from(dataValues).map(x => x.innerText);
    const expectedValues = ['+ 33793', '± -31743', '88328.01', 'true'];
    assert.deepStrictEqual(actualValues, expectedValues);
  });
});
