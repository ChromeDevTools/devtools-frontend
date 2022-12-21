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
const str_ =
    i18n.i18n.registerUIStrings('ui/components/linear_memory_inspector/ValueInterpreterDisplayUtils.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export const VALUE_INTEPRETER_MAX_NUM_BYTES = 8;

export const enum ValueType {
  Int8 = 'Integer 8-bit',
  Int16 = 'Integer 16-bit',
  Int32 = 'Integer 32-bit',
  Int64 = 'Integer 64-bit',
  Float32 = 'Float 32-bit',
  Float64 = 'Float 64-bit',
  Pointer32 = 'Pointer 32-bit',
  Pointer64 = 'Pointer 64-bit',
}

export const enum Endianness {
  Little = 'Little Endian',
  Big = 'Big Endian',
}

export const enum ValueTypeMode {
  Decimal = 'dec',
  Hexadecimal = 'hex',
  Octal = 'oct',
  Scientific = 'sci',
}

export function getDefaultValueTypeMapping(): Map<ValueType, ValueTypeMode> {
  return new Map(DEFAULT_MODE_MAPPING);
}

const DEFAULT_MODE_MAPPING = new Map([
  [ValueType.Int8, ValueTypeMode.Decimal],
  [ValueType.Int16, ValueTypeMode.Decimal],
  [ValueType.Int32, ValueTypeMode.Decimal],
  [ValueType.Int64, ValueTypeMode.Decimal],
  [ValueType.Float32, ValueTypeMode.Decimal],
  [ValueType.Float64, ValueTypeMode.Decimal],
  [ValueType.Pointer32, ValueTypeMode.Hexadecimal],
  [ValueType.Pointer64, ValueTypeMode.Hexadecimal],
]);

export const VALUE_TYPE_MODE_LIST = [
  ValueTypeMode.Decimal,
  ValueTypeMode.Hexadecimal,
  ValueTypeMode.Octal,
  ValueTypeMode.Scientific,
];

export function valueTypeToLocalizedString(valueType: ValueType): string {
  return i18n.i18n.lockedString(valueType);
}

export function isValidMode(type: ValueType, mode: ValueTypeMode): boolean {
  switch (type) {
    case ValueType.Int8:
    case ValueType.Int16:
    case ValueType.Int32:
    case ValueType.Int64:
      return mode === ValueTypeMode.Decimal || mode === ValueTypeMode.Hexadecimal || mode === ValueTypeMode.Octal;
    case ValueType.Float32:
    case ValueType.Float64:
      return mode === ValueTypeMode.Scientific || mode === ValueTypeMode.Decimal;
    case ValueType.Pointer32:  // fallthrough
    case ValueType.Pointer64:
      return mode === ValueTypeMode.Hexadecimal;
    default:
      return Platform.assertNever(type, `Unknown value type: ${type}`);
  }
}

export function isNumber(type: ValueType): boolean {
  switch (type) {
    case ValueType.Int8:
    case ValueType.Int16:
    case ValueType.Int32:
    case ValueType.Int64:
    case ValueType.Float32:
    case ValueType.Float64:
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
    const isLittleEndian = endianness === Endianness.Little;
    return type === ValueType.Pointer32 ? dataView.getUint32(0, isLittleEndian) :
                                          dataView.getBigUint64(0, isLittleEndian);
  } catch (e) {
    return NaN;
  }
}

export function isPointer(type: ValueType): boolean {
  return type === ValueType.Pointer32 || type === ValueType.Pointer64;
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
  const isLittleEndian = formatData.endianness === Endianness.Little;
  let value;

  try {
    switch (formatData.type) {
      case ValueType.Int8:
        value = formatData.signed ? valueView.getInt8(0) : valueView.getUint8(0);
        return formatInteger(value, formatData.mode);
      case ValueType.Int16:
        value = formatData.signed ? valueView.getInt16(0, isLittleEndian) : valueView.getUint16(0, isLittleEndian);
        return formatInteger(value, formatData.mode);
      case ValueType.Int32:
        value = formatData.signed ? valueView.getInt32(0, isLittleEndian) : valueView.getUint32(0, isLittleEndian);
        return formatInteger(value, formatData.mode);
      case ValueType.Int64:
        value =
            formatData.signed ? valueView.getBigInt64(0, isLittleEndian) : valueView.getBigUint64(0, isLittleEndian);
        return formatInteger(value, formatData.mode);
      case ValueType.Float32:
        value = valueView.getFloat32(0, isLittleEndian);
        return formatFloat(value, formatData.mode);
      case ValueType.Float64:
        value = valueView.getFloat64(0, isLittleEndian);
        return formatFloat(value, formatData.mode);
      case ValueType.Pointer32:
        value = valueView.getUint32(0, isLittleEndian);
        return formatInteger(value, ValueTypeMode.Hexadecimal);
      case ValueType.Pointer64:
        value = valueView.getBigUint64(0, isLittleEndian);
        return formatInteger(value, ValueTypeMode.Hexadecimal);
      default:
        return Platform.assertNever(formatData.type, `Unknown value type: ${formatData.type}`);
    }
  } catch (e) {
    return i18nString(UIStrings.notApplicable);
  }
}

export function formatFloat(value: number, mode: ValueTypeMode): string {
  switch (mode) {
    case ValueTypeMode.Decimal:
      return value.toFixed(2).toString();
    case ValueTypeMode.Scientific:
      return value.toExponential(2).toString();
    default:
      throw new Error(`Unknown mode for floats: ${mode}.`);
  }
}

export function formatInteger(value: number|bigint, mode: ValueTypeMode): string {
  switch (mode) {
    case ValueTypeMode.Decimal:
      return value.toString();
    case ValueTypeMode.Hexadecimal:
      if (value < 0) {
        return i18nString(UIStrings.notApplicable);
      }
      return '0x' + value.toString(16).toUpperCase();
    case ValueTypeMode.Octal:
      if (value < 0) {
        return i18nString(UIStrings.notApplicable);
      }
      return value.toString(8);
    default:
      throw new Error(`Unknown mode for integers: ${mode}.`);
  }
}
