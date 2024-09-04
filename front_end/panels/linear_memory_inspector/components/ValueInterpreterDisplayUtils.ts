// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';

const UIStrings = {
  /**
   *@description Text that is shown in the LinearMemoryInspector if a value could not be correctly formatted
   *             for the requested mode (e.g. we do not floats to be represented as hexadecimal numbers).
   *             Abbreviation stands for 'not applicable'.
   */
  notApplicable: 'N/A',
};
const str_ = i18n.i18n.registerUIStrings('panels/linear_memory_inspector/components/ValueInterpreterDisplayUtils.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export const VALUE_INTEPRETER_MAX_NUM_BYTES = 8;

export const enum ValueType {
  INT8 = 'Integer 8-bit',
  INT16 = 'Integer 16-bit',
  INT32 = 'Integer 32-bit',
  INT64 = 'Integer 64-bit',
  FLOAT32 = 'Float 32-bit',
  FLOAT64 = 'Float 64-bit',
  POINTER32 = 'Pointer 32-bit',
  POINTER64 = 'Pointer 64-bit',
}

export const enum Endianness {
  LITTLE = 'Little Endian',
  BIG = 'Big Endian',
}

export const enum ValueTypeMode {
  DECIMAL = 'dec',
  HEXADECIMAL = 'hex',
  OCTAL = 'oct',
  SCIENTIFIC = 'sci',
}

export function getDefaultValueTypeMapping(): Map<ValueType, ValueTypeMode> {
  return new Map(DEFAULT_MODE_MAPPING);
}

const DEFAULT_MODE_MAPPING = new Map([
  [ValueType.INT8, ValueTypeMode.DECIMAL],
  [ValueType.INT16, ValueTypeMode.DECIMAL],
  [ValueType.INT32, ValueTypeMode.DECIMAL],
  [ValueType.INT64, ValueTypeMode.DECIMAL],
  [ValueType.FLOAT32, ValueTypeMode.DECIMAL],
  [ValueType.FLOAT64, ValueTypeMode.DECIMAL],
  [ValueType.POINTER32, ValueTypeMode.HEXADECIMAL],
  [ValueType.POINTER64, ValueTypeMode.HEXADECIMAL],
]);

export const VALUE_TYPE_MODE_LIST = [
  ValueTypeMode.DECIMAL,
  ValueTypeMode.HEXADECIMAL,
  ValueTypeMode.OCTAL,
  ValueTypeMode.SCIENTIFIC,
];

export function valueTypeToLocalizedString(valueType: ValueType): string {
  return i18n.i18n.lockedString(valueType);
}

export function isValidMode(type: ValueType, mode: ValueTypeMode): boolean {
  switch (type) {
    case ValueType.INT8:
    case ValueType.INT16:
    case ValueType.INT32:
    case ValueType.INT64:
      return mode === ValueTypeMode.DECIMAL || mode === ValueTypeMode.HEXADECIMAL || mode === ValueTypeMode.OCTAL;
    case ValueType.FLOAT32:
    case ValueType.FLOAT64:
      return mode === ValueTypeMode.SCIENTIFIC || mode === ValueTypeMode.DECIMAL;
    case ValueType.POINTER32:  // fallthrough
    case ValueType.POINTER64:
      return mode === ValueTypeMode.HEXADECIMAL;
    default:
      return Platform.assertNever(type, `Unknown value type: ${type}`);
  }
}

export function isNumber(type: ValueType): boolean {
  switch (type) {
    case ValueType.INT8:
    case ValueType.INT16:
    case ValueType.INT32:
    case ValueType.INT64:
    case ValueType.FLOAT32:
    case ValueType.FLOAT64:
      return true;
    default:
      return false;
  }
}

export function getPointerAddress(type: ValueType, buffer: ArrayBuffer, endianness: Endianness): number|bigint {
  if (!isPointer(type)) {
    console.error(`Requesting address of a non-pointer type: ${type}.\n`);
    return NaN;
  }
  try {
    const dataView = new DataView(buffer);
    const isLittleEndian = endianness === Endianness.LITTLE;
    return type === ValueType.POINTER32 ? dataView.getUint32(0, isLittleEndian) :
                                          dataView.getBigUint64(0, isLittleEndian);
  } catch (e) {
    return NaN;
  }
}

export function isPointer(type: ValueType): boolean {
  return type === ValueType.POINTER32 || type === ValueType.POINTER64;
}
export interface FormatData {
  buffer: ArrayBuffer;
  type: ValueType;
  endianness: Endianness;
  signed: boolean;
  mode?: ValueTypeMode;
}

export function format(formatData: FormatData): string {
  if (!formatData.mode) {
    console.error(`No known way of showing value for ${formatData.type}`);
    return i18nString(UIStrings.notApplicable);
  }
  const valueView = new DataView(formatData.buffer);
  const isLittleEndian = formatData.endianness === Endianness.LITTLE;
  let value;

  try {
    switch (formatData.type) {
      case ValueType.INT8:
        value = formatData.signed ? valueView.getInt8(0) : valueView.getUint8(0);
        return formatInteger(value, formatData.mode);
      case ValueType.INT16:
        value = formatData.signed ? valueView.getInt16(0, isLittleEndian) : valueView.getUint16(0, isLittleEndian);
        return formatInteger(value, formatData.mode);
      case ValueType.INT32:
        value = formatData.signed ? valueView.getInt32(0, isLittleEndian) : valueView.getUint32(0, isLittleEndian);
        return formatInteger(value, formatData.mode);
      case ValueType.INT64:
        value =
            formatData.signed ? valueView.getBigInt64(0, isLittleEndian) : valueView.getBigUint64(0, isLittleEndian);
        return formatInteger(value, formatData.mode);
      case ValueType.FLOAT32:
        value = valueView.getFloat32(0, isLittleEndian);
        return formatFloat(value, formatData.mode);
      case ValueType.FLOAT64:
        value = valueView.getFloat64(0, isLittleEndian);
        return formatFloat(value, formatData.mode);
      case ValueType.POINTER32:
        value = valueView.getUint32(0, isLittleEndian);
        return formatInteger(value, ValueTypeMode.HEXADECIMAL);
      case ValueType.POINTER64:
        value = valueView.getBigUint64(0, isLittleEndian);
        return formatInteger(value, ValueTypeMode.HEXADECIMAL);
      default:
        return Platform.assertNever(formatData.type, `Unknown value type: ${formatData.type}`);
    }
  } catch (e) {
    return i18nString(UIStrings.notApplicable);
  }
}

export function formatFloat(value: number, mode: ValueTypeMode): string {
  switch (mode) {
    case ValueTypeMode.DECIMAL:
      return value.toFixed(2).toString();
    case ValueTypeMode.SCIENTIFIC:
      return value.toExponential(2).toString();
    default:
      throw new Error(`Unknown mode for floats: ${mode}.`);
  }
}

export function formatInteger(value: number|bigint, mode: ValueTypeMode): string {
  switch (mode) {
    case ValueTypeMode.DECIMAL:
      return value.toString();
    case ValueTypeMode.HEXADECIMAL:
      if (value < 0) {
        return i18nString(UIStrings.notApplicable);
      }
      return '0x' + value.toString(16).toUpperCase();
    case ValueTypeMode.OCTAL:
      if (value < 0) {
        return i18nString(UIStrings.notApplicable);
      }
      return value.toString(8);
    default:
      throw new Error(`Unknown mode for integers: ${mode}.`);
  }
}
